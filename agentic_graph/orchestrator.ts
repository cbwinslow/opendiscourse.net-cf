// Main orchestrator for the agentic knowledge graph system
// Coordinates all agents and manages the overall workflow

import { Neo4jConnection } from "./neo4j/neo4j_connection";
import {
  AnalysisAgent,
  PoliticianProfilerAgent,
  InferenceAgent,
} from "./agents/analysis_agents";

interface Document {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, any>;
}

export class KnowledgeGraphOrchestrator {
  private neo4j: Neo4jConnection;
  private analysisAgent: AnalysisAgent;
  private profilerAgent: PoliticianProfilerAgent;
  private inferenceAgent: InferenceAgent;

  constructor(neo4j: Neo4jConnection) {
    this.neo4j = neo4j;
    this.analysisAgent = new AnalysisAgent(neo4j);
    this.profilerAgent = new PoliticianProfilerAgent(neo4j);
    this.inferenceAgent = new InferenceAgent(neo4j);
  }

  // Process a document through the entire pipeline
  async processDocument(document: Document): Promise<void> {
    console.log(`Orchestrator: Processing document ${document.id}`);

    try {
      // Step 1: Analyze the document
      const analysisResult = await this.analysisAgent.analyzeDocument(
        document.id,
        document.content,
      );

      // Step 2: Update politician profiles (if applicable)
      await this.updatePoliticianProfiles(analysisResult);

      // Step 3: Run inference to discover new relationships
      await this.inferenceAgent.inferRelationships();

      // Step 4: Store document metadata
      await this.storeDocumentMetadata(document, analysisResult);

      console.log(`Orchestrator: Completed processing document ${document.id}`);
    } catch (error: any) {
      console.error(
        `Orchestrator: Error processing document ${document.id}:`,
        error,
      );
      throw error;
    }
  }

  // Process multiple documents
  async processDocuments(documents: Document[]): Promise<void> {
    console.log(`Orchestrator: Processing ${documents.length} documents`);

    // Process documents in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(
        `Orchestrator: Processing batch ${Math.floor(i / batchSize) + 1}`,
      );

      // Process batch in parallel
      await Promise.all(batch.map((doc) => this.processDocument(doc)));
    }

    console.log(
      `Orchestrator: Completed processing ${documents.length} documents`,
    );
  }

  // Update politician profiles based on new analysis results
  private async updatePoliticianProfiles(analysisResult: any): Promise<void> {
    console.log("Orchestrator: Updating politician profiles");

    try {
      // Extract unique politician IDs from entities
      const politicianIds = new Set<string>();

      for (const entity of analysisResult.entities) {
        if (entity.label === "PERSON") {
          politicianIds.add(entity.text);
        }
      }

      // Update profiles for each politician
      for (const politicianId of politicianIds) {
        try {
          await this.profilerAgent.createProfile(politicianId);
        } catch (error: any) {
          console.warn(
            `Orchestrator: Failed to update profile for politician ${politicianId}:`,
            error,
          );
        }
      }

      console.log("Orchestrator: Completed updating politician profiles");
    } catch (error: any) {
      console.error("Orchestrator: Error updating politician profiles:", error);
      throw error;
    }
  }

  // Store document metadata in the graph
  private async storeDocumentMetadata(
    document: Document,
    analysisResult: any,
  ): Promise<void> {
    console.log(`Orchestrator: Storing metadata for document ${document.id}`);

    try {
      // Create or update document node
      await this.neo4j.createNode("Document", {
        id: document.id,
        source: document.source,
        ...document.metadata,
        processedDate: new Date().toISOString(),
        entityCount: analysisResult.entities.length,
        relationshipCount: analysisResult.relationships.length,
      });

      // Store analysis results as properties or separate nodes
      await this.neo4j.updateNode("Document", document.id, {
        biasScore: analysisResult.bias.biasScore,
        sentiment: analysisResult.sentiment.sentiment,
        factualAccuracy: analysisResult.factCheck.factualAccuracy,
        hasHateSpeech: analysisResult.hateSpeech.hasHateSpeech,
      });

      console.log(`Orchestrator: Stored metadata for document ${document.id}`);
    } catch (error: any) {
      console.error(
        `Orchestrator: Error storing metadata for document ${document.id}:`,
        error,
      );
      throw error;
    }
  }

  // Query the knowledge graph
  async queryGraph(
    cypherQuery: string,
    params: Record<string, any> = {},
  ): Promise<any> {
    console.log(`Orchestrator: Executing graph query`);

    try {
      const result = await this.neo4j.runQuery(cypherQuery, params);
      return result;
    } catch (error: any) {
      console.error("Orchestrator: Error executing graph query:", error);
      throw error;
    }
  }

  // Get insights about a politician
  async getPoliticianInsights(politicianId: string): Promise<any> {
    console.log(
      `Orchestrator: Getting insights for politician ${politicianId}`,
    );

    const query = `
      MATCH (p:Politician {id: $politicianId})
      OPTIONAL MATCH (p)-[:MEMBER_OF]->(g:GovernmentBody)
      OPTIONAL MATCH (p)-[:SPONSORS]->(l:Legislation)
      OPTIONAL MATCH (p)-[:VOTES_ON]->(v:Vote)
      OPTIONAL MATCH (p)-[:MAKES]->(s:Statement)
      RETURN p, collect(DISTINCT g) as governmentBodies, 
             count(DISTINCT l) as sponsoredLegislation,
             count(DISTINCT v) as votes,
             count(DISTINCT s) as statements
    `;

    try {
      const result = await this.neo4j.runQuery(query, { politicianId });
      return result.records[0];
    } catch (error: any) {
      console.error(
        `Orchestrator: Error getting insights for politician ${politicianId}:`,
        error,
      );
      throw error;
    }
  }

  // Get relationship insights between politicians
  async getRelationshipInsights(
    politicianId1: string,
    politicianId2: string,
  ): Promise<any> {
    console.log(
      `Orchestrator: Getting relationship insights between ${politicianId1} and ${politicianId2}`,
    );

    const query = `
      MATCH (p1:Politician {id: $politicianId1})
      MATCH (p2:Politician {id: $politicianId2})
      MATCH path = shortestPath((p1)-[*..5]-(p2))
      RETURN path
    `;

    try {
      const result = await this.neo4j.runQuery(query, {
        politicianId1,
        politicianId2,
      });
      return result.records;
    } catch (error: any) {
      console.error(
        `Orchestrator: Error getting relationship insights:`,
        error,
      );
      throw error;
    }
  }
}
