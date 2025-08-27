# OpenDiscourse Agentic Knowledge Graph System

## Overview
The Agentic Knowledge Graph System is a comprehensive framework for analyzing political documents and building a knowledge graph of political entities, relationships, and insights. This system uses advanced NLP techniques, including BERT-based models, to extract entities, relationships, and perform various analyses on political documents.

## Features
- **Entity Extraction**: Identify politicians, legislation, organizations, and government bodies
- **Relationship Extraction**: Discover connections between political entities
- **Political Bias Detection**: Analyze ideological positioning and bias in documents
- **Fact-Checking**: Evaluate the truthfulness of claims in political documents
- **Hate Speech Detection**: Identify discriminatory language and hate speech
- **Sentiment Analysis**: Analyze political sentiment and opinions
- **Politician Profiling**: Build comprehensive profiles of politicians based on their actions and statements
- **Knowledge Graph**: Store and query relationships using Neo4j

## Architecture
The system is built around several key components:

### 1. Neo4j Integration
- Connection utilities for Neo4j database
- Graph schema definition for political entities
- CRUD operations for graph nodes and relationships

### 2. Analysis Models
- **EntityExtractor**: BERT-based Named Entity Recognition
- **PoliticalAnalyzer**: Bias detection, sentiment analysis, fact-checking, and hate speech detection
- **RelationshipExtractor**: Entity relationship identification

### 3. Agents
- **AnalysisAgent**: Coordinates document analysis through all models
- **PoliticianProfilerAgent**: Builds and updates politician profiles
- **InferenceAgent**: Discovers new relationships through graph inference

### 4. Orchestrator
- Main coordinator for the entire analysis pipeline
- Manages agent interactions and workflow
- Provides high-level APIs for document processing and querying

## Installation
```bash
npm install
```

## Usage
```typescript
import { Neo4jConnection } from './neo4j/neo4j_connection';
import { KnowledgeGraphOrchestrator } from './orchestrator';

// Initialize Neo4j connection
const neo4j = new Neo4jConnection({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  database: 'opendiscourse'
});

await neo4j.initialize();

// Initialize orchestrator
const orchestrator = new KnowledgeGraphOrchestrator(neo4j);

// Process a document
const document = {
  id: 'doc-123',
  content: 'Sample political document content...',
  source: 'congress.gov',
  metadata: {
    date: '2023-01-01',
    type: 'bill'
  }
};

await orchestrator.processDocument(document);

// Query the knowledge graph
const results = await orchestrator.queryGraph(
  'MATCH (p:Politician)-[:SPONSORS]->(l:Legislation) RETURN p.name, l.title'
);
```

## Directory Structure
```
agentic_graph/
├── agents/                 # Agent implementations
├── models/                 # NLP models and analysis tools
├── neo4j/                  # Neo4j integration and schema
├── utils/                  # Utility functions
├── config/                 # Configuration files
├── orchestrator.ts         # Main orchestrator
├── METHODOLOGY.md          # Research methodology
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Research Methodology
The system is based on comprehensive research in NLP for political analysis. See [METHODOLOGY.md](METHODOLOGY.md) for detailed information on the academic sources and methodologies used.

## Contributing
Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License
MIT