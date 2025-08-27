#!/usr/bin/env node

// Test script for AutoRAG functionality
// This script tests the core components of the AutoRAG system

import { AutoRAGService } from '../services/rag/auto_rag_service';

async function testAutoRAG() {
  console.log("Testing AutoRAG functionality...");
  
  // Mock environment for testing
  const mockEnv = {
    // In a real implementation, these would be actual Cloudflare bindings
    VECTOR_INDEX: {},
    AI: {
      run: async (model: string, inputs: any) => {
        // Mock AI response
        return {
          data: [Array(1024).fill(0).map(() => Math.random())]
        };
      }
    }
  };
  
  // Mock configuration
  const mockConfig = {
    autorag: {
      embeddingModel: "@cf/baai/bge-large-en-v1.5",
      embeddingDimension: 1024,
      vectorSimilarityThreshold: 0.7
    }
  };
  
  try {
    // Initialize AutoRAG service
    const autoRAGService = new AutoRAGService(mockEnv, mockConfig);
    
    // Test 1: Generate embedding
    console.log("\n1. Testing embedding generation...");
    const testText = "This is a test document about government policies and political discourse.";
    const embedding = await autoRAGService.generateEmbedding(testText);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    
    // Test 2: Store embedding (simulated)
    console.log("\n2. Testing embedding storage...");
    await autoRAGService.storeEmbedding("test-doc-1", 0, testText, {
      title: "Test Document",
      source: "govinfo",
      collection: "BILLS"
    });
    console.log("✅ Simulated embedding storage");
    
    // Test 3: Semantic search (simulated)
    console.log("\n3. Testing semantic search...");
    const searchResults = await autoRAGService.semanticSearch({
      text: "government policies",
      topK: 5,
      threshold: 0.7
    });
    console.log(`✅ Semantic search returned ${searchResults.length} results`);
    
    // Test 4: Hybrid search (simulated)
    console.log("\n4. Testing hybrid search...");
    const hybridResults = await autoRAGService.hybridSearch({
      text: "political discourse",
      topK: 3
    });
    console.log(`✅ Hybrid search returned ${hybridResults.length} results`);
    
    // Test 5: Context assembly
    console.log("\n5. Testing context assembly...");
    const context = await autoRAGService.assembleContext("What does this say about government policies?");
    console.log("✅ Context assembled successfully");
    console.log(`Context length: ${context.length} characters`);
    
    console.log("\n🎉 All AutoRAG tests passed!");
    console.log("\nNext steps:");
    console.log("1. Configure your govinfo API key in ingestion/config/api_config.json");
    console.log("2. Set up your Cloudflare resources (D1, R2, Vectorize)");
    console.log("3. Run database migrations with 'npm run migrate'");
    console.log("4. Deploy with 'npm run deploy'");
    console.log("5. Start ingesting data with 'npm run ingest:bulkdata'");
    
  } catch (error) {
    console.error("❌ Error testing AutoRAG:", error);
    process.exitCode = 1;
  }
}

async function main() {
  await testAutoRAG();
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

export { testAutoRAG };