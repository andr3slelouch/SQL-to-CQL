#!/bin/bash

# This script finds and stops all running microservices and the Cassandra Docker container
# associated with the SQL-to-CQL project.

# Color codes for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}--- Attempting to stop SQL-to-CQL microservices ---${NC}"

# Define the ports your services are running on
PORTS=(3000 3001 3002 3003)

# Loop through each port
for PORT in "${PORTS[@]}"
do
    # Find the Process ID (PID) listening on the current port
    # lsof -t -i:PORT returns only the PID
    PID=$(lsof -t -i:$PORT)

    if [ -z "$PID" ]
    then
        echo -e "No service found running on port ${GREEN}$PORT${NC}."
    else
        echo -e "Service found on port ${GREEN}$PORT${NC} with PID ${YELLOW}$PID${NC}. Sending kill signal..."
        # Kill the process gracefully first, then force if necessary
        kill $PID
        sleep 1 # Give it a moment to shut down
        # Check if the process is still alive
        if kill -0 $PID > /dev/null 2>&1; then
            echo -e "Process ${YELLOW}$PID${NC} did not respond. Forcing shutdown (kill -9)..."
            kill -9 $PID
        else
            echo -e "Service on port ${GREEN}$PORT${NC} stopped successfully."
        fi
    fi
done

echo -e "\n${YELLOW}--- Attempting to stop Cassandra Docker container ---${NC}"

# Find the container ID using a known name from the docker-compose file (e.g., 'cassandra-node1')
# Replace 'sql-to-cql-cassandra-1' if your container name is different.
# You can find the name by running `docker ps`
CONTAINER_NAME="cassandra:latest"
CONTAINER_ID=$(docker ps -qf "name=${CONTAINER_NAME}")

if [ -z "$CONTAINER_ID" ]
then
    echo -e "Cassandra container '${YELLOW}${CONTAINER_NAME}${NC}' not found or not running."
else
    echo -e "Found Cassandra container '${YELLOW}${CONTAINER_NAME}${NC}' with ID ${GREEN}${CONTAINER_ID}${NC}. Stopping it..."
    docker stop $CONTAINER_ID
    echo -e "Cassandra container stopped successfully."
fi

echo -e "\n${GREEN}All services have been shut down.${NC}"
