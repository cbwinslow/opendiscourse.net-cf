#!/usr/bin/env python3
"""
Document Ingestion Script

This script processes and ingests various document types into a vector database
for semantic search and analysis.
"""
import os
import json
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
from langchain.document_loaders import (
    TextLoader,
    PyPDFLoader,
    UnstructuredMarkdownLoader,
    UnstructuredWordDocumentLoader,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OllamaEmbeddings
from langchain.vectorstores import Chroma

# Load environment variables
load_dotenv()

# Configuration
DOCUMENT_DIRS = [
    "docs/",
    "docs/api/",
    "docs/architecture/",
    "docs/development/",
]

VECTOR_DB_DIR = "data/vector_db"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    ".txt": TextLoader,
    ".md": UnstructuredMarkdownLoader,
    ".pdf": PyPDFLoader,
    ".docx": UnstructuredWordDocumentLoader,
    ".doc": UnstructuredWordDocumentLoader,
}

class DocumentIngester:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            model="llama3",
            base_url="http://localhost:11434"
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        
    def load_documents(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """Load documents from file paths."""
        documents = []
        
        for file_path in file_paths:
            try:
                ext = os.path.splitext(file_path)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    loader = SUPPORTED_EXTENSIONS[ext](file_path)
                    docs = loader.load()
                    documents.extend(docs)
                    print(f"Loaded {len(docs)} documents from {file_path}")
            except Exception as e:
                print(f"Error loading {file_path}: {str(e)}")
        
        return documents
    
    def process_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process and split documents into chunks."""
        texts = self.text_splitter.split_documents(documents)
        print(f"Split into {len(texts)} chunks of text")
        return texts
    
    def create_vector_store(self, documents: List[Dict[str, Any]], persist_dir: str = VECTOR_DB_DIR):
        """Create or update vector store with documents."""
        # Create directory if it doesn't exist
        os.makedirs(persist_dir, exist_ok=True)
        
        # Create or load the vector store
        db = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=persist_dir
        )
        
        # Persist the database
        db.persist()
        print(f"Vector store created/updated at {persist_dir}")
        return db

def find_documents(base_dirs: List[str]) -> List[str]:
    """Find all supported documents in the given directories."""
    file_paths = []
    
    for base_dir in base_dirs:
        if not os.path.exists(base_dir):
            print(f"Directory not found: {base_dir}")
            continue
            
        for root, _, files in os.walk(base_dir):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    file_paths.append(os.path.join(root, file))
    
    return file_paths

def main():
    print("Starting document ingestion...")
    
    # Find all supported documents
    print("Searching for documents...")
    file_paths = find_documents(DOCUMENT_DIRS)
    
    if not file_paths:
        print("No supported documents found.")
        return
    
    print(f"Found {len(file_paths)} documents to process")
    
    # Initialize ingester
    ingester = DocumentIngester()
    
    # Load and process documents
    print("Loading documents...")
    documents = ingester.load_documents(file_paths)
    
    if not documents:
        print("No documents could be loaded.")
        return
    
    # Process documents
    print("Processing documents...")
    processed_docs = ingester.process_documents(documents)
    
    # Create/update vector store
    print("Updating vector store...")
    ingester.create_vector_store(processed_docs)
    
    print("Document ingestion completed successfully!")

if __name__ == "__main__":
    main()
