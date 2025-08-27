#!/usr/bin/env node

// API Configuration Test Script
// Tests connectivity to govinfo.gov and congress.gov APIs

console.log("Testing API Configuration...\n");

async function testApiConnectivity() {
  try {
    // Load configuration
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'ingestion', 'config', 'api_config.json');
    
    if (!fs.existsSync(configPath)) {
      console.log("❌ Configuration file not found!");
      console.log("Please run: cp ingestion/config/api_config.json.example ingestion/config/api_config.json");
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Test govinfo API key
    console.log("1. Testing govinfo.gov API key...");
    if (config.govinfo && config.govinfo.apiKey && config.govinfo.apiKey !== "YOUR_REAL_GOVINFO_API_KEY_HERE") {
      try {
        const response = await fetch(`https://api.govinfo.gov/collections?api_key=${config.govinfo.apiKey}`);
        if (response.ok) {
          console.log("   ✅ govinfo.gov API key is valid and working");
        } else {
          console.log("   ⚠️  govinfo.gov API key response:", response.status, response.statusText);
        }
      } catch (error) {
        console.log("   ⚠️  Unable to test govinfo.gov API connectivity:", error.message);
      }
    } else {
      console.log("   ❌ govinfo.gov API key not properly configured");
    }
    
    // Test congress API key
    console.log("\n2. Testing congress.gov API key...");
    if (config.congress && config.congress.apiKey && config.congress.apiKey !== "YOUR_REAL_CONGRESS_API_KEY_HERE") {
      try {
        const response = await fetch(`https://api.congress.gov/v3/bill?api_key=${config.congress.apiKey}&limit=1`);
        if (response.ok) {
          console.log("   ✅ congress.gov API key is valid and working");
        } else {
          console.log("   ⚠️  congress.gov API key response:", response.status, response.statusText);
        }
      } catch (error) {
        console.log("   ⚠️  Unable to test congress.gov API connectivity:", error.message);
      }
    } else {
      console.log("   ❌ congress.gov API key not properly configured");
    }
    
    console.log("\n✅ API configuration test completed!");
    console.log("\nNext steps:");
    console.log("1. Set up your Cloudflare resources (D1, R2, Vectorize)");
    console.log("2. Run database migrations with 'npm run migrate'");
    console.log("3. Deploy with 'npm run deploy'");
    console.log("4. Start ingesting data with 'npm run ingest:all'");
    
  } catch (error) {
    console.error("❌ Error testing API configuration:", error);
  }
}

// Run the test
testApiConnectivity();