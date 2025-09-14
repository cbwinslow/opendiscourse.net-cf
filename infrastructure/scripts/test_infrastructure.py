#!/usr/bin/env python3
"""
Test script to verify the OpenDiscourse infrastructure.
This script tests the database connections, message queue, and basic operations.
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import execute_values
import pika
import time
import numpy as np
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

# Note: this file defines TestInfrastructure and can be executed directly as a
# standalone integration script. Integration pytest wrappers live under
# `infrastructure/tests/` and will choose whether to run these checks.

class TestInfrastructure:
    def __init__(self):
        """
        Initialize TestInfrastructure instance.
        
        Creates attributes used to hold external connections/clients and sets them to None:
        - pg_conn: PostgreSQL connection
        - ch_conn: (unused/placeholder) channel/connection for message broker testing
        - rabbit_conn: RabbitMQ connection
        - rabbit_channel: RabbitMQ channel
        
        These are populated by the corresponding connect_* methods when tests run.
        """
        self.pg_conn = None
        self.ch_conn = None
        self.rabbit_conn = None
        self.rabbit_channel = None
        
    def connect_postgres(self) -> bool:
        """Test PostgreSQL connection."""
        try:
            self.pg_conn = psycopg2.connect(
                dbname=os.getenv('POSTGRES_DB', 'opendiscourse'),
                user=os.getenv('POSTGRES_USER', 'postgres'),
                password=os.getenv('POSTGRES_PASSWORD'),
                host=os.getenv('POSTGRES_HOST', 'localhost'),
                port=os.getenv('POSTGRES_PORT', '5432')
            )
            with self.pg_conn.cursor() as cur:
                cur.execute('SELECT version();')
                version = cur.fetchone()
                print(f"✅ PostgreSQL Connected: {version[0]}")
                
                # Check for pgvector extension
                cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
                if not cur.fetchone():
                    print("❌ pgvector extension not enabled")
                    return False
                    
            return True
            
        except Exception as e:
            print(f"❌ PostgreSQL Connection Error: {e}")
            return False
    
    def test_vector_search(self) -> bool:
        """Test vector similarity search."""
        if not self.pg_conn:
            print("❌ PostgreSQL connection not established")
            return False
            
        try:
            with self.pg_conn.cursor() as cur:
                # Create a test document and embedding
                test_embedding = np.random.rand(1536).astype(np.float32).tobytes()
                
                # Insert test data
                cur.execute("""
                    INSERT INTO documents 
                    (original_filename, content_type, file_size, storage_path, status)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    'test_document.txt',
                    'text/plain',
                    1024,
                    'test/path/test_document.txt',
                    'processed'
                ))
                doc_id = cur.fetchone()[0]
                
                # Insert test chunk with embedding
                cur.execute("""
                    INSERT INTO document_chunks 
                    (document_id, chunk_index, content, embedding)
                    VALUES (%s, %s, %s, %s)
                """, (
                    doc_id,
                    0,
                    'This is a test document chunk for vector search.',
                    test_embedding
                ))
                
                # Test search
                query_embedding = test_embedding  # Same as the test data
                cur.execute("""
                    SELECT id, content, 1 - (embedding <=> %s) as similarity
                    FROM document_chunks
                    WHERE 1 - (embedding <=> %s) > 0.8
                    ORDER BY embedding <=> %s
                    LIMIT 1
                """, (query_embedding, query_embedding, query_embedding))
                
                result = cur.fetchone()
                if result:
                    print(f"✅ Vector search test passed. Similarity: {result[2]:.3f}")
                    return True
                else:
                    print("❌ Vector search test failed - no results")
                    return False
                    
        except Exception as e:
            print(f"❌ Vector search test failed: {e}")
            return False
            
        finally:
            # Clean up
            if self.pg_conn:
                with self.pg_conn.cursor() as cur:
                    cur.execute("DELETE FROM document_chunks WHERE document_id IN (SELECT id FROM documents WHERE original_filename = 'test_document.txt')")
                    cur.execute("DELETE FROM documents WHERE original_filename = 'test_document.txt'")
                self.pg_conn.commit()
    
    def connect_rabbitmq(self) -> bool:
        """Test RabbitMQ connection and basic queue operations."""
        try:
            credentials = pika.PlainCredentials(
                os.getenv('RABBITMQ_DEFAULT_USER', 'guest'),
                os.getenv('RABBITMQ_DEFAULT_PASS', 'guest')
            )
            self.rabbit_conn = pika.BlockingConnection(
                pika.ConnectionParameters(
                    host=os.getenv('RABBITMQ_HOST', 'localhost'),
                    port=int(os.getenv('RABBITMQ_PORT', '5672')),
                    credentials=credentials,
                    heartbeat=600,
                    blocked_connection_timeout=300
                )
            )
            self.rabbit_channel = self.rabbit_conn.channel()
            
            # Declare a test queue
            test_queue = 'test_queue'
            self.rabbit_channel.queue_declare(queue=test_queue, durable=True)
            
            # Publish a test message
            message = {'test': 'message', 'timestamp': time.time()}
            self.rabbit_channel.basic_publish(
                exchange='',
                routing_key=test_queue,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # make message persistent
                )
            )
            
            # Consume the test message
            method_frame, _, body = self.rabbit_channel.basic_get(test_queue)
            if method_frame:
                received_message = json.loads(body)
                if received_message['test'] == message['test']:
                    print("✅ RabbitMQ test passed")
                    self.rabbit_channel.basic_ack(method_frame.delivery_tag)
                    return True
                
            print("❌ RabbitMQ test failed - message not received")
            return False
            
        except Exception as e:
            print(f"❌ RabbitMQ Connection Error: {e}")
            return False
    
    def test_all(self) -> bool:
        """Run all tests and return overall success."""
        print("🚀 Starting OpenDiscourse Infrastructure Tests\n" + "="*50)
        
        tests = {
            'PostgreSQL Connection': self.connect_postgres,
            'Vector Search': self.test_vector_search,
            'RabbitMQ Connection': self.connect_rabbitmq
        }
        
        results = {}
        for name, test_func in tests.items():
            print(f"\n🔍 Testing {name}...")
            try:
                results[name] = test_func()
            except Exception as e:
                print(f"❌ Error in {name}: {e}")
                results[name] = False
        
        # Print summary
        print("\n" + "="*50)
        print("📊 Test Results:")
        print("-"*50)
        
        all_passed = True
        for name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{status} - {name}")
            if not passed:
                all_passed = False
        
        print("\n" + ("🎉 All tests passed!" if all_passed else "❌ Some tests failed"))
        return all_passed
    
    def close(self):
        """Close all connections."""
        if self.pg_conn:
            self.pg_conn.close()
        if self.rabbit_conn and self.rabbit_conn.is_open:
            self.rabbit_conn.close()

if __name__ == "__main__":
    tester = TestInfrastructure()
    try:
        success = tester.test_all()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)
    finally:
        tester.close()
