#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { GovInfoBulkDataProcessor } from '../govinfo/govinfo_bulkdata_processor.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a file or directory path to process');
  process.exit(1);
}

const pathToProcess = resolve(process.cwd(), args[0]);

async function main() {
  try {
    const processor = new GovInfoBulkDataProcessor();
    
    // Check if path exists
    if (!fs.existsSync(pathToProcess)) {
      console.error(`Path does not exist: ${pathToProcess}`);
      process.exit(1);
    }

    // Get file stats
    const stats = fs.statSync(pathToProcess);
    
    if (stats.isFile()) {
      console.log(`Processing file: ${pathToProcess}`);
      const result = await processor.processFile(pathToProcess);
      console.log('Processing result:', result);
    } else if (stats.isDirectory()) {
      console.log(`Processing directory: ${pathToProcess}`);
      const files = fs.readdirSync(pathToProcess);
      
      for (const file of files) {
        const filePath = resolve(pathToProcess, file);
        try {
          const fileStat = fs.statSync(filePath);
          if (fileStat.isFile()) {
            console.log(`\nProcessing file: ${filePath}`);
            const result = await processor.processFile(filePath);
            console.log('Result:', result);
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
        }
      }
    } else {
      console.error('Path is neither a file nor a directory');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
