import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

// --- Configuration ---
const AUTH_SERVICE_URL = 'http://localhost:3001/api';
const TRANSLATE_SERVICE_URL = 'http://localhost:3000/api';
const PERMISSION_SERVICE_URL = 'http://localhost:3002/api';
const KEYSPACE = 'sql_translator';

// --- Test User Credentials ---
// IMPORTANT: You must replace 'password' with the correct password for the admin user.
const ADMIN_USER = {
    cedula: '123456789',
    nombre: 'Test User',
    contrasena: 'password'
};

// --- Custom Metrics for Performance Analysis ---
const insertDuration = new Trend('insert_duration');
const selectDuration = new Trend('select_duration');

// --- k6 Options ---
export const options = {
    vus: 10,
    duration: '2m',
    thresholds: {
        'http_req_failed': ['rate<0.01'],
        'checks': ['rate>0.99'],
        'insert_duration': ['p(95)<500'],
        'select_duration': ['p(95)<500'],
    },
};

// --- Helper function to execute a query via the translator service ---
function executeQuery(token, sql) {
    const payload = JSON.stringify({ sql, keyspace: KEYSPACE });
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    return http.post(`${TRANSLATE_SERVICE_URL}/translator/execute`, payload, { headers });
}

// --- SETUP FUNCTION: Runs once before the test starts ---
export function setup() {
    console.log('--- Running Setup ---');
    
    // 1. Authenticate as Admin to get a token
    const loginRes = http.post(`${AUTH_SERVICE_URL}/auth/login`, JSON.stringify(ADMIN_USER), {
        headers: { 'Content-Type': 'application/json' }
    });
    if (loginRes.status !== 200 || !loginRes.json('accessToken')) {
        throw new Error(`SETUP: Failed to login admin user. Status: ${loginRes.status}, Body: ${loginRes.body}`);
    }
    const accessToken = loginRes.json('accessToken');
    console.log('SETUP: Admin user authenticated successfully.');

    const adminHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    // 2. Grant Keyspace Access to the admin user
    const keyspacePayload = JSON.stringify({
        cedula: ADMIN_USER.cedula,
        selectedKeyspaces: [KEYSPACE]
    });
    const keyspaceRes = http.post(`${PERMISSION_SERVICE_URL}/admin/keyspaces/update-user-keyspaces`, keyspacePayload, { headers: adminHeaders });
    if (keyspaceRes.status !== 201) {
         throw new Error(`SETUP: Failed to assign keyspace. Status: ${keyspaceRes.status}, Body: ${keyspaceRes.body}`);
    }
    console.log(`SETUP: Assigned keyspace '${KEYSPACE}' to user ${ADMIN_USER.cedula}.`);

    // 3. Grant All Operational Permissions to the admin user
    const permissionsPayload = JSON.stringify({
      cedula: ADMIN_USER.cedula,
      permissions: { "CREATE TABLE": true, "DROP TABLE": true, "SELECT": true, "INSERT": true, "UPDATE": true, "DELETE": true, "ALTER TABLE ADD": true, "ALTER TABLE DROP": true, "ALTER TABLE RENAME": true, "TRUNCATE TABLE": true, "CREATE INDEX": true, "DROP INDEX": true, "DESCRIBE TABLES": true, "DESCRIBE TABLE": true, "USE": true, "CREATE KEYSPACE": true, "DROP KEYSPACE": true, "ALTER KEYSPACE": true }
    });
    const permRes = http.post(`${PERMISSION_SERVICE_URL}/admin/permissions/update-user-permission`, permissionsPayload, { headers: adminHeaders });
     if (permRes.status !== 201) {
         throw new Error(`SETUP: Failed to assign permissions. Status: ${permRes.status}, Body: ${permRes.body}`);
    }
    console.log(`SETUP: Assigned all operational permissions to user ${ADMIN_USER.cedula}.`);

    // 4. Drop the table if it exists to ensure a clean state
    const dropSql = "DROP TABLE IF EXISTS k6_test_data;";
    executeQuery(accessToken, dropSql);
    console.log("SETUP: Dropped existing test table (if any).");

    // 5. Create a new test table
    const createSql = "CREATE TABLE k6_test_data (id UUID PRIMARY KEY, name TEXT, email TEXT);";
    const createRes = executeQuery(accessToken, createSql);
    if (createRes.status !== 201 || createRes.json('executionResult.success') !== true) {
        throw new Error(`SETUP: Failed to create table. Status: ${createRes.status}, Body: ${createRes.body}`);
    }
    console.log("SETUP: Database table 'k6_test_data' created successfully.");

    // Return the access token to be used by the VUs
    return { accessToken: accessToken };
}

// --- TEARDOWN FUNCTION: Runs once after the test finishes ---
export function teardown(data) {
    console.log('--- Running Teardown ---');
    if (data.accessToken) {
        const dropSql = "DROP TABLE IF EXISTS k6_test_data;";
        const res = executeQuery(data.accessToken, dropSql);
        if (res.status === 201 && res.json('executionResult.success') === true) {
            console.log("TEARDOWN: Test table 'k6_test_data' dropped successfully.");
        } else {
            console.error(`TEARDOWN: Failed to drop test table. Status: ${res.status}, Body: ${res.body}`);
        }
    }
}

// --- MAIN VU FUNCTION: The code your virtual users will run ---
export default function (data) {
    group('User Write/Read Operations', () => {
        // 1. Insert a new record into the table
        const insertSql = `INSERT INTO k6_test_data (id, name, email) VALUES (uuid(), 'k6-user-${__VU}', 'user-${__VU}-${__ITER}@k6.io');`;
        const insertRes = executeQuery(data.accessToken, insertSql);
        insertDuration.add(insertRes.timings.duration);
        check(insertRes, {
            'INSERT successful (status 201)': (r) => r.status === 201,
            'INSERT execution result is success': (r) => r.json('executionResult.success') === true,
        });

        sleep(1); 

        // 2. Select a record from the table
        const selectSql = `SELECT * FROM k6_test_data LIMIT 1;`;
        const selectRes = executeQuery(data.accessToken, selectSql);
        selectDuration.add(selectRes.timings.duration);
        check(selectRes, {
            'SELECT successful (status 201)': (r) => r.status === 201,
            'SELECT execution result is success': (r) => r.json('executionResult.success') === true,
        });
    });
}

