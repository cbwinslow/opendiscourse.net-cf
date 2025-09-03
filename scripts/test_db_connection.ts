import { Database } from "../services/database";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testConnection() {
  console.log("Testing database connection...");

  const db = new Database(process.env.DATABASE_URL || "");

  try {
    // Test connection
    await db.connect();
    console.log("✅ Database connection successful");

    // Test a simple query
    const result = await db.query("SELECT NOW() as current_time");
    console.log("✅ Database query successful");
    console.log("Current database time:", result.rows[0].current_time);

    // Test transaction
    await db.transaction([
      { text: "SELECT 1 as test_value" },
      { text: "SELECT 2 as test_value" },
    ]);
    console.log("✅ Database transaction successful");
  } catch (error) {
    console.error("❌ Database test failed:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

testConnection().catch(console.error);
