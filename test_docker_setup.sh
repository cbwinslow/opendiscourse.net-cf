#!/bin/bash
# Test script for Docker deployment

echo "Testing Docker deployment setup..."

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null
then
    echo "Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null
then
    echo "Docker daemon is not running. Please start Docker daemon."
    exit 1
fi

echo "Docker environment is ready."

# Check if required files exist
required_files=(
    "Dockerfile"
    "Dockerfile.worker"
    "docker-compose.yml"
    "docker/neo4j/neo4j.conf"
    "docker/neo4j/entrypoint.sh"
)

for file in "${required_files[@]}"
do
    if [ ! -f "$file" ]
    then
        echo "Required file $file not found."
        exit 1
    fi
done

echo "All required files are present."

# Test Docker build
echo "Testing Docker build..."
if docker build -t opendiscourse-neo4j-test . -f Dockerfile --no-cache
then
    echo "Main API Docker build successful."
    # Clean up test image
    docker rmi opendiscourse-neo4j-test
else
    echo "Main API Docker build failed."
    exit 1
fi

if docker build -t opendiscourse-worker-test . -f Dockerfile.worker --no-cache
then
    echo "Worker Docker build successful."
    # Clean up test image
    docker rmi opendiscourse-worker-test
else
    echo "Worker Docker build failed."
    exit 1
fi

echo "Docker setup verification completed successfully."
echo "You can now run 'docker compose up -d' to start the services."