#!/bin/bash

# Exit on error
set -e

# Load environment variables from .env file if it exists
if [ -f ../.env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' ../.env | xargs)
fi

# Generate a random password if not set
if [ -z "$POSTGRES_PASSWORD" ]; then
    export POSTGRES_PASSWORD=$(openssl rand -base64 32)
    echo "Generated POSTGRES_PASSWORD"
fi

if [ -z "$CLICKHOUSE_PASSWORD" ]; then
    export CLICKHOUSE_PASSWORD=$(openssl rand -base64 32)
    echo "Generated CLICKHOUSE_PASSWORD"
fi

if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT_SECRET"
fi

if [ -z "$RABBITMQ_DEFAULT_PASS" ]; then
    export RABBITMQ_DEFAULT_PASS=$(openssl rand -base64 16)
    echo "Generated RABBITMQ_DEFAULT_PASS"
fi

if [ -z "$GRAYLOG_PASSWORD_SECRET" ]; then
    export GRAYLOG_PASSWORD_SECRET=$(openssl rand -base64 64)
    echo "Generated GRAYLOG_PASSWORD_SECRET"
fi

if [ -z "$GRAYLOG_ROOT_PASSWORD_SHA2" ]; then
    GRAYLOG_PASSWORD="admin"
    export GRAYLOG_ROOT_PASSWORD_SHA2=$(echo -n "$GRAYLOG_PASSWORD" | shasum -a 256 | cut -d' ' -f1)
    echo "Generated GRAYLOG_ROOT_PASSWORD_SHA2"
fi

# Create necessary directories
mkdir -p ./monitoring/prometheus
mkdir -p ./monitoring/grafana/provisioning/datasources
mkdir -p ./monitoring/grafana/provisioning/dashboards
mkdir -p ./clickhouse

# Create Grafana provisioning files
cat > ./monitoring/grafana/provisioning/datasources/datasource.yml <<EOL
apiVersion: 1

deleteDatasources:
  - name: Prometheus
    orgId: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    version: 1
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    version: 1
    editable: true
EOL

# Create ClickHouse configuration
cat > ./clickhouse/config.xml <<EOL
<yandex>
    <logger>
        <level>warning</level>
        <console>true</console>
    </logger>

    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>

    <listen_host>0.0.0.0</listen_host>
    <max_connections>4096</max_connections>
    <keep_alive_timeout>3</keep_alive_timeout>
    <max_concurrent_queries>100</max_concurrent_queries>
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>
    <mark_cache_size>5368709120</mark_cache_size>
    <path>/var/lib/clickhouse/</path>
    <tmp_path>/var/lib/clickhouse/tmp/</tmp_path>
    <user_files_path>/var/lib/clickhouse/user_files/</user_files_path>
    <users_config>users.xml</users_config>
    <default_profile>default</default_profile>
    <default_database>default</default_database>
    <timezone>UTC</timezone>
</yandex>
EOL

# Create ClickHouse users configuration
cat > ./clickhouse/users.xml <<EOL
<yandex>
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <use_uncompressed_cache>0</use_uncompressed_cache>
            <load_balancing>random</load_balancing>
        </default>
    </profiles>

    <users>
        <default>
            <password>${CLICKHOUSE_PASSWORD}</password>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
            <access_management>1</access_management>
        </default>
    </users>

    <quotas>
        <default>
            <interval>
                <duration>3600</duration>
                <queries>0</queries>
                <errors>0</errors>
                <result_rows>0</result_rows>
                <read_rows>0</read_rows>
                <execution_time>0</execution_time>
            </interval>
        </default>
    </quotas>
</yandex>
EOL

echo "Setup completed successfully!"
echo "To start the infrastructure, run: docker-compose up -d"

# Save environment variables to .env file
cat > ../.env <<EOL
# Database
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB:-opendiscourse}
CLICKHOUSE_USER=${CLICKHOUSE_USER:-default}
CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
CLICKHOUSE_DB=${CLICKHOUSE_DB:-opendiscourse}

# Message Broker
RABBITMQ_DEFAULT_USER=${RABBITMQ_DEFAULT_USER:-guest}
RABBITMQ_DEFAULT_PASS=${RABBITMQ_DEFAULT_PASS}

# Authentication
JWT_SECRET=${JWT_SECRET}

# Monitoring
GRAYLOG_PASSWORD_SECRET=${GRAYLOG_PASSWORD_SECRET}
GRAYLOG_ROOT_PASSWORD_SHA2=${GRAYLOG_ROOT_PASSWORD_SHA2}

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-}
CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN:-}
CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID:-}

# GovInfo API
GOVINFO_API_KEY=${GOVINFO_API_KEY:-}
EOL

echo "Environment variables saved to .env file"
echo "Please review the .env file and add any missing values"
