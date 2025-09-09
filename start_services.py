#!/usr/bin/env python3
"""
OpenDiscourse Service Manager
Manages the startup, shutdown, and monitoring of all OpenDiscourse services.
"""

import os
import sys
import time
import subprocess
import json
import requests
import signal
import argparse
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ServiceConfig:
    name: str
    port: int
    host: str = "localhost"
    health_endpoint: str = "/health"
    dependencies: List[str] = None
    container_name: str = ""
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
        if not self.container_name:
            self.container_name = f"opendiscourse-{self.name}"

class ServiceManager:
    """Manages OpenDiscourse services with proper port management and health checks."""
    
    def __init__(self):
        self.services = self._load_service_config()
        self.running_services = set()
        self.docker_compose_files = [
            "docker-compose.yml",
            "infrastructure/docker-compose.yml"
        ]
        
    def _load_service_config(self) -> Dict[str, ServiceConfig]:
        """Load service configuration with proper port assignments."""
        return {
            # Core Infrastructure
            "postgres": ServiceConfig("postgres", 5432, health_endpoint=""),
            "clickhouse": ServiceConfig("clickhouse", 8123, health_endpoint="/ping"),
            "neo4j": ServiceConfig("neo4j", 7474, health_endpoint=""),
            "weaviate": ServiceConfig("weaviate", 8080, health_endpoint="/v1/.well-known/ready"),
            "qdrant": ServiceConfig("qdrant", 6333, health_endpoint="/"),
            "rabbitmq": ServiceConfig("rabbitmq", 15672, health_endpoint="/"),
            
            # Supabase Services
            "supabase-db": ServiceConfig("supabase-db", 5433, health_endpoint=""),
            "supabase-auth": ServiceConfig("supabase-auth", 9999, health_endpoint="/health", dependencies=["supabase-db"]),
            
            # API Gateway
            "kong": ServiceConfig("kong", 8001, health_endpoint="/status"),
            
            # AI Services
            "openwebui": ServiceConfig("openwebui", 3000, health_endpoint="/"),
            "localai": ServiceConfig("localai", 8081, health_endpoint="/"),
            "flowise": ServiceConfig("flowise", 3001, health_endpoint="/"),
            "n8n": ServiceConfig("n8n", 5678, health_endpoint="/"),
            
            # Monitoring
            "prometheus": ServiceConfig("prometheus", 9090, health_endpoint="/-/healthy"),
            "grafana": ServiceConfig("grafana", 3002, health_endpoint="/api/health"),
            "loki": ServiceConfig("loki", 3100, health_endpoint="/ready"),
            "opensearch": ServiceConfig("opensearch", 9200, health_endpoint="/_cluster/health"),
            "graylog": ServiceConfig("graylog", 9000, health_endpoint="/", dependencies=["opensearch"]),
            
            # Application Services
            "opendiscourse-api": ServiceConfig("opendiscourse-api", 3333, dependencies=["postgres", "supabase-auth"]),
            "opendiscourse-worker": ServiceConfig("opendiscourse-worker", 3334, dependencies=["postgres", "rabbitmq"]),
        }
    
    def _run_command(self, command: List[str], cwd: str = None) -> subprocess.CompletedProcess:
        """Run a command and return the result."""
        try:
            print(f"Running: {' '.join(command)}")
            result = subprocess.run(
                command,
                cwd=cwd or os.getcwd(),
                capture_output=True,
                text=True,
                timeout=300
            )
            if result.returncode != 0:
                print(f"Command failed: {result.stderr}")
            return result
        except subprocess.TimeoutExpired:
            print(f"Command timed out: {' '.join(command)}")
            return subprocess.CompletedProcess(command, 1, "", "Timeout")
        except Exception as e:
            print(f"Error running command: {e}")
            return subprocess.CompletedProcess(command, 1, "", str(e))
    
    def _check_docker(self) -> bool:
        """Check if Docker is available and running."""
        try:
            result = self._run_command(["docker", "version"])
            if result.returncode != 0:
                print("Docker is not running. Please start Docker.")
                return False
            
            result = self._run_command(["docker-compose", "version"])
            if result.returncode != 0:
                print("Docker Compose is not available. Please install Docker Compose.")
                return False
            
            return True
        except FileNotFoundError:
            print("Docker is not installed. Please install Docker.")
            return False
    
    def _check_service_health(self, service: ServiceConfig, timeout: int = 30) -> bool:
        """Check if a service is healthy."""
        if not service.health_endpoint:
            # For services without health endpoints, just check if port is open
            return self._check_port(service.host, service.port)
        
        url = f"http://{service.host}:{service.port}{service.health_endpoint}"
        
        for attempt in range(timeout):
            try:
                response = requests.get(url, timeout=5)
                if response.status_code < 400:
                    print(f"✅ {service.name} is healthy at {url}")
                    return True
            except requests.exceptions.RequestException:
                pass
            
            print(f"⏳ Waiting for {service.name} to be healthy... ({attempt + 1}/{timeout})")
            time.sleep(1)
        
        print(f"❌ {service.name} failed health check at {url}")
        return False
    
    def _check_port(self, host: str, port: int) -> bool:
        """Check if a port is open."""
        import socket
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result == 0
        except Exception:
            return False
    
    def _wait_for_dependencies(self, service: ServiceConfig) -> bool:
        """Wait for service dependencies to be ready."""
        for dep_name in service.dependencies:
            if dep_name not in self.services:
                print(f"Unknown dependency: {dep_name}")
                continue
            
            dep_service = self.services[dep_name]
            if not self._check_service_health(dep_service, timeout=60):
                print(f"Dependency {dep_name} is not healthy")
                return False
        
        return True
    
    def setup_environment(self):
        """Set up the environment and create necessary directories."""
        print("Setting up environment...")
        
        # Create data directories
        data_dirs = [
            "./data/postgres",
            "./data/clickhouse", 
            "./data/weaviate",
            "./data/qdrant",
            "./data/prometheus",
            "./data/grafana",
            "./data/loki",
            "./data/opensearch",
            "./data/graylog"
        ]
        
        for dir_path in data_dirs:
            os.makedirs(dir_path, exist_ok=True)
            os.chmod(dir_path, 0o777)
        
        # Create configuration directories
        config_dirs = [
            "./infrastructure/kong",
            "./infrastructure/monitoring/prometheus",
            "./infrastructure/monitoring/grafana/provisioning/datasources",
            "./infrastructure/monitoring/grafana/provisioning/dashboards"
        ]
        
        for dir_path in config_dirs:
            os.makedirs(dir_path, exist_ok=True)
        
        # Create basic Kong configuration if it doesn't exist
        kong_config_path = "./infrastructure/kong/kong.yml"
        if not os.path.exists(kong_config_path):
            self._create_kong_config(kong_config_path)
        
        # Create basic Prometheus configuration if it doesn't exist
        prometheus_config_path = "./infrastructure/monitoring/prometheus/prometheus.yml"
        if not os.path.exists(prometheus_config_path):
            self._create_prometheus_config(prometheus_config_path)
        
        print("✅ Environment setup complete")
    
    def _create_kong_config(self, config_path: str):
        """Create basic Kong configuration."""
        config = {
            "_format_version": "3.0",
            "services": [
                {
                    "name": "opendiscourse-api",
                    "url": "http://opendiscourse-api:3000",
                    "routes": [
                        {
                            "name": "api-route",
                            "paths": ["/api"]
                        }
                    ]
                }
            ]
        }
        
        with open(config_path, 'w') as f:
            import yaml
            yaml.dump(config, f, default_flow_style=False)
    
    def _create_prometheus_config(self, config_path: str):
        """Create basic Prometheus configuration."""
        config = """
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  
  - job_name: 'opendiscourse-api'
    static_configs:
      - targets: ['opendiscourse-api:3000']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
"""
        with open(config_path, 'w') as f:
            f.write(config)
    
    def start_services(self, service_names: Optional[List[str]] = None):
        """Start specified services or all services."""
        if not self._check_docker():
            return False
        
        self.setup_environment()
        
        services_to_start = service_names or list(self.services.keys())
        
        print(f"Starting services: {', '.join(services_to_start)}")
        
        # Start infrastructure services first
        for compose_file in self.docker_compose_files:
            if os.path.exists(compose_file):
                print(f"Starting services from {compose_file}")
                result = self._run_command([
                    "docker-compose", "-f", compose_file, "up", "-d"
                ])
                if result.returncode != 0:
                    print(f"Failed to start services from {compose_file}")
                    return False
        
        # Wait for services to start and check health
        for service_name in services_to_start:
            if service_name not in self.services:
                print(f"Unknown service: {service_name}")
                continue
            
            service = self.services[service_name]
            
            # Wait for dependencies
            if not self._wait_for_dependencies(service):
                print(f"Failed to start {service_name} due to dependency issues")
                continue
            
            # Check service health
            if self._check_service_health(service, timeout=60):
                self.running_services.add(service_name)
                print(f"✅ {service_name} started successfully")
            else:
                print(f"❌ {service_name} failed to start properly")
        
        self._print_service_status()
        return True
    
    def stop_services(self, service_names: Optional[List[str]] = None):
        """Stop specified services or all services."""
        print("Stopping services...")
        
        for compose_file in reversed(self.docker_compose_files):
            if os.path.exists(compose_file):
                print(f"Stopping services from {compose_file}")
                result = self._run_command([
                    "docker-compose", "-f", compose_file, "down"
                ])
                if result.returncode != 0:
                    print(f"Warning: Issues stopping services from {compose_file}")
        
        self.running_services.clear()
        print("✅ All services stopped")
    
    def restart_services(self, service_names: Optional[List[str]] = None):
        """Restart specified services or all services."""
        self.stop_services(service_names)
        time.sleep(5)  # Wait a bit between stop and start
        return self.start_services(service_names)
    
    def status(self):
        """Show the status of all services."""
        print("\n=== OpenDiscourse Services Status ===")
        
        for service_name, service in self.services.items():
            is_healthy = self._check_service_health(service, timeout=5)
            status_icon = "🟢" if is_healthy else "🔴"
            port_info = f"{service.host}:{service.port}"
            print(f"{status_icon} {service_name:<20} {port_info:<20} {'Healthy' if is_healthy else 'Not responding'}")
        
        print()
    
    def _print_service_status(self):
        """Print a summary of service status."""
        print("\n=== Service URLs ===")
        
        service_urls = {
            "grafana": "http://localhost:3002 (admin/admin)",
            "prometheus": "http://localhost:9090",
            "rabbitmq": "http://localhost:15672 (guest/guest)",
            "kong-admin": "http://localhost:8001",
            "kong-gui": "http://localhost:8002",
            "openwebui": "http://localhost:3000",
            "flowise": "http://localhost:3001",
            "n8n": "http://localhost:5678",
            "graylog": "http://localhost:9000",
            "opendiscourse-api": "http://localhost:3333",
        }
        
        for service, url in service_urls.items():
            print(f"  {service}: {url}")
        
        print()
    
    def logs(self, service_name: str = None, follow: bool = False):
        """Show logs for a service or all services."""
        cmd = ["docker-compose"]
        
        # Add all compose files
        for compose_file in self.docker_compose_files:
            if os.path.exists(compose_file):
                cmd.extend(["-f", compose_file])
        
        cmd.append("logs")
        
        if follow:
            cmd.append("-f")
        
        if service_name:
            if service_name in self.services:
                cmd.append(self.services[service_name].container_name)
            else:
                print(f"Unknown service: {service_name}")
                return
        
        self._run_command(cmd)

def main():
    parser = argparse.ArgumentParser(description="OpenDiscourse Service Manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start services")
    start_parser.add_argument("services", nargs="*", help="Specific services to start")
    
    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop services")
    stop_parser.add_argument("services", nargs="*", help="Specific services to stop")
    
    # Restart command
    restart_parser = subparsers.add_parser("restart", help="Restart services")
    restart_parser.add_argument("services", nargs="*", help="Specific services to restart")
    
    # Status command
    subparsers.add_parser("status", help="Show service status")
    
    # Logs command
    logs_parser = subparsers.add_parser("logs", help="Show logs")
    logs_parser.add_argument("service", nargs="?", help="Specific service logs")
    logs_parser.add_argument("-f", "--follow", action="store_true", help="Follow logs")
    
    # Setup command
    subparsers.add_parser("setup", help="Setup environment")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = ServiceManager()
    
    def signal_handler(signum, frame):
        print("\nGracefully shutting down...")
        manager.stop_services()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        if args.command == "start":
            manager.start_services(args.services if args.services else None)
        elif args.command == "stop":
            manager.stop_services(args.services if args.services else None)
        elif args.command == "restart":
            manager.restart_services(args.services if args.services else None)
        elif args.command == "status":
            manager.status()
        elif args.command == "logs":
            manager.logs(args.service, args.follow)
        elif args.command == "setup":
            manager.setup_environment()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()