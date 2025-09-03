#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { EnhancedGovInfoProcessor } from '../services/enhanced_processor.js';
import config from '../config/api_config.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testEnhancedProcessor() {
  console.log('Testing EnhancedGovInfoProcessor with document processing...');
  
  const processor = new EnhancedGovInfoProcessor({
    ...config,
    // Add OpenAI API key if available for better embeddings
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    },
    ingestion: {
      ...config.ingestion,
      useOpenAIEmbeddings: !!process.env.OPENAI_API_KEY
    }
  });

  try {
    // Test with a small collection first
    const testCollection = 'BILLS';
    const testYear = new Date().getFullYear();
    
    console.log(`\n=== Testing with collection: ${testCollection}, year: ${testYear} ===`);
    
    // List available files
    console.log('\nListing available files...');
    const files = await processor.listBulkDataFiles(testCollection, testYear);
    console.log(`Found ${files.length} files`);
    
    if (files.length > 0) {
      // Process a single file with document processing
      const testFile = files[0];
      console.log(`\nTesting enhanced processing for: ${testFile.downloadUrl}`);
      
      const result = await processor.processFile(testFile.downloadUrl);
      
      if (result) {
        console.log('\nDocument processed successfully!');
        console.log(`File: ${result.fileName}`);
        console.log(`Size: ${result.size} bytes`);
        console.log(`Processed into ${result.chunks} chunks`);
        
        // Get the processed chunks
        const chunks = await processor.getProcessedChunks(result.fileName);
        if (chunks && chunks.length > 0) {
          console.log('\nSample chunk (first 100 chars):');
          console.log('---');
          console.log(chunks[0].content.substring(0, 100) + '...');
          console.log('---');
          
          console.log('\nEntities found in first chunk:');
          console.log(chunks[0].metadata.entities || 'None');
          
          console.log('\nSentiment analysis:');
          console.log(chunks[0].metadata.sentiment);
          
          // Test search
          console.log('\nTesting search...');
          const searchTerm = 'appropriations';
          console.log(`Searching for: "${searchTerm}"`);
          
          const searchResults = await processor.searchDocuments(searchTerm, 3);
          console.log(`\nTop ${searchResults.length} results:`);
          
          searchResults.forEach((result, i) => {
            console.log(`\n${i + 1}. Score: ${result.score.toFixed(4)}`);
            console.log('---');
            console.log(result.chunk.content.substring(0, 200) + '...');
          });
        }
      }
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await processor.close();
  }
}

testEnhancedProcessor().catch(console.error);
