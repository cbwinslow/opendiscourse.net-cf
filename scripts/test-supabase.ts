import { supabase } from "../config/supabase";
import {
  fetchAllFromTable,
  fetchById,
  insertRow,
  updateRow,
  deleteRow,
  initializeDatabase,
} from "../lib/supabase/db";

async function testSupabase() {
  try {
    console.log("Initializing database...");
    await initializeDatabase();

    // Test document creation
    console.log("Creating a test document...");
    const newDoc = await insertRow("documents", {
      title: "Test Document",
      content: "This is a test document content.",
      metadata: { source: "test", category: "sample" },
    });

    console.log("Created document:", newDoc);

    // Test fetching all documents
    console.log("Fetching all documents...");
    const allDocs = await fetchAllFromTable("documents");
    console.log("All documents:", allDocs);

    // Test updating a document
    if (newDoc) {
      console.log("Updating the test document...");
      const updatedDoc = await updateRow("documents", newDoc.id, {
        title: "Updated Test Document",
        metadata: { ...newDoc.metadata, updated: true },
      });
      console.log("Updated document:", updatedDoc);

      // Test fetching by ID
      console.log("Fetching document by ID...");
      const fetchedDoc = await fetchById("documents", newDoc.id);
      console.log("Fetched document:", fetchedDoc);

      // Test deletion
      console.log("Deleting the test document...");
      await deleteRow("documents", newDoc.id);
      console.log("Document deleted");
    }

    // Verify deletion
    const remainingDocs = await fetchAllFromTable("documents");
    console.log(`Remaining documents: ${remainingDocs.length}`);

    console.log("Supabase test completed successfully!");
  } catch (error) {
    console.error("Error during Supabase test:", error);
  } finally {
    // Close any open connections
    process.exit(0);
  }
}

testSupabase();
