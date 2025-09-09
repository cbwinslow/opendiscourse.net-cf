/**
 * Database Migration Service
 * Migrates data from Neo4j to Cloudflare D1 and Vectorize
 */

export interface MigrationConfig {
  batchSize: number;
  vectorDimensions: number;
  enableVectorization: boolean;
}

export interface D1Database {
  prepare: (sql: string) => any;
  exec: (sql: string) => any;
  batch: (statements: any[]) => any;
}

export interface VectorizeIndex {
  upsert: (vectors: any[]) => Promise<any>;
  query: (vector: number[], options?: any) => Promise<any>;
}

export interface R2Bucket {
  put: (key: string, data: any) => Promise<any>;
  get: (key: string) => Promise<any>;
}

export class DatabaseMigrationService {
  private db: D1Database;
  private vectorIndex: VectorizeIndex;
  private documentsBucket: R2Bucket;
  private config: MigrationConfig;

  constructor(
    db: D1Database,
    vectorIndex: VectorizeIndex,
    documentsBucket: R2Bucket,
    config: MigrationConfig = {
      batchSize: 100,
      vectorDimensions: 1536,
      enableVectorization: true,
    }
  ) {
    this.db = db;
    this.vectorIndex = vectorIndex;
    this.documentsBucket = documentsBucket;
    this.config = config;
  }

  /**
   * Initialize D1 database with schema
   */
  async initializeDatabase(): Promise<void> {
    try {
      // Read and execute migration SQL
      const migrationSQL = await this.loadMigrationSQL();
      await this.db.exec(migrationSQL);
      console.log("Database schema initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  /**
   * Migrate politicians from Neo4j structure to D1
   */
  async migratePoliticians(politicians: any[]): Promise<void> {
    console.log(`Migrating ${politicians.length} politicians...`);
    
    const batches = this.chunkArray(politicians, this.config.batchSize);
    
    for (const batch of batches) {
      const statements = batch.map(politician => {
        return this.db.prepare(`
          INSERT OR REPLACE INTO politicians (
            id, name, first_name, last_name, full_name, birth_date,
            party, state, district, chamber, bioguide_id, govtrack_id,
            opensecrets_id, votesmart_id, fec_ids, cspan_id, wikipedia_id,
            ballotpedia_id, maplight_id, icpsr_id, twitter_id, youtube_id,
            facebook_id, created_date, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          politician.id,
          politician.name,
          politician.firstName,
          politician.lastName,
          politician.fullName,
          politician.birthDate,
          politician.party,
          politician.state,
          politician.district,
          politician.chamber,
          politician.bioguideId,
          politician.govtrackId,
          politician.opensecretsId,
          politician.votesmartId,
          JSON.stringify(politician.fecIds || []),
          politician.cspanId,
          politician.wikipediaId,
          politician.ballotpediaId,
          politician.maplightId,
          politician.icpsrId,
          politician.twitterId,
          politician.youtubeId,
          politician.facebookId,
          politician.createdDate || new Date().toISOString(),
          politician.lastUpdated || new Date().toISOString()
        );
      });

      await this.db.batch(statements);
    }
    
    console.log("Politicians migration completed");
  }

  /**
   * Migrate legislation from Neo4j structure to D1
   */
  async migrateLegislation(bills: any[]): Promise<void> {
    console.log(`Migrating ${bills.length} bills...`);
    
    const batches = this.chunkArray(bills, this.config.batchSize);
    
    for (const batch of batches) {
      const statements = batch.map(bill => {
        return this.db.prepare(`
          INSERT OR REPLACE INTO legislation (
            id, bill_id, title, short_title, congress, type, number,
            introduced_date, latest_action_date, latest_action_text,
            summary, summary_short, keywords, subjects, committees,
            related_bills, cosponsors_count, primary_subject,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          bill.id,
          bill.billId,
          bill.title,
          bill.shortTitle,
          bill.congress,
          bill.type,
          bill.number,
          bill.introducedDate,
          bill.latestActionDate,
          bill.latestActionText,
          bill.summary,
          bill.summaryShort,
          JSON.stringify(bill.keywords || []),
          JSON.stringify(bill.subjects || []),
          JSON.stringify(bill.committees || []),
          JSON.stringify(bill.relatedBills || []),
          bill.cosponsorsCount || 0,
          bill.primarySubject,
          bill.createdAt || new Date().toISOString(),
          bill.updatedAt || new Date().toISOString()
        );
      });

      await this.db.batch(statements);
    }
    
    console.log("Legislation migration completed");
  }

  /**
   * Migrate relationships to junction tables
   */
  async migrateSponsorships(sponsorships: any[]): Promise<void> {
    console.log(`Migrating ${sponsorships.length} sponsorships...`);
    
    const batches = this.chunkArray(sponsorships, this.config.batchSize);
    
    for (const batch of batches) {
      const statements = batch.map(sponsorship => {
        return this.db.prepare(`
          INSERT OR REPLACE INTO bill_sponsorship (
            id, politician_id, bill_id, sponsorship_type, date_signed, created_date
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          sponsorship.id || crypto.randomUUID(),
          sponsorship.politicianId,
          sponsorship.billId,
          sponsorship.type || "SPONSOR",
          sponsorship.dateSigned,
          new Date().toISOString()
        );
      });

      await this.db.batch(statements);
    }
    
    console.log("Sponsorships migration completed");
  }

  /**
   * Migrate text content to Vectorize for semantic search
   */
  async migrateToVectorize(documents: any[]): Promise<void> {
    if (!this.config.enableVectorization) {
      console.log("Vectorization disabled, skipping...");
      return;
    }

    console.log(`Migrating ${documents.length} documents to Vectorize...`);
    
    const batches = this.chunkArray(documents, this.config.batchSize);
    
    for (const batch of batches) {
      const vectors = batch.map(doc => ({
        id: doc.id,
        values: doc.embedding || this.generateDummyEmbedding(),
        metadata: {
          type: doc.type,
          title: doc.title,
          content: doc.content?.substring(0, 1000), // Limit metadata size
          createdAt: doc.createdAt
        }
      }));

      await this.vectorIndex.upsert(vectors);
    }
    
    console.log("Vectorize migration completed");
  }

  /**
   * Store large documents in R2
   */
  async migrateDocumentsToR2(documents: any[]): Promise<void> {
    console.log(`Migrating ${documents.length} documents to R2...`);
    
    for (const doc of documents) {
      const key = `documents/${doc.type}/${doc.id}.json`;
      await this.documentsBucket.put(key, JSON.stringify(doc));
    }
    
    console.log("R2 documents migration completed");
  }

  /**
   * Complete migration process
   */
  async performFullMigration(neo4jData: any): Promise<void> {
    console.log("Starting full migration from Neo4j to Cloudflare...");
    
    try {
      // Initialize database schema
      await this.initializeDatabase();
      
      // Migrate core entities
      if (neo4jData.politicians) {
        await this.migratePoliticians(neo4jData.politicians);
      }
      
      if (neo4jData.legislation) {
        await this.migrateLegislation(neo4jData.legislation);
      }
      
      // Migrate relationships
      if (neo4jData.sponsorships) {
        await this.migrateSponsorships(neo4jData.sponsorships);
      }
      
      // Migrate to vector database and R2
      if (neo4jData.documents) {
        await this.migrateToVectorize(neo4jData.documents);
        await this.migrateDocumentsToR2(neo4jData.documents);
      }
      
      console.log("Full migration completed successfully");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private generateDummyEmbedding(): number[] {
    // Generate a dummy embedding vector for testing
    return Array.from({ length: this.config.vectorDimensions }, () => Math.random());
  }

  private async loadMigrationSQL(): Promise<string> {
    // In a real implementation, this would load from the migration file
    // For now, return the schema as a string
    return `
      -- This would contain the contents of migrations/001_initial_schema.sql
      -- For brevity, implementing the essential tables
      
      CREATE TABLE IF NOT EXISTS politicians (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        party TEXT,
        state TEXT,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS legislation (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        congress INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }
}

export default DatabaseMigrationService;