import { Pool } from "pg";

export class Database {
  private pool: Pool;
  private connected: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // For development only, use proper SSL in production
      },
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const client = await this.pool.connect();
      console.log("Successfully connected to the database");
      client.release();
      this.connected = true;
    } catch (error) {
      console.error("Error connecting to the database:", error);
      throw error;
    }
  }

  async query(text: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      console.log("Executed query", { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error("Error executing query:", { text, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.pool.end();
      this.connected = false;
      console.log("Database connection closed");
    }
  }

  // Transaction support
  async transaction(
    queries: { text: string; params?: any[] }[],
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      for (const query of queries) {
        await client.query(query.text, query.params || []);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
