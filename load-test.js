
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    failed_logins: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      exec: 'failedLogins',
    },
    successful_flow: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'successfulFlow',
    },
  },
};

const BASE_URL = 'http://localhost:3001/api'; // Assuming auth-service runs on port 3001 with /api prefix

export function failedLogins() {
  const url = `${BASE_URL}/auth/login`;
  const payload = JSON.stringify({
    nombre: 'Test User',
    cedula: '999999999',
    contrasena: 'wrong-password',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'failed login status is 401 or 429': (r) => r.status === 401 || r.status === 429,
  });

  sleep(1);
}

export function successfulFlow() {
  // Step 1: Login to get a token
  let loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      nombre: 'Test User', // You may need to adjust this to a real user in your DB
      cedula: '123456789', // You may need to adjust this to a real user in your DB
      contrasena: 'password', // You may need to adjust this to a real user in your DB
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => r.json('accessToken') !== '',
  });

  const accessToken = loginRes.json('accessToken');

  if (accessToken) {
    // Step 2: Use the token to access a protected route
    const translateUrl = 'http://localhost:3002/translator/execute'; // Assuming translate-service runs on port 3002
    const translatePayload = JSON.stringify({
      sql: 'SELECT * FROM system.local',
    });

    const translateParams = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    let translateRes = http.post(translateUrl, translatePayload, translateParams);

    check(translateRes, {
      'execute successful': (r) => r.status === 200,
    });
  }

  sleep(1);
}
