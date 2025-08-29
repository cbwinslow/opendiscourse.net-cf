#!/usr/bin/env python3
"""
Knowledge Graph Update Script

This script updates the knowledge graph with information extracted from the codebase
and documents using AI analysis.
"""
import os
import json
import networkx as nx
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import requests
from pydantic import BaseModel

# Configuration
KNOWLEDGE_GRAPH_FILE = "data/knowledge_graph.json"
OLLAMA_ENDPOINT = "http://localhost:11434/api/generate"

class NodeType(str, Enum):
    ENTITY = "entity"
    DOCUMENT = "document"
    CODE = "code"
    CONCEPT = "concept"
    PERSON = "person"
    ORGANIZATION = "organization"

class RelationType(str, Enum):
    REFERENCES = "references"
    DEPENDS_ON = "depends_on"
    MENTIONS = "mentions"
    OWNS = "owns"
    WORKS_ON = "works_on"
    RELATED_TO = "related_to"

@dataclass
class Node:
    id: str
    type: NodeType
    label: str
    properties: Dict[str, Any]

@dataclass
class Relation:
    source: str
    target: str
    type: RelationType
    properties: Dict[str, Any] = None

class KnowledgeGraph:
    def __init__(self):
        self.graph = nx.DiGraph()
        
    def add_node(self, node: Node):
        """Add a node to the knowledge graph."""
        self.graph.add_node(
            node.id,
            type=node.type,
            label=node.label,
            **node.properties
        )
    
    def add_relation(self, relation: Relation):
        """Add a relation between two nodes."""
        if relation.source in self.graph and relation.target in self.graph:
            self.graph.add_edge(
                relation.source,
                relation.target,
                type=relation.type,
                **({} if relation.properties is None else relation.properties)
            )
    
    def save(self, file_path: str):
        """Save the knowledge graph to a file."""
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Convert to JSON-serializable format
        data = {
            "nodes": [
                {"id": n, **{"type": d["type"].value, "label": d["label"], **{k: v for k, v in d.items() if k not in ["type", "label"]}}
                for n, d in self.graph.nodes(data=True)
            ],
            "edges": [
                {"source": u, "target": v, "type": d["type"].value, **{k: v for k, v in d.items() if k != "type"}}
                for u, v, d in self.graph.edges(data=True)
            ]
        }
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    @classmethod
    def load(cls, file_path: str) -> 'KnowledgeGraph':
        """Load a knowledge graph from a file."""
        kg = cls()
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                data = json.load(f)
                
                # Add nodes
                for node_data in data.get("nodes", []):
                    node = Node(
                        id=node_data["id"],
                        type=NodeType(node_data["type"]),
                        label=node_data["label"],
                        properties={k: v for k, v in node_data.items() if k not in ["id", "type", "label"]}
                    )
                    kg.add_node(node)
                
                # Add edges
                for edge_data in data.get("edges", []):
                    relation = Relation(
                        source=edge_data["source"],
                        target=edge_data["target"],
                        type=RelationType(edge_data["type"]),
                        properties={k: v for k, v in edge_data.items() if k not in ["source", "target", "type"]}
                    )
                    kg.add_relation(relation)
        
        return kg

class AIAnalyzer:
    def __init__(self):
        self.endpoint = OLLAMA_ENDPOINT
    
    def analyze_text(self, text: str, context: str = None) -> Dict[str, Any]:
        """Analyze text using Ollama's API."""
        prompt = f"""Analyze the following text and extract entities, relationships, and key information.
        
        Text:
        {text}
        
        Context: {context or 'No additional context provided.'}
        
        Return the analysis in JSON format with the following structure:
        {{
            "entities": [
                {{"id": "unique_id", "type": "entity_type", "label": "Human-readable label", "properties": {{}}}}
            ],
            "relations": [
                {{"source": "entity_id", "target": "entity_id", "type": "relation_type", "properties": {{}}}}
            ]
        }}"""
        
        try:
            response = requests.post(
                self.endpoint,
                json={
                    "model": "llama3",
                    "prompt": prompt,
                    "format": "json",
                    "stream": False
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error analyzing text: {str(e)}")
            return {"entities": [], "relations": []}

def update_knowledge_graph():
    """Update the knowledge graph with information from the codebase and documents."""
    print("Updating knowledge graph...")
    
    # Load existing knowledge graph or create a new one
    kg = KnowledgeGraph.load(KNOWLEDGE_GRAPH_FILE)
    ai_analyzer = AIAnalyzer()
    
    # Example: Analyze a document (you would typically iterate through your documents)
    document_path = "README.md"
    if os.path.exists(document_path):
        print(f"Analyzing document: {document_path}")
        with open(document_path, 'r') as f:
            text = f.read()
            
            # Get analysis from AI
            analysis = ai_analyzer.analyze_text(text, f"Document: {document_path}")
            
            # Update knowledge graph with analysis
            for entity in analysis.get("entities", []):
                node = Node(
                    id=entity["id"],
                    type=NodeType(entity.get("type", "concept")),
                    label=entity.get("label", entity["id"]),
                    properties=entity.get("properties", {})
                )
                kg.add_node(node)
                
            for relation in analysis.get("relations", []):
                rel = Relation(
                    source=relation["source"],
                    target=relation["target"],
                    type=RelationType(relation["type"]),
                    properties=relation.get("properties", {})
                )
                kg.add_relation(rel)
    
    # Save the updated knowledge graph
    kg.save(KNOWLEDGE_GRAPH_FILE)
    print(f"Knowledge graph updated and saved to {KNOWLEDGE_GRAPH_FILE}")

if __name__ == "__main__":
    update_knowledge_graph()
