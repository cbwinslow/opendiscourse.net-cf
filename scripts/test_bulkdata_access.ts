#!/usr/bin/env node

// Test script for govinfo.gov bulkdata access
// This script tests connectivity to govinfo.gov bulkdata

console.log("Testing govinfo.gov bulkdata access...\n");

async function testBulkDataAccess() {
  try {
    // Test bulkdata base URL
    console.log("1. Testing bulkdata base URL...");
    const response1 = await fetch("https://www.govinfo.gov/bulkdata");
    console.log(`   Status: ${response1.status} ${response1.statusText}`);

    if (response1.ok) {
      console.log("   ✅ Bulkdata base URL is accessible");
    } else {
      console.log("   ❌ Bulkdata base URL is not accessible");
    }

    // Test BILLS collection
    console.log("\n2. Testing BILLS collection...");
    const response2 = await fetch("https://www.govinfo.gov/bulkdata/BILLS");
    console.log(`   Status: ${response2.status} ${response2.statusText}`);

    if (response2.ok) {
      console.log("   ✅ BILLS collection is accessible");
    } else {
      console.log("   ❌ BILLS collection is not accessible");
    }

    console.log("\n🎉 Bulkdata access test completed!");
    console.log("\nNext steps:");
    console.log("1. Configure your Cloudflare resources");
    console.log("2. Run database migrations with 'npm run migrate'");
    console.log("3. Deploy with 'npm run deploy'");
    console.log("4. Start ingesting data with 'npm run ingest:bulkdata'");
  } catch (error) {
    console.error("❌ Error testing bulkdata access:", error);
  }
}

// Run the test
testBulkDataAccess();
