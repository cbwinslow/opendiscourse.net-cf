#!/bin/bash
# Entrypoint script for Neo4j container

set -e

# Function to initialize the database
initialize_database() {
  echo "Initializing Neo4j database..."
  
  # Wait for Neo4j to start
  echo "Waiting for Neo4j to start..."
  until curl -s http://localhost:7474 >/dev/null; do
    sleep 1
  done
  
  echo "Neo4j is running. Creating initial schema..."
  
  # Create initial constraints and indexes
  curl -X POST \
    -H "Content-Type: application/json" \
    -u "neo4j:password" \
    -d '{
      "statements": [
        {
          "statement": "CREATE CONSTRAINT unique_politician_id IF NOT EXISTS FOR (p:Politician) REQUIRE p.id IS UNIQUE"
        },
        {
          "statement": "CREATE CONSTRAINT unique_legislation_id IF NOT EXISTS FOR (l:Legislation) REQUIRE l.id IS UNIQUE"
        },
        {
          "statement": "CREATE CONSTRAINT unique_organization_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE"
        },
        {
          "statement": "CREATE INDEX politician_name IF NOT EXISTS FOR (p:Politician) ON (p.name)"
        },
        {
          "statement": "CREATE INDEX legislation_title IF NOT EXISTS FOR (l:Legislation) ON (l.title)"
        },
        {
          "statement": "CREATE INDEX organization_name IF NOT EXISTS FOR (o:Organization) ON (o.name)"
        }
      ]
    }' \
    http://localhost:7474/db/neo4j/tx/commit
  
  echo "Initial schema created successfully."
}

# Start Neo4j in the background
echo "Starting Neo4j..."
/docker-entrypoint.sh neo4j &

# Initialize database in the background
initialize_database &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?