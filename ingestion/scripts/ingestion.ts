#!/usr/bin/env node

// Main ingestion script for govinfo.gov and congress.gov data
// This script orchestrates the entire data ingestion process

import { GovInfoIngestion } from "../govinfo/govinfo_ingestion";
import { GovInfoBulkDataProcessor } from "../govinfo/govinfo_bulkdata_processor";
import { CongressIngestion } from "../congress/congress_ingestion";
import { GenericFileParser } from "../generic_parsers/file_parser";
import { VectorizationService } from "../tools/vectorization_service";
import { DatabaseService } from "../tools/database_service";
import config from "../config/api_config.json";

// Load configuration
const govinfoConfig = config.govinfo;
const congressConfig = config.congress;

// Initialize services
const govinfoIngestion = new GovInfoIngestion(govinfoConfig);
const govinfoBulkDataProcessor = new GovInfoBulkDataProcessor(config);
const congressIngestion = new CongressIngestion(congressConfig);
const vectorizationService = new VectorizationService(
  config.ingestion.chunkSize,
);
// Database service would be initialized with D1 database in Cloudflare environment

async function ingestGovInfoData() {
  console.log("Starting govinfo.gov data ingestion...");

  try {
    // Ingest data for all configured collections
    await govinfoIngestion.ingestAllCollections(100); // Limit to 100 packages per collection for testing
    console.log("Finished govinfo.gov data ingestion");
  } catch (error) {
    console.error("Error during govinfo.gov data ingestion:", error);
  }
}

async function ingestGovInfoBulkData() {
  console.log("Starting govinfo.gov bulkdata ingestion...");

  try {
    // Process bulkdata for all collections
    const bulkConfig = config.autorag?.bulkDataProcessing || {};
    const limitPerCollection = bulkConfig.maxPackagesPerCollection || 100;

    await govinfoBulkDataProcessor.processAllCollectionsBulkData(
      limitPerCollection,
    );
    console.log("Finished govinfo.gov bulkdata ingestion");
  } catch (error) {
    console.error("Error during govinfo.gov bulkdata ingestion:", error);
  }
}

async function ingestCongressData() {
  console.log("Starting congress.gov data ingestion...");

  try {
    // Ingest bills
    await congressIngestion.ingestBills(100); // Limit to 100 bills for testing

    // Ingest members
    await congressIngestion.ingestMembers(50); // Limit to 50 members for testing

    // Ingest committees
    await congressIngestion.ingestCommittees(20); // Limit to 20 committees for testing

    console.log("Finished congress.gov data ingestion");
  } catch (error) {
    console.error("Error during congress.gov data ingestion:", error);
  }
}

async function processDocumentFile(filePath: string) {
  console.log(`Processing document file: ${filePath}`);

  try {
    // In a real implementation, we would read the file from disk or download it
    // For now, we'll simulate file processing

    // Simulate file content
    const fileName = filePath.split("/").pop() || "document.txt";
    const fileContent = `This is simulated content from ${fileName}. In a real implementation, we would read the actual file content and process it accordingly.`;

    // Parse the file
    // const parsedContent = await GenericFileParser.parseFile(fileBuffer, fileName);
    const parsedContent = fileContent; // Using simulated content

    // Process for vectorization
    await vectorizationService.processDocument(fileName, parsedContent, {
      source: "file",
      filePath: filePath,
    });

    console.log(`Finished processing document file: ${filePath}`);
  } catch (error) {
    console.error(`Error processing document file ${filePath}:`, error);
  }
}

async function main() {
  console.log("Starting OpenDiscourse data ingestion process...");

  // Process command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("No arguments provided. Running default ingestion process.");
    console.log(
      "Usage: node ingestion.js [govinfo|congress|bulkdata|file <path>|all]",
    );
    return;
  }

  const command = args[0];

  switch (command) {
    case "govinfo":
      await ingestGovInfoData();
      break;

    case "bulkdata":
      await ingestGovInfoBulkData();
      break;

    case "congress":
      await ingestCongressData();
      break;

    case "file":
      if (args.length < 2) {
        console.error("File path required for 'file' command");
        return;
      }
      await processDocumentFile(args[1]);
      break;

    case "all":
      await ingestGovInfoData();
      await ingestGovInfoBulkData();
      await ingestCongressData();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log(
        "Usage: node ingestion.js [govinfo|congress|bulkdata|file <path>|all]",
      );
  }

  console.log("Data ingestion process completed.");
}

// Run the main function
main().catch(console.error);
