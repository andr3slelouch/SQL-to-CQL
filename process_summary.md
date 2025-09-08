# Summary of Testing and Debugging Process

This document details the process of analyzing, debugging, and testing the microservice-based security framework to address feedback regarding performance and security evaluation.

## 1. Initial Goal

The primary objective was to generate tests and analysis to address the following points for a research paper:

1.  Lack of performance benchmarks (latency, throughput, scalability).
2.  Evaluation limited to functionality, without stress or load testing.
3.  Superficial analysis of security threats like token hijacking and replay attacks.

## 2. Initial Project Analysis

- **Service Identification:** The work focused on the `auth-service`, `permission-service`, and `translate-service`.
- **Technology Stack:** An initial review of `package.json` files confirmed the use of NestJS, `@nestjs/jwt` for JSON Web Tokens, and `bcrypt` for password hashing in the `auth-service`.
- **Authentication Flow:** Code review of the `auth-service` revealed the core authentication logic, including a brute-force protection mechanism designed to lock out users after multiple failed login attempts.

## 3. Planning and Strategy

A plan was formulated to use the `k6` load testing tool to simulate user behavior and generate performance data. The testing strategy involved:

1.  **Installing `k6`** to run the load tests.
2.  **Creating a `load-test.js` script** with two distinct scenarios:
    - **`failed_logins`:** A scenario to intentionally trigger the brute-force protection by bombarding the login endpoint with invalid credentials.
    - **`successful_flow`:** A scenario simulating a legitimate user logging in, obtaining a JWT, and using that token to access a protected endpoint (`/translator/execute`) in the `translate-service`.
3.  **Executing the load test** to gather performance metrics.
4.  **Performing a security analysis** of the existing codebase.

## 4. Execution, Debugging, and Remediation

This phase involved an iterative process of executing the plan, identifying issues, and fixing them.

### 4.1. Problem: API Endpoint Not Found

- **Action:** Attempted to create a test user via a `curl` command to `http://localhost:3000/users`.
- **Result:** The request failed with a `404 Not Found` error.
- **Investigation:** Examination of the `auth-service/src/main.ts` file revealed two important configurations:
    1.  A global API prefix was set: `app.setGlobalPrefix('api');`
    2.  The service was configured to run on port `3001`, not `3000`.
- **Correction:** The endpoint URL was updated to `http://localhost:3001/api/users`.

### 4.2. Problem: Connection Refused

- **Action:** Retried the `curl` command with the corrected URL.
- **Result:** The request failed with a `curl: (7) Failed to connect to localhost port 3001... Connection refused` error.
- **Investigation:** This error indicated that the `auth-service` and other related services were not running.

### 4.3. Problem: Cassandra Keyspace Not Found

- **Action:** The user started the microservices.
- **Result:** The services failed to start, logging a `ResponseError: Keyspace 'auth' does not exist`.
- **Investigation:** A comparison between the database provider files (`cassandra.provider.ts`) of the failing services (`auth-service`, `permission-service`) and the working `translate-service` was performed. It was discovered that the `translate-service` contained logic to create its keyspace (`sql_translator`) if it didn't exist, whereas the other services lacked this crucial step and attempted to connect directly to the `auth` keyspace.
- **Solution:** The robust keyspace creation logic from the `translate-service` was adapted and implemented in the `cassandra.provider.ts` files for both the `auth-service` and `permission-service`. This involved first connecting to Cassandra without a keyspace, running `CREATE KEYSPACE IF NOT EXISTS auth ...`, and then establishing the permanent connection to the `auth` keyspace.

### 4.4. Problem: Cassandra Table Not Found

- **Action:** With the keyspace issue resolved, the services were restarted, and the user creation `curl` command was executed again.
- **Result:** The request failed with a `500 Internal Server Error` and the message `Error al verificar si el usuario existe` (Error when verifying if the user exists).
- **Investigation:** The error originated from the `checkIfCedulaExistsInPermissions` function in `create-user.service.ts`. This function was querying the `auth.permissions` table before creating a user. The error indicated that while the `auth` keyspace now existed, the `permissions` and `users` tables did not.
- **Solution:** A standalone Node.js script, `create-schema.js`, was created in the `auth-service` directory. This script connects to the Cassandra database and executes the `CREATE TABLE IF NOT EXISTS` queries for both the `users` and `permissions` tables.

### 4.5. Success: User Creation

- **Action:** The user executed the `node create-schema.js` script, which successfully created the necessary tables. The services were restarted, and the `curl` command to create the test user was finally successful.

## 5. Load Test Execution and Analysis (Round 1)

- **Action:** The initial `load-test.js` script was executed.
- **Result:** The test reported a very high failure rate (~94%). The checks for `login successful` and `execute successful` were failing frequently.
- **Investigation:** The root cause was identified as a **flaw in the test design**. Both the `failed_logins` and `successful_flow` scenarios were using the same user ID. This caused the brute-force protection triggered by the `failed_logins` scenario to lock out the user, which in turn caused the `successful_flow` scenario to fail.

## 6. Load Test Correction and Execution (Round 2)

- **Action:** The `load-test.js` script was corrected. The `failed_logins` scenario was updated to use a distinct, non-existent user ID (`999999999`) to isolate it from the legitimate user in the `successful_flow`.
- **Result:** The corrected script was executed.
- **Analysis of New Results:**
    - The `login successful` check now passed **100%** of the time, confirming the test isolation was successful.
    - A new issue was uncovered: the `execute successful` check began failing **100%** of the time.
    - This indicated that while the `auth-service` was correctly authenticating users and issuing tokens, the `translate-service` was rejecting requests made with these valid tokens.

## 7. Debugging the `translate-service`

- **Action:** The user provided logs from the `auth-service`.
- **Analysis:** The logs showed a large number of `429 Too Many Requests` errors with the message `Demasiados intentos fallidos. Intente nuevamente en 128 minutos.`. This confirmed that the brute-force protection was working as designed against the dummy user from the `failed_logins` scenario.
- **Conclusion:** The provided logs, while useful for confirming the brute-force protection, did not explain the failure in the `translate-service`. The problem is not with the `auth-service` issuing tokens, but with the `translate-service` accepting them.

## 8. Current State and Next Steps

We have successfully debugged the `auth-service`, the database schema, and the load testing script. The current focus has shifted to the `translate-service`.

- **The Problem:** The `translate-service` is rejecting valid JWTs issued by the `auth-service`.
- **Next Step:** The crucial next step is to **analyze the logs from the `translate-service`** from the time the `k6` test was running. These logs will contain the specific error message explaining why the authenticated requests are failing, allowing us to pinpoint the final issue.