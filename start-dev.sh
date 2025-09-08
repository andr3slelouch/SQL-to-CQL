#!/bin/bash

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

# Start services
echo "Starting services..."
(cd auth-service && npm run start:dev &)
(cd permission-service && npm run start:dev &)
(cd translate-service && npm run start:dev &)
(cd frontend && npm run dev &)

echo "All services are starting in the background."
