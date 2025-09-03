#!/usr/bin/env node

// Sample data ingestion script for OpenDiscourse
// This script demonstrates how to ingest sample political data

import { DatabaseService } from "../ingestion/tools/database_service";
import { VectorizationService } from "../ingestion/tools/vectorization_service";
import { GenericFileParser } from "../ingestion/generic_parsers/file_parser";

// Mock D1 database for demonstration
class MockD1Database {
  constructor() {}

  prepare(query) {
    return {
      bind: (...args) => {
        return {
          run: async () => {
            console.log(
              `Executed query: ${query.substring(0, 50)}... with ${args.length} parameters`,
            );
            return { success: true };
          },
        };
      },
    };
  }
}

// Sample data
const sampleBill = {
  billId: "hr1234-118",
  title: "American Data Privacy Act of 2025",
  congress: 118,
  type: "hr",
  number: 1234,
  introducedDate: "2025-03-15",
  sponsor: {
    title: "Rep.",
    name: "Jane Smith",
    state: "CA",
    party: "D",
  },
  cosponsorsCount: 42,
  committees: ["Energy and Commerce", "Judiciary"],
  latestAction: {
    actionDate: "2025-04-02",
    text: "Ordered to be Reported by the Yeas and Nays: 21 - 15.",
  },
  xmlUrl: "https://www.congress.gov/bill/118th-congress/house-bill/1234",
  pdfUrl:
    "https://www.congress.gov/bill/118th-congress/house-bill/1234/text/pdf",
};

const sampleMember = {
  memberId: "S001234",
  firstName: "Alex",
  lastName: "Johnson",
  fullName: "Alex Johnson",
  state: "CA",
  party: "D",
  chamber: "House",
  district: 12,
  startDate: "2023-01-03",
  endDate: null,
  phone: "(202) 225-1234",
  fax: "(202) 225-5678",
  website: "https://johnson.house.gov",
};

const sampleCommittee = {
  committeeId: "HSBA",
  name: "House Committee on Financial Services",
  chamber: "House",
  parentCommitteeId: null,
};

const sampleBillSubjects = [
  { name: "Administrative law and regulatory procedures" },
  { name: "Civil actions and liability" },
  { name: "Computer security and identity theft" },
  { name: "Consumer affairs" },
  { name: "Data privacy and security" },
];

const sampleBillSummaries = [
  {
    version: "Introduced in House",
    actionDate: "2025-03-15",
    actionDesc: "Introduced in House",
    text: "This bill establishes a comprehensive consumer data privacy framework. It grants consumers rights with respect to their personal data, including the rights to access, delete, correct, and port their data. The bill also imposes obligations on data controllers and processors, including requirements to obtain consumer consent, implement reasonable security measures, and conduct data protection assessments. Civil penalties for violations range from $2,500 to $7,500 per violation. Consumers may bring civil actions against data controllers for certain violations.",
  },
];

const sampleBillActions = [
  {
    actionDate: "2025-03-15",
    actionType: "Intro-H",
    actionName: "Introduced in House",
    actionStage: "Intro",
    text: "Introduced in House",
  },
  {
    actionDate: "2025-03-16",
    actionType: "BecameLaw",
    actionName: "Referred to Committee",
    actionStage: "Committee",
    text: "Referred to the House Energy and Commerce Committee and in addition to the Committees on the Judiciary, Ways and Means, and Financial Services for a period to be subsequently determined by the Speaker, in each case for consideration of such provisions as fall within the jurisdiction of the committee concerned.",
  },
];

const sampleBillCosponsors = [
  {
    name: "John Johnson",
    state: "NY",
    party: "D",
    date: "2025-03-18",
  },
  {
    name: "Sarah Williams",
    state: "TX",
    party: "R",
    date: "2025-03-22",
  },
];

async function ingestSampleData() {
  console.log("Starting sample data ingestion...");

  // Initialize mock database
  const mockDb = new MockD1Database();
  const dbService = new DatabaseService(mockDb);
  const vectorService = new VectorizationService(1000, 100);

  try {
    // Ingest sample bill
    console.log("\n--- Ingesting Sample Bill ---");
    const billData = {
      ...sampleBill,
      subjects: sampleBillSubjects,
      summaries: sampleBillSummaries,
      actions: sampleBillActions,
      cosponsors: sampleBillCosponsors,
    };

    await dbService.storeCongressBill(billData);
    console.log("✓ Sample bill ingested successfully");

    // Ingest sample member
    console.log("\n--- Ingesting Sample Member ---");
    await dbService.storeCongressMember(sampleMember);
    console.log("✓ Sample member ingested successfully");

    // Ingest sample committee
    console.log("\n--- Ingesting Sample Committee ---");
    await dbService.storeCongressCommittee(sampleCommittee);
    console.log("✓ Sample committee ingested successfully");

    // Process bill content for vectorization
    console.log("\n--- Processing Bill Content for Vectorization ---");
    if (sampleBillSummaries.length > 0) {
      const billText = sampleBillSummaries[0].text;
      await vectorService.processDocument(sampleBill.billId, billText, {
        source: "congress",
        type: "bill",
        congress: sampleBill.congress,
        billType: sampleBill.type,
        billNumber: sampleBill.number,
      });
      console.log("✓ Bill content processed for vectorization");
    }

    console.log("\n--- Sample Data Ingestion Complete ---");
    console.log("✓ All sample data has been successfully ingested");
    console.log("✓ Database records created");
    console.log("✓ Content processed for vectorization");
  } catch (error) {
    console.error("Error during sample data ingestion:", error);
  }
}

// Run the ingestion
ingestSampleData().catch(console.error);
