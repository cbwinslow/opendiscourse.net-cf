#!/bin/bash

# Exit on error and print commands as they are executed
set -ex

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Function to check if a service is running
check_service() {
    local name=$1
    local url=$2
    local max_retries=30
    local retry_count=0
    
    echo "Checking if $name is available at $url"
    
    until curl -s -f -o /dev/null "$url" || [ $retry_count -ge $max_retries ]; do
        echo "Waiting for $name to be available... (Attempt $((retry_count + 1))/$max_retries)"
        retry_count=$((retry_count + 1))
        sleep 5
    done
    
    if [ $retry_count -ge $max_retries ]; then
        echo "Error: $name failed to start after $max_retries attempts"
        return 1
    else
        echo "✅ $name is up and running at $url"
        return 0
    fi
}

# Function to start services with Docker Compose
start_services() {
    echo "Starting OpenDiscourse infrastructure..."
    
    # Create necessary directories
    mkdir -p ./data/{postgres,clickhouse,weaviate,qdrant,prometheus,grafana,loki,opensearch,graylog}
    
    # Set proper permissions
    chmod -R 777 ./data
    
    # Start services
    docker-compose -f infrastructure/docker-compose.yml up -d
    
    # Wait for services to start
    sleep 10
    
    # Check core services
    check_service "PostgreSQL" "http://localhost:5432"
    check_service "ClickHouse" "http://localhost:8123/ping"
    check_service "Weaviate" "http://localhost:8080/v1/.well-known/ready"
    check_service "Qdrant" "http://localhost:6333"
    check_service "RabbitMQ" "http://localhost:15672"
    
    # Check monitoring services
    check_service "Prometheus" "http://localhost:9090/-/healthy"
    check_service "Grafana" "http://localhost:3000/api/health"
    check_service "Loki" "http://localhost:3100/ready"
    check_service "OpenSearch" "http://localhost:9200/_cluster/health"
    check_service "Graylog" "http://localhost:9000/api"
    check_service "Kong" "http://localhost:8001/status"
    
    echo "✅ All services started successfully!"
}

# Function to stop services
stop_services() {
    echo "Stopping OpenDiscourse infrastructure..."
    docker-compose -f infrastructure/docker-compose.yml down
    echo "✅ All services stopped"
}

# Function to view logs
view_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker-compose -f infrastructure/docker-compose.yml logs -f
    else
        docker-compose -f infrastructure/docker-compose.yml logs -f "$service"
    fi
}

# Function to run database migrations
run_migrations() {
    echo "Running database migrations..."
    
    # Wait for PostgreSQL to be ready
    check_service "PostgreSQL" "http://localhost:5432"
    
    # Run migrations using the API service
    docker-compose -f infrastructure/docker-compose.yml exec api \
        python -m alembic upgrade head
    
    echo "✅ Database migrations completed"
}

# Function to initialize the system
initialize_system() {
    echo "Initializing OpenDiscourse system..."
    
    # Start services if not already running
    if ! docker ps | grep -q "opendiscourse"; then
        start_services
    fi
    
    # Run migrations
    run_migrations
    
    # Initialize default admin user
    echo "Creating default admin user..."
    docker-compose -f infrastructure/docker-compose.yml exec api \
        python -c "from app.core.security import get_password_hash; from app.db.session import SessionLocal; from app.models.user import User; db = SessionLocal(); db.add(User(email='admin@opendiscourse.net', hashed_password=get_password_hash('admin'), is_superuser=True, is_active=True)); db.commit()"
    
    echo "✅ System initialization completed"
    echo "Default admin credentials:"
    echo "Email: admin@opendiscourse.net"
    echo "Password: admin (Please change this immediately after first login)"
}

# Main script
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    logs)
        view_logs "$2"
        ;;
    migrate)
        run_migrations
        ;;
    init)
        initialize_system
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs [service]|migrate|init}"
        exit 1
        ;;
esac

exit 0
