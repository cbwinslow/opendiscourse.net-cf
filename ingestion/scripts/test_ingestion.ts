#!/usr/bin/env node

// Test script for the ingestion system

import { GenericFileParser } from '../generic_parsers/file_parser';
import { VectorizationService } from '../tools/vectorization_service';

async function testFileParsing() {
  console.log("Testing file parsing...");
  
  // Test text parsing
  const textContent = "This is a sample text document for testing the file parser. It contains multiple sentences to test chunking functionality.";
  const parsedText = await GenericFileParser.parseText(textContent);
  console.log("Parsed text:", parsedText);
  
  // Test chunking
  const vectorService = new VectorizationService(10, 2); // Small chunks for testing
  const chunks = vectorService.chunkText(textContent, "test-doc-1", { 
    title: "Test Document",
    source: "test"
  });
  
  console.log(`Created ${chunks.length} chunks:`);
  chunks.forEach((chunk: any, index: number) => {
    console.log(`Chunk ${index}: ${chunk.content}`);
  });
  
  console.log("File parsing test completed successfully!");
}

// Run the test
testFileParsing().catch(console.error);