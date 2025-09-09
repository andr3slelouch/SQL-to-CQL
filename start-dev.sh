#!/bin/bash

# Define log file paths in the root directory
AUTH_LOG="auth-service.log"
PERMISSION_LOG="permission-service.log"
TRANSLATE_LOG="translate-service.log"
FRONTEND_LOG="frontend.log"

# Clean up old log files before starting
echo "Cleaning up old log files..."
rm -f $AUTH_LOG $PERMISSION_LOG $TRANSLATE_LOG $FRONTEND_LOG

# Start Cassandra in Docker
#echo "Starting Cassandra..."
#(cd translate-service && docker-compose up -d)

# Install dependencies
echo "Installing dependencies for auth-service..."
(cd auth-service && npm install)

echo "Installing dependencies for permission-service..."
(cd permission-service && npm install)

echo "Installing dependencies for translate-service..."
(cd translate-service && npm install)

echo "Installing dependencies for frontend..."
(cd frontend && npm install)

# Start services and redirect output to log files
echo "Starting services and logging to files..."
(cd auth-service && npm run start:dev > ../$AUTH_LOG 2>&1 &)
(cd permission-service && npm run start:dev > ../$PERMISSION_LOG 2>&1 &)
(cd translate-service && npm run start:dev > ../$TRANSLATE_LOG 2>&1 &)
(cd frontend && npm run dev > ../$FRONTEND_LOG 2>&1 &)

echo "All services are starting in the background."
echo "Logs will be saved to:"
echo "- $AUTH_LOG"
echo "- $PERMISSION_LOG"
echo "- $TRANSLATE_LOG"
echo "- $FRONTEND_LOG"
