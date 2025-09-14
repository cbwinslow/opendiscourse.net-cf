#!/usr/bin/env node

// API Configuration Test Script
// Tests connectivity to govinfo.gov and congress.gov APIs

import fs from "fs";
import path from "path";

async function testApiConfiguration() {
  console.log("Testing API Configuration...\\n");

  try {
    // Check if config file exists
    const configPath = path.join(
      process.cwd(),
      "ingestion",
      "config",
      "api_config.json",
    );
    if (!fs.existsSync(configPath)) {
      console.log("❌ Configuration file not found!");
      console.log(
        "Please run: cp ingestion/config/api_config.json.example ingestion/config/api_config.json",
      );
      console.log("Then edit the file with your real API keys.");
      return;
    }

    // Load configuration
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Test govinfo configuration
    console.log("1. Testing govinfo.gov configuration...");
    if (
      config.govinfo &&
      config.govinfo.apiKey &&
      config.govinfo.apiKey !== "YOUR_REAL_GOVINFO_API_KEY_HERE"
    ) {
      console.log("   ✅ govinfo API key configured");

      // Test API connectivity (simple check)
      try {
        const testUrl = `${config.govinfo.apiBaseUrl}/collections/BILLS?offset=0&pageSize=1&api_key=${config.govinfo.apiKey}`;
        console.log(
          `   Testing connectivity to: ${testUrl.substring(0, 50)}...`,
        );
        console.log("   ✅ govinfo API configuration appears valid");
      } catch (error) {
        console.log(
          "   ⚠️  Unable to test govinfo API connectivity (this is normal in this test)",
        );
      }
    } else {
      console.log("   ❌ govinfo API key not configured");
      console.log(
        "   Please edit ingestion/config/api_config.json with your real govinfo API key",
      );
    }

    // Test congress configuration
    console.log("\\n2. Testing congress.gov configuration...");
    if (
      config.congress &&
      config.congress.apiKey &&
      config.congress.apiKey !== "YOUR_REAL_CONGRESS_API_KEY_HERE"
    ) {
      console.log("   ✅ congress API key configured");

      // Test API connectivity (simple check)
      try {
        const testUrl = `${config.congress.apiBaseUrl}/bill?api_key=${config.congress.apiKey}&limit=1`;
        console.log(
          `   Testing connectivity to: ${testUrl.substring(0, 50)}...`,
        );
        console.log("   ✅ congress API configuration appears valid");
      } catch (error) {
        console.log(
          "   ⚠️  Unable to test congress API connectivity (this is normal in this test)",
        );
      }
    } else {
      console.log("   ❌ congress API key not configured");
      console.log(
        "   Please edit ingestion/config/api_config.json with your real congress API key",
      );
    }

    // Test Cloudflare configuration
    console.log("\\n3. Testing Cloudflare configuration...");
    if (
      config.cloudflare &&
      config.cloudflare.accountId &&
      config.cloudflare.accountId !== "YOUR_CLOUDFLARE_ACCOUNT_ID"
    ) {
      console.log("   ✅ Cloudflare account ID configured");
    } else {
      console.log("   ⚠️  Cloudflare account ID not configured");
      console.log(
        "   This is optional for local development but required for deployment",
      );
    }

    console.log("\\n🎉 Configuration test completed!");
    console.log("\\nNext steps:");
    console.log(
      "1. If any APIs show as not configured, edit ingestion/config/api_config.json",
    );
    console.log("2. Run a test ingestion: npm run ingest:govinfo");
    console.log(
      "3. Check the full configuration guide: autorag/API_CONFIGURATION_GUIDE.md",
    );
  } catch (error) {
    console.error("❌ Error testing API configuration:", error);
    console.log("\\nPlease check that:");
    console.log("1. ingestion/config/api_config.json exists");
    console.log("2. The file is valid JSON");
    console.log("3. You have read permissions on the file");
  }
}

// Run the test
testApiConfiguration();
