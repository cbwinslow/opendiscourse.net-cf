#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { OptimizedGovInfoBulkDataProcessor } from '../govinfo/optimized_processor.js';
import config from '../config/api_config.json' assert { type: 'json' };

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const collections = args.length > 0 ? args[0].split(',') : [];
const year = args[1] ? parseInt(args[1], 10) : undefined;
const limit = args[2] ? parseInt(args[2], 10) : undefined;

async function main() {
  try {
    console.log('Starting optimized bulk data ingestion...');
    
    const processor = new OptimizedGovInfoBulkDataProcessor(config);
    
    if (collections.length > 0) {
      // Process specific collections
      for (const collection of collections) {
        console.log(`\n=== Processing collection: ${collection} ===`);
        await processor.processCollection(collection, year);
      }
    } else {
      // Process all collections
      console.log('\n=== Processing all available collections ===');
      await processor.processAllCollections(limit);
    }
    
    console.log('\n=== Ingestion completed successfully ===');
    
  } catch (error) {
    console.error('Error during ingestion:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
