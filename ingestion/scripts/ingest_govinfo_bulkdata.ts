import { GovInfoBulkDataProcessor } from '../govinfo/govinfo_bulkdata_processor';
import { config } from 'dotenv';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
// Load environment variables
config();

// Use process.cwd() for directory resolution
const DATA_DIR = join(process.cwd(), 'data');

// Configuration
const CONFIG = {
  govinfo: {
    bulkDataUrl: process.env.GOVINFO_BULKDATA_URL || 'https://www.govinfo.gov/bulkdata',
    collections: [
      'BILLS', 'PLAW', 'STATUTE', 'FR', 'CFR', 'USCODE',
      'CREC', 'CHRG', 'ECONI', 'CDIR', 'CDOC', 'CPRT'
    ],
    downloadDir: join(DATA_DIR, 'govinfo', 'bulkdata'),
    maxConcurrentDownloads: 5,
    retryAttempts: 3,
    retryDelay: 5000 // 5 seconds
  },
  database: {
    // Add your database configuration here if needed
  }
};

// Ensure download directory exists
function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Main function to run the ingestion
async function main() {
  console.log('Starting GovInfo bulk data ingestion...');
  
  // Ensure download directory exists
  ensureDirectoryExists(CONFIG.govinfo.downloadDir);
  
  // Initialize the processor
  const processor = new GovInfoBulkDataProcessor(CONFIG);
  
  try {
    // Get available collections
    const collections = await processor.getAvailableCollections();
    console.log(`Available collections: ${collections.join(', ')}`);
    
    // Process each collection
    for (const collection of collections) {
      console.log(`\nProcessing collection: ${collection}`);
      
      try {
        // List all bulk data files for this collection
        const files = await processor.listBulkDataFiles(collection);
        console.log(`Found ${files.length} files in collection ${collection}`);
        
        // Process each file
        for (const file of files) {
          try {
            console.log(`Processing file: ${file.title} (${file.mimeType})`);
            
            // Download and process the file
            const result = await processor.processBulkDataFile(file);
            console.log(`Processed file: ${result.fileName}`);
            
            // TODO: Store the result in the database
            // await storeInDatabase(result);
            
          } catch (fileError) {
            console.error(`Error processing file ${file.downloadUrl}:`, fileError);
            // Continue with the next file even if one fails
            continue;
          }
        }
      } catch (collectionError) {
        console.error(`Error processing collection ${collection}:`, collectionError);
        // Continue with the next collection even if one fails
        continue;
      }
    }
    
    console.log('\nBulk data ingestion completed successfully!');
    
  } catch (error) {
    console.error('Fatal error during bulk data ingestion:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
