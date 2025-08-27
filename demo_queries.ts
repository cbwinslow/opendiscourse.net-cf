#!/usr/bin/env node

// Data Query Demonstration Script
// This script shows how to query the ingested political data

console.log("=========================================");
console.log("OpenDiscourse Data Query Demo");
console.log("=========================================\n");

// Mock query functions to simulate database queries
async function queryBills(searchTerm) {
  console.log(`Searching for bills containing: "${searchTerm}"`);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulated results
  return [
    {
      billId: "hr1234-118",
      title: "American Data Privacy Act of 2025",
      congress: 118,
      type: "hr",
      number: 1234,
      introducedDate: "2025-03-15",
      sponsor: "Rep. Jane Smith (D-CA)",
      cosponsors: 42,
      committees: ["Energy and Commerce", "Judiciary"],
      latestAction: "Ordered to be Reported by the Yeas and Nays: 21 - 15.",
      relevance: 0.95
    },
    {
      billId: "s567-118",
      title: "Digital Privacy Protection Act",
      congress: 118,
      type: "s",
      number: 567,
      introducedDate: "2025-02-10",
      sponsor: "Sen. John Doe (R-TX)",
      cosponsors: 28,
      committees: ["Commerce, Science, and Transportation"],
      latestAction: "Placed on Senate Legislative Calendar under General Orders. Calendar No. 45.",
      relevance: 0.87
    }
  ];
}

async function queryMembers(searchTerm) {
  console.log(`Searching for members containing: "${searchTerm}"`);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Simulated results
  return [
    {
      memberId: "S001234",
      name: "Rep. Jane Smith",
      state: "CA",
      party: "D",
      chamber: "House",
      district: 12,
      committees: ["Energy and Commerce", "Judiciary"],
      relevance: 0.98
    },
    {
      memberId: "D000123",
      name: "Sen. John Doe",
      state: "TX",
      party: "R",
      chamber: "Senate",
      committees: ["Commerce, Science, and Transportation"],
      relevance: 0.85
    }
  ];
}

async function semanticSearch(query) {
  console.log(`Performing semantic search for: "${query}"`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulated semantic search results
  return [
    {
      documentId: "hr1234-118_sec3",
      title: "American Data Privacy Act of 2025 - Section 3",
      content: "Consumers shall have the right to obtain confirmation as to whether or not personal data concerning them is being processed...",
      similarity: 0.92,
      source: "Bill Text"
    },
    {
      documentId: "crpt-118hrpt123",
      title: "House Report 118-123 on HR 1234",
      content: "The committee recognizes the importance of protecting consumer privacy in the digital age...",
      similarity: 0.87,
      source: "Committee Report"
    },
    {
      documentId: "crec-2025-03-20-pgS1234",
      title: "Congressional Record - Senate Debate on HR 1234",
      content: "Mr. Chairman, I rise today to speak in support of this important privacy legislation...",
      similarity: 0.81,
      source: "Congressional Record"
    }
  ];
}

async function queryGraph(entity) {
  console.log(`Querying knowledge graph for entity: "${entity}"`);
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // Simulated graph query results
  if (entity.toLowerCase().includes("privacy")) {
    return {
      entity: "Data Privacy",
      relatedEntities: [
        { name: "Consumer Rights", relationship: "INCLUDES", strength: 0.95 },
        { name: "Personal Data", relationship: "INVOLVES", strength: 0.92 },
        { name: "Data Controllers", relationship: "REGULATES", strength: 0.88 },
        { name: "Federal Trade Commission", relationship: "OVERSEES", strength: 0.85 },
        { name: "California Consumer Privacy Act", relationship: "RELATES_TO", strength: 0.82 }
      ],
      centrality: 0.91
    };
  } else {
    return {
      entity: entity,
      relatedEntities: [
        { name: "Congress", relationship: "PART_OF", strength: 0.85 },
        { name: "Legislation", relationship: "INVOLVED_IN", strength: 0.78 },
        { name: "Committee", relationship: "ASSIGNED_TO", strength: 0.75 }
      ],
      centrality: 0.65
    };
  }
}

async function askQuestion(question) {
  console.log(`Answering question: "${question}"`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulated RAG response
  if (question.toLowerCase().includes("privacy")) {
    return {
      answer: "Based on the analyzed documents, the American Data Privacy Act of 2025 establishes a comprehensive consumer data privacy framework. It grants consumers rights with respect to their personal data, including the rights to access, delete, correct, and port their data. The bill also imposes obligations on data controllers and processors, including requirements to obtain consumer consent, implement reasonable security measures, and conduct data protection assessments.",
      confidence: 0.93,
      citations: [
        "American Data Privacy Act of 2025, Section 3",
        "House Report 118-123 on HR 1234",
        "Congressional Record, March 18, 2025, Pg. H1234"
      ]
    };
  } else {
    return {
      answer: "Based on the available documents, this appears to be related to legislative processes in Congress. The documents show various bills, committee reports, and congressional records that discuss legislative activities.",
      confidence: 0.75,
      citations: [
        "Various congressional documents",
        "Committee reports",
        "Congressional records"
      ]
    };
  }
}

async function runQueries() {
  try {
    // Example 1: Keyword search for bills
    console.log("--- Keyword Search for Bills ---");
    const bills = await queryBills("privacy");
    console.log(`Found ${bills.length} bills:`);
    bills.forEach((bill, index) => {
      console.log(`${index + 1}. ${bill.title} (${bill.billId})`);
      console.log(`   Sponsor: ${bill.sponsor}`);
      console.log(`   Committees: ${bill.committees.join(", ")}`);
      console.log(`   Latest Action: ${bill.latestAction}\n`);
    });
    
    // Example 2: Keyword search for members
    console.log("--- Keyword Search for Members ---");
    const members = await queryMembers("smith");
    console.log(`Found ${members.length} members:`);
    members.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name} (${member.party}-${member.state})`);
      console.log(`   Chamber: ${member.chamber}`);
      console.log(`   Committees: ${member.committees.join(", ")}\n`);
    });
    
    // Example 3: Semantic search
    console.log("--- Semantic Search ---");
    const semanticResults = await semanticSearch("consumer data protection");
    console.log(`Found ${semanticResults.length} semantically relevant documents:`);
    semanticResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   Preview: ${result.content.substring(0, 100)}...\n`);
    });
    
    // Example 4: Graph query
    console.log("--- Knowledge Graph Query ---");
    const graphResult = await queryGraph("Data Privacy");
    console.log(`Entity: ${graphResult.entity}`);
    console.log(`Centrality Score: ${(graphResult.centrality * 100).toFixed(1)}%`);
    console.log("Related Entities:");
    graphResult.relatedEntities.forEach((rel, index) => {
      console.log(`  ${index + 1}. ${rel.name} - ${rel.relationship} (${(rel.strength * 100).toFixed(1)}%)`);
    });
    console.log("");
    
    // Example 5: Question answering
    console.log("--- Question Answering ---");
    const question = "What are the key provisions of the privacy bill?";
    const ragResult = await askQuestion(question);
    console.log(`Question: ${question}`);
    console.log(`Answer: ${ragResult.answer}`);
    console.log(`Confidence: ${(ragResult.confidence * 100).toFixed(1)}%`);
    console.log("Citations:");
    ragResult.citations.forEach((citation, index) => {
      console.log(`  ${index + 1}. ${citation}`);
    });
    console.log("");
    
    console.log("=========================================");
    console.log("Query Demo Completed Successfully!");
    console.log("=========================================");
    
  } catch (error) {
    console.error("Error during query demo:", error);
    process.exit(1);
  }
}

// Run the query demo
runQueries();