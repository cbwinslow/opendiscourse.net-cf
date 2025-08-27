// Test script for the agentic knowledge graph system

import { Neo4jConnection } from './neo4j/neo4j_connection';
import { KnowledgeGraphOrchestrator } from './orchestrator';

async function testAgenticGraph() {
  console.log('Testing agentic knowledge graph system...');
  
  // Initialize Neo4j connection (simulated)
  const neo4j = new Neo4jConnection({
    uri: 'bolt://localhost:7687',
    username: 'neo4j',
    password: 'password',
    database: 'opendiscourse'
  });
  
  // Initialize orchestrator
  const orchestrator = new KnowledgeGraphOrchestrator(neo4j);
  
  // Test document
  const testDocument = {
    id: 'test-doc-1',
    content: 'Senator Smith introduced H.R. 1234, a bill to improve healthcare access. The 118th Congress has been actively discussing this legislation. Senator Johnson co-sponsored the bill, showing bipartisan support.',
    source: 'test',
    metadata: {
      date: '2023-01-01',
      type: 'bill'
    }
  };
  
  try {
    // Process the document
    console.log('Processing test document...');
    await orchestrator.processDocument(testDocument);
    console.log('Document processed successfully!');
    
    // Test querying
    console.log('Testing graph query...');
    const queryResult = await orchestrator.queryGraph(
      'MATCH (p:Politician) RETURN p.name LIMIT 5'
    );
    console.log('Query result:', queryResult);
    
    console.log('Agentic graph system test completed successfully!');
  } catch (error) {
    console.error('Error during agentic graph system test:', error);
  }
}

// Run the test
testAgenticGraph();