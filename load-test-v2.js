import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

// --- Configuration ---
const AUTH_SERVICE_URL = 'http://localhost:3001/api';
const TRANSLATE_SERVICE_URL = 'http://localhost:3000/api';

// --- Test User Credentials ---
// IMPORTANT: You must replace 'password' with the correct password for this user.
const TEST_USER = {
    cedula: '123456789',
    nombre: 'Test User', 
    contrasena: 'password' 
};

// --- Dummy User for Failed Login Attempts ---
const DUMMY_USER = {
    cedula: '999999999',
    nombre: 'Invalid User',
    contrasena: 'wrongpassword'
};

// --- Custom Metrics for Performance Analysis ---
const loginDuration = new Trend('login_duration');
const executeDuration = new Trend('execute_duration');
const failedLoginDuration = new Trend('failed_login_duration');

// --- k6 Options ---
export const options = {
    scenarios: {
        successful_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '1m', target: 10 },
                { duration: '30s', target: 0 },
            ],
            exec: 'successfulFlow',
            gracefulRampDown: '10s',
        },
        failed_logins: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '15s', target: 5 },
                { duration: '1m', target: 5 },
                { duration: '15s', target: 0 },
            ],
            exec: 'failedLogins',
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        'http_req_failed': ['rate<0.01'],
        'checks{scenario:successful_flow}': ['rate>0.95'],
        'checks{scenario:failed_logins}': ['rate>0.95'],
        'login_duration': ['p(95)<500'],
        'execute_duration': ['p(95)<1000'],
    },
};

// --- SCENARIO 1: Successful User Flow ---
export function successfulFlow() {
    let accessToken;

    group('1. Successful Authentication', () => {
        const loginPayload = JSON.stringify(TEST_USER);
        const params = { headers: { 'Content-Type': 'application/json' } };
        const res = http.post(`${AUTH_SERVICE_URL}/auth/login`, loginPayload, params);
        
        loginDuration.add(res.timings.duration);
        
        const loginCheck = check(res, {
            'Login successful (status 200)': (r) => r.status === 200,
            'Response contains accessToken': (r) => r.json('accessToken') !== undefined,
        });

        if (loginCheck && res.json('accessToken')) {
            accessToken = res.json('accessToken');
        } else {
            console.error(`Login failed with status ${res.status}: ${res.body}`);
        }
    });

    if (accessToken) {
        group('2. Authenticated Query Execution', () => {
            // CORRECTED: The API expects the field to be 'sql', not 'query'.
            const queryPayload = JSON.stringify({
                sql: "SELECT * FROM system.local;", // This was the field causing the error.
                keyspace: "system"
            });

            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };

            const res = http.post(`${TRANSLATE_SERVICE_URL}/translator/execute`, queryPayload, { headers });
            executeDuration.add(res.timings.duration);

            const executeCheck = check(res, {
                'Execute request successful (status 200)': (r) => r.status === 200,
            });

            if (!executeCheck) {
                console.error(`Execute request failed with status ${res.status}: ${res.body}`);
            }
        });
    }

    sleep(1);
}

// --- SCENARIO 2: Failed Login Attempts ---
export function failedLogins() {
    group('3. Failed Authentication Simulation', () => {
        const res = http.post(
            `${AUTH_SERVICE_URL}/auth/login`,
            JSON.stringify(DUMMY_USER),
            { headers: { 'Content-Type': 'application/json' } }
        );

        failedLoginDuration.add(res.timings.duration);
        
        check(res, {
            'Failed login rejected (status 401 or 429)': (r) => (r.status === 401 || r.status === 429),
        });
        
        sleep(1);
    });
}

