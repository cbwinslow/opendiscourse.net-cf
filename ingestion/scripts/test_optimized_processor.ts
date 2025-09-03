#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { OptimizedGovInfoBulkDataProcessor } from '../govinfo/optimized_processor.js';
import config from '../config/api_config.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testProcessor() {
  console.log('Testing OptimizedGovInfoBulkDataProcessor...');
  
  try {
    const processor = new OptimizedGovInfoBulkDataProcessor(config);
    
    // Test with a small collection first (e.g., 'BILLS' for current year)
    const testCollection = 'BILLS';
    const testYear = new Date().getFullYear();
    
    console.log(`\n=== Testing with collection: ${testCollection}, year: ${testYear} ===`);
    
    // Test listing files
    console.log('\nListing available files...');
    const files = await processor.listBulkDataFiles(testCollection, testYear);
    console.log(`Found ${files.length} files`);
    
    if (files.length > 0) {
      // Test processing a single file
      const testFile = files[0];
      console.log(`\nTesting file processing for: ${testFile.downloadUrl}`);
      const result = await processor.processFile(testFile.downloadUrl);
      
      if (result) {
        console.log('File processed successfully!');
        console.log(`File: ${result.fileName}`);
        console.log(`Size: ${result.size} bytes`);
        console.log(`MIME Type: ${result.mimeType}`);
        console.log('First 200 chars of content:');
        console.log('---');
        console.log(result.content.substring(0, 200) + '...');
        console.log('---');
      }
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testProcessor().catch(console.error);
