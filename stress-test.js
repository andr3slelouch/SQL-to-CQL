import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { scenario } from 'k6/execution';

// --- Configuration ---
const AUTH_SERVICE_URL = 'http://localhost:3001/api';
const TRANSLATE_SERVICE_URL = 'http://localhost:3000/api';
const KEYSPACE = 'k6_stress_test';

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

// --- k6 Options for Stress Test ---
export const options = {
    scenarios: {
        default: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 200 },  // Ramp up to a high load
                { duration: '3m', target: 200 },  // Sustain the load
                { duration: '1m', target: 500 },  // Spike to an extreme load
                { duration: '3m', target: 500 },  // Attempt to sustain the extreme load
                { duration: '2m', target: 0 },    // Recovery phase
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        // This test is designed to find the breaking point, so we set a low failure threshold.
        'http_req_failed': ['rate<0.02'], 
        'checks': ['rate>0.98'],
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
    console.log('--- Running Setup for Stress Test ---');
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
