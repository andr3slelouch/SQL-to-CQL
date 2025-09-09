import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

// --- Configuration ---
const AUTH_SERVICE_URL = 'http://localhost:3001/api';
const TRANSLATE_SERVICE_URL = 'http://localhost:3000/api';

// --- Test User Credentials ---
// IMPORTANT: Replace 'YOUR_PASSWORD_HERE' with the correct password.
const TEST_USER = {
    cedula: '123456789',
    nombre: 'Test User', // The API requires this field
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

    group('Successful Authentication', () => {
        const loginPayload = JSON.stringify(TEST_USER);
        const params = { headers: { 'Content-Type': 'application/json' } };
        const res = http.post(`${AUTH_SERVICE_URL}/auth/login`, loginPayload, params);
        
        loginDuration.add(res.timings.duration);
        
        // Corrected variable name from loginSuccess to loginCheck
        const loginCheck = check(res, {
            // Corrected status check from 201 to 200
            'Login successful (status 200)': (r) => r.status === 200,
            // Corrected token key from access_token to accessToken
            'Response contains accessToken': (r) => r.json('accessToken') !== undefined,
        });

        if (loginCheck && res.json('accessToken')) {
            accessToken = res.json('accessToken');
        } else {
            console.error(`Login failed: ${res.status} ${res.body}`);
        }
    });

    if (accessToken) {
        group('Authenticated Query', () => {
            const queryPayload = JSON.stringify({
                query: "SELECT * FROM system.local;",
                keyspace: "system"
            });

            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };

            const res = http.post(`${TRANSLATE_SERVICE_URL}/translator/execute`, queryPayload, { headers });
            executeDuration.add(res.timings.duration);

            check(res, {
                'Execute request successful (status 200)': (r) => r.status === 200,
            });
        });
    }

    sleep(1);
}

// --- SCENARIO 2: Failed Login Attempts ---
export function failedLogins() {
    group('Failed Authentication', () => {
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

