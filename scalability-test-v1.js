import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { scenario } from 'k6/execution';

// --- Configuration ---
const AUTH_SERVICE_URL = 'http://localhost:3001/api';
const TRANSLATE_SERVICE_URL = 'http://localhost:3000/api';
const KEYSPACE = 'k6_scalability_test';

// --- User Credentials ---
// This user MUST be pre-registered and have the necessary permissions granted manually.
const TEST_USER = {
    cedula: '123456789',
    nombre: 'Test User',
    contrasena: 'password'
};

// --- Custom Metrics ---
const insertDuration = new Trend('insert_duration');
const selectDuration = new Trend('select_duration');

// --- k6 Options for Scalability Test ---
export const options = {
    scenarios: {
        default: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 10 },   // Ramp up to 10 VUs
                { duration: '2m', target: 10 },   // Sustain 10 VUs
                { duration: '1m', target: 50 },   // Ramp up to 50 VUs
                { duration: '2m', target: 50 },   // Sustain 50 VUs
                { duration: '1m', target: 100 },  // Ramp up to 100 VUs
                { duration: '2m', target: 100 },  // Sustain 100 VUs
                { duration: '1m', target: 150 },  // Ramp up to 150 VUs
                { duration: '2m', target: 150 },  // Sustain 150 VUs
                { duration: '1m', target: 200 },  // Ramp up to 200 VUs
                { duration: '2m', target: 200 },  // Sustain 200 VUs
                { duration: '1m', target: 0 },    // Ramp down
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        'http_req_failed': ['rate<0.05'], // Allow up to 5% errors under high load
        'checks': ['rate>0.95'],
    },
};

// --- Helper function ---
function executeQuery(token, sql, keyspace) {
    const payload = JSON.stringify({ sql, keyspace });
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    return http.post(`${TRANSLATE_SERVICE_URL}/translator/execute`, payload, { headers });
}

// --- Setup: Runs once ---
export function setup() {
    console.log('--- Running Setup for Scalability Test ---');
    const loginRes = http.post(`${AUTH_SERVICE_URL}/auth/login`, JSON.stringify(TEST_USER), {
        headers: { 'Content-Type': 'application/json' }
    });
    if (loginRes.status !== 200 || !loginRes.json('accessToken')) {
        throw new Error(`SETUP: Failed to login test user.`);
    }
    const accessToken = loginRes.json('accessToken');
    console.log('SETUP: Test user authenticated successfully.');

    executeQuery(accessToken, `DROP KEYSPACE IF EXISTS ${KEYSPACE}`, "");
    sleep(2);
    const createDbRes = executeQuery(accessToken, `CREATE DATABASE ${KEYSPACE}`, "");
    if (createDbRes.status !== 201) {
        throw new Error(`SETUP: Failed to create keyspace.`);
    }
    sleep(2);
    const createSql = "CREATE TABLE IF NOT EXISTS k6_test_data (id INT PRIMARY KEY, name TEXT, email TEXT);";
    const createRes = executeQuery(accessToken, createSql, KEYSPACE);
     if (createRes.status !== 201) {
        throw new Error(`SETUP: Failed to create table.`);
    }
    console.log(`SETUP: Keyspace and table created.`);
    return { accessToken: accessToken };
}

// --- Main VU function ---
export default function (data) {
    group('User Write/Read Operations', () => {
        const uniqueId = scenario.iterationInTest;

        const insertSql = `INSERT INTO k6_test_data (id, name, email) VALUES (${uniqueId}, 'k6-user-${scenario.vu.idInTest}', 'user-${scenario.vu.idInTest}-${scenario.iterationInInstance}@k6.io');`;
        const insertRes = executeQuery(data.accessToken, insertSql, KEYSPACE);
        insertDuration.add(insertRes.timings.duration);
        check(insertRes, {
            'INSERT successful': (r) => r.status === 201 && r.json('executionResult.success') === true,
        });

        sleep(1); 

        const selectSql = `SELECT * FROM k6_test_data WHERE id = ${uniqueId};`;
        const selectRes = executeQuery(data.accessToken, selectSql, KEYSPACE);
        selectDuration.add(selectRes.timings.duration);
        check(selectRes, {
            'SELECT successful': (r) => r.status === 201 && r.json('executionResult.success') === true,
        });
    });
}
