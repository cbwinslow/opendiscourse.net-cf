/**
 * Document Processing MCP Server for OpenDiscourse.net
 * Handles document storage, search, OCR, and PDF processing
 * Accessible at: docs.opendiscourse.net
 */

import { Ai } from "@cloudflare/ai";
import { D1Database, R2Bucket, VectorizeIndex } from "@cloudflare/workers-types";

export interface Env {
  AI: Ai;
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  VECTOR_INDEX: VectorizeIndex;
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "docs-mcp" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Upload document
    if (url.pathname === "/upload" && request.method === "POST") {
      return await handleDocumentUpload(request, env);
    }

    // Search documents
    if (url.pathname === "/search" && request.method === "POST") {
      return await handleDocumentSearch(request, env);
    }

    // OCR processing
    if (url.pathname === "/ocr" && request.method === "POST") {
      return await handleOCRProcessing(request, env);
    }

    // PDF processing
    if (url.pathname === "/pdf" && request.method === "POST") {
      return await handlePDFProcessing(request, env);
    }

    // Get document
    if (url.pathname.startsWith("/document/") && request.method === "GET") {
      return await handleGetDocument(request, env);
    }

    // Political document analysis
    if (url.pathname === "/political" && request.method === "POST") {
      return await handlePoliticalDocumentAnalysis(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleDocumentUpload(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = JSON.parse(formData.get("metadata") as string || "{}");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileKey = `${fileId}/${file.name}`;

    // Upload to R2
    await env.DOCUMENTS.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`,
      },
    });

    // Extract text content for search
    const textContent = await extractTextFromFile(file, env);

    // Create embeddings for semantic search
    const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: textContent,
    });

    // Store in vector index
    await env.VECTOR_INDEX.upsert([
      {
        id: fileId,
        values: embedding.data[0],
        metadata: {
          filename: file.name,
          contentType: file.type,
          text: textContent.substring(0, 1000), // Store first 1000 chars
          ...metadata,
        },
      },
    ]);

    // Store metadata in D1
    await env.DB.prepare(
      `INSERT INTO documents (id, filename, content_type, file_key, text_content, metadata, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        fileId,
        file.name,
        file.type,
        fileKey,
        textContent,
        JSON.stringify(metadata),
        new Date().toISOString()
      )
      .run();

    return new Response(
      JSON.stringify({
        id: fileId,
        filename: file.name,
        uploaded: true,
        searchable: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleDocumentSearch(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { query, limit = 10 } = await request.json();

    // Create embedding for search query
    const queryEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: query,
    });

    // Search vector index
    const searchResults = await env.VECTOR_INDEX.query(queryEmbedding.data[0], {
      topK: limit,
      returnValues: false,
      returnMetadata: true,
    });

    // Get full document details from D1
    const results = [];
    for (const result of searchResults.matches) {
      const doc = await env.DB.prepare(
        "SELECT * FROM documents WHERE id = ?"
      )
        .bind(result.id)
        .first();

      if (doc) {
        results.push({
          id: result.id,
          filename: doc.filename,
          score: result.score,
          metadata: JSON.parse(doc.metadata),
          uploaded_at: doc.uploaded_at,
        });
      }
    }

    return new Response(
      JSON.stringify({
        query,
        results,
        total: results.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleOCRProcessing(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { documentId } = await request.json();

    // Get document from R2
    const doc = await env.DB.prepare(
      "SELECT * FROM documents WHERE id = ?"
    )
      .bind(documentId)
      .first();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const file = await env.DOCUMENTS.get(doc.file_key);
    if (!file) {
      return new Response(JSON.stringify({ error: "File not found in storage" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use AI for OCR processing
    const prompt = "Extract all text from this image document. Return only the extracted text.";

    // For now, return placeholder - in production would process image
    const extractedText = "OCR processing would extract text from images here";

    // Update document with OCR text
    await env.DB.prepare(
      "UPDATE documents SET ocr_text = ?, processed_at = ? WHERE id = ?"
    )
      .bind(extractedText, new Date().toISOString(), documentId)
      .run();

    return new Response(
      JSON.stringify({
        documentId,
        ocr_text: extractedText,
        processed: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handlePDFProcessing(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { documentId } = await request.json();

    // Get document from database
    const doc = await env.DB.prepare(
      "SELECT * FROM documents WHERE id = ?"
    )
      .bind(documentId)
      .first();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract text from PDF (placeholder - would use PDF parsing library)
    const pdfText = "PDF text extraction would happen here";

    // Update document
    await env.DB.prepare(
      "UPDATE documents SET pdf_text = ?, processed_at = ? WHERE id = ?"
    )
      .bind(pdfText, new Date().toISOString(), documentId)
      .run();

    return new Response(
      JSON.stringify({
        documentId,
        pdf_text: pdfText,
        processed: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleGetDocument(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const documentId = request.url.split("/document/")[1];

    const doc = await env.DB.prepare(
      "SELECT * FROM documents WHERE id = ?"
    )
      .bind(documentId)
      .first();

    if (!doc) {
      return new Response("Document not found", { status: 404 });
    }

    const file = await env.DOCUMENTS.get(doc.file_key);
    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(file.body, {
      headers: {
        "Content-Type": doc.content_type,
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handlePoliticalDocumentAnalysis(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { documentId } = await request.json();

    const doc = await env.DB.prepare(
      "SELECT * FROM documents WHERE id = ?"
    )
      .bind(documentId)
      .first();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const textContent = doc.text_content || doc.ocr_text || doc.pdf_text;

    const prompt = `Analyze this political/legislative document for:
1. Key policy areas
2. Legislative intent
3. Stakeholder impacts
4. Potential controversies
5. Implementation requirements

Document text:
${textContent}`;

    const analysis = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 1500,
    });

    // Store analysis
    await env.DB.prepare(
      `INSERT INTO document_analyses (document_id, analysis_type, analysis, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(
        documentId,
        "political",
        analysis.response,
        new Date().toISOString()
      )
      .run();

    return new Response(
      JSON.stringify({
        documentId,
        analysis: analysis.response,
        analysis_type: "political",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function extractTextFromFile(file: File, env: Env): Promise<string> {
  // Placeholder for text extraction
  // In production, would use appropriate libraries for different file types
  if (file.type === "text/plain") {
    return await file.text();
  }

  // For other file types, return placeholder
  return `Text extraction placeholder for ${file.type} files`;
}
