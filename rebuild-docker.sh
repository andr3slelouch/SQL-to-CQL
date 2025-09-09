#!/bin/bash

# This script performs a complete teardown and rebuild of the Docker environment.
# It is designed to resolve "volume is in use" errors by ensuring containers
# are fully removed before attempting to delete the Cassandra data volume.

# Color codes for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Step 1: Stop and Remove all services defined in docker-compose.yml ---
echo -e "${YELLOW}--- Step 1: Stopping and removing all containers defined in docker-compose.yml... ---${NC}"
# The 'down' command stops and removes containers, networks, and default volumes.
# The '--remove-orphans' flag ensures any containers not defined in the compose file are also removed.
docker-compose down --remove-orphans

if [ $? -ne 0 ]; then
    echo -e "${RED}Error during 'docker-compose down'. Please check your Docker setup.${NC}"
    exit 1
fi
echo -e "${GREEN}Containers and networks removed successfully.${NC}"


# --- Step 2: Explicitly Remove the Cassandra Data Volume ---
# Based on your successful manual deletion, the volume name is 'translate-service_cassandra-data'.
VOLUME_NAME="translate-service_cassandra-data"
echo -e "\n${YELLOW}--- Step 2: Removing Cassandra data volume '${VOLUME_NAME}'... ---${NC}"

# Check if the volume exists before trying to remove it
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    docker volume rm "$VOLUME_NAME"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Volume '${VOLUME_NAME}' removed successfully.${NC}"
    else
        echo -e "${RED}Error: Failed to remove volume '${VOLUME_NAME}'. It might still be in use by another container not managed by this docker-compose file.${NC}"
        echo -e "${YELLOW}Please run 'docker ps -a' to check for any other containers and stop/remove them manually.${NC}"
        exit 1
    fi
else
    echo -e "Volume '${YELLOW}${VOLUME_NAME}${NC}' not found. Skipping removal."
fi


# --- Step 3: Rebuild and Start Services ---
echo -e "\n${YELLOW}--- Step 3: Rebuilding and starting all services... ---${NC}"
# The '--build' flag forces a rebuild of the images from the Dockerfiles.
# The '-d' flag starts the containers in detached mode.
docker-compose up --build -d

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Docker environment has been successfully rebuilt and started!${NC}"
else
    echo -e "\n${RED}Error during 'docker-compose up'. Please check the build logs for errors.${NC}"
    exit 1
fi

