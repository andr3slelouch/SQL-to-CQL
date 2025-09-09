import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { scenario } from 'k6/execution';

// --- Configuration ---
const AUTH_SERVICE_URL = 'http://localhost:3001/api';
const TRANSLATE_SERVICE_URL = 'http://localhost:3000/api';
const KEYSPACE = 'k6_test_inventory';

// --- User Credentials ---
// This user MUST be pre-registered in the database and have been granted
// CREATE DATABASE, DROP DATABASE, CREATE TABLE, INSERT, and SELECT permissions
// manually in the 'permissions' table for the test to run.
const TEST_USER = {
    cedula: '123456789',
    nombre: 'Test User',
    contrasena: 'password'
};

// --- Custom Metrics for Performance Analysis ---
const insertDuration = new Trend('insert_duration');
const selectDuration = new Trend('select_duration');

// --- k6 Options ---
export const options = {
    scenarios: {
        default: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 20,
            maxDuration: '5m',
        },
    },
    thresholds: {
        'http_req_failed': ['rate<0.01'],
        'checks': ['rate>0.99'],
        'insert_duration': ['p(95)<500'],
        'select_duration': ['p(95)<500'],
    },
};

// --- Helper function to execute a query via the translator service ---
function executeQuery(token, sql, keyspace) {
    const payload = JSON.stringify({ sql, keyspace });
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    return http.post(`${TRANSLATE_SERVICE_URL}/translator/execute`, payload, { headers });
}

// --- SETUP FUNCTION: Runs once before the test starts ---
export function setup() {
    console.log('--- Running Setup ---');

    // 1. Authenticate as the test user
    const loginRes = http.post(`${AUTH_SERVICE_URL}/auth/login`, JSON.stringify(TEST_USER), {
        headers: { 'Content-Type': 'application/json' }
    });
    if (loginRes.status !== 200 || !loginRes.json('accessToken')) {
        throw new Error(`SETUP: Failed to login test user. Ensure user '${TEST_USER.cedula}' exists, credentials are correct, and necessary permissions have been granted manually.`);
    }
    const accessToken = loginRes.json('accessToken');
    console.log('SETUP: Test user authenticated successfully.');

    // 2. Drop the keyspace if it exists to ensure a clean state
    executeQuery(accessToken, `DROP KEYSPACE IF EXISTS ${KEYSPACE}`, "");
    console.log(`SETUP: Dropped keyspace ${KEYSPACE} if it existed.`);
    sleep(2); // Allow time for schema changes to propagate in Cassandra

    // 3. Create the Database (Keyspace)
    const createDbRes = executeQuery(accessToken, `CREATE DATABASE ${KEYSPACE}`, "");
    check(createDbRes, { 'SETUP: Database created successfully': (r) => r.status === 201 });
    if (createDbRes.status !== 201) {
        throw new Error(`SETUP: Failed to create keyspace. Status: ${createDbRes.status}, Body: ${createDbRes.body}`);
    }
    console.log(`SETUP: Database '${KEYSPACE}' created.`);
    sleep(2);

    // 4. Create the test table within the new keyspace
    const createSql = "CREATE TABLE IF NOT EXISTS k6_test_data (id INT PRIMARY KEY, name TEXT, email TEXT);";
    const createRes = executeQuery(accessToken, createSql, KEYSPACE);
    check(createRes, { 'SETUP: Table created successfully': (r) => r.status === 201 });
     if (createRes.status !== 201) {
        // This check is important. Even with IF NOT EXISTS, we need to ensure no other error occurred.
        throw new Error(`SETUP: Failed to create table. Status: ${createRes.status}, Body: ${createRes.body}`);
    }
    console.log(`SETUP: Table 'k6_test_data' created or already exists in keyspace '${KEYSPACE}'.`);

    return { accessToken: accessToken };
}

// --- MAIN VU FUNCTION: The code your virtual users will run ---
export default function (data) {
    group('User Write/Read Operations', () => {
        // Use the k6 scenario.iterationInTest to get a unique ID for each iteration across all VUs.
        const uniqueId = scenario.iterationInTest;

        const insertSql = `INSERT INTO k6_test_data (id, name, email) VALUES (${uniqueId}, 'k6-user-${__VU}', 'user-${__VU}-${__ITER}@k6.io');`;
        const insertRes = executeQuery(data.accessToken, insertSql, KEYSPACE);
        insertDuration.add(insertRes.timings.duration);
        check(insertRes, {
            'INSERT successful (status 201)': (r) => r.status === 201,
            'INSERT execution result is success': (r) => r.json('executionResult.success') === true,
        });

        sleep(1); 

        const selectSql = `SELECT * FROM k6_test_data WHERE id = ${uniqueId};`;
        const selectRes = executeQuery(data.accessToken, selectSql, KEYSPACE);
        selectDuration.add(selectRes.timings.duration);
        check(selectRes, {
            'SELECT successful (status 201)': (r) => r.status === 201,
            'SELECT execution result is success': (r) => r.json('executionResult.success') === true,
        });
    });
}

