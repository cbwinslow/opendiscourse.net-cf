import { GovInfoBulkDataProcessor } from "../govinfo/govinfo_bulkdata_processor";
import { config } from "dotenv";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
// Load environment variables
config();

// Use process.cwd() for directory resolution
const DATA_DIR = join(process.cwd(), "data");

// Configuration
const CONFIG = {
  govinfo: {
    bulkDataUrl:
      process.env.GOVINFO_BULKDATA_URL || "https://www.govinfo.gov/bulkdata",
    collections: [
      "BILLS",
      "PLAW",
      "STATUTE",
      "FR",
      "CFR",
      "USCODE",
      "CREC",
      "CHRG",
      "ECONI",
      "CDIR",
      "CDOC",
      "CPRT",
    ],
    downloadDir: join(DATA_DIR, "govinfo", "bulkdata"),
    maxConcurrentDownloads: 5,
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
  },
  database: {
    // Add your database configuration here if needed
  },
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
  console.log("DEBUG: Starting GovInfo bulk data ingestion...");

  // Ensure download directory exists
  ensureDirectoryExists(CONFIG.govinfo.downloadDir);
  console.log("DEBUG: Download directory exists.");

  // Initialize the processor
  const processor = new GovInfoBulkDataProcessor(CONFIG);
  console.log("DEBUG: GovInfoBulkDataProcessor initialized.");

  try {
    // Get available collections
    console.log("DEBUG: Getting available collections...");
    const collections = await processor.getAvailableCollections();
    console.log(`DEBUG: Available collections: ${collections.join(", ")}`);

    // Process each collection
    for (const collection of collections) {
      console.log(`\nDEBUG: Processing collection: ${collection}`);

      try {
        // List all bulk data files for this collection
        console.log(
          `DEBUG: Listing bulk data files for collection ${collection}...`,
        );
        const files = await processor.listBulkDataFiles(collection);
        console.log(
          `DEBUG: Found ${files.length} files in collection ${collection}`,
        );

        // Process each file
        for (const file of files) {
          try {
            console.log(`Processing file: ${file.title} (${file.mimeType})`);

            // Download and process the file
            console.log(
              `DEBUG: Processing file: ${file.title} (${file.mimeType})...`,
            );
            const result = await processor.processBulkDataFile(file);
            console.log(`DEBUG: Processed file: ${result.fileName}`);

            // TODO: Store the result in the database
            console.log(
              `DEBUG: File ${result.fileName} processed and ready to be stored in the database.`,
            );
            // await storeInDatabase(result);

          } catch (fileError) {console.error(
              `Error processing file ${file.downloadUrl}:`,
              fileError,
            );
            // Continue with the next file even if one fails
            continue;
          }
        }
      } catch (collectionError) {console.error(
          `Error processing collection ${collection}:`,
          collectionError,
        );
        // Continue with the next collection even if one fails
        continue;
      }
    }

    console.log("DEBUG: Bulk data ingestion completed successfully!");

  } catch (error) {console.error("DEBUG: Fatal error during bulk data ingestion:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
