import { Database } from 'better-sqlite3';
import { DocumentProvider, ProviderConfig, DocumentIngestionResult } from '../types/providers';

export class DocumentProviderService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // Provider Management
  async createProvider(provider: Omit<DocumentProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentProvider> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO document_providers (
        id, name, description, base_url, api_endpoint, api_key_required, 
        rate_limit, last_sync, sync_frequency, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      provider.name,
      provider.description || null,
      provider.baseUrl || null,
      provider.apiEndpoint || null,
      provider.apiKeyRequired ? 1 : 0,
      provider.rateLimit || null,
      provider.lastSync?.toISOString() || null,
      provider.syncFrequency || null,
      provider.isActive ? 1 : 1, // Default to active
      now,
      now
    );

    return this.getProviderById(id)!;
  }

  async updateProvider(id: string, updates: Partial<DocumentProvider>): Promise<DocumentProvider | null> {
    const existing = this.getProviderById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    
    this.db.prepare(`
      UPDATE document_providers SET
        name = ?,
        description = ?,
        base_url = ?,
        api_endpoint = ?,
        api_key_required = ?,
        rate_limit = ?,
        last_sync = ?,
        sync_frequency = ?,
        is_active = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.description || null,
      updated.baseUrl || null,
      updated.apiEndpoint || null,
      updated.apiKeyRequired ? 1 : 0,
      updated.rateLimit || null,
      updated.lastSync?.toISOString() || null,
      updated.syncFrequency || null,
      updated.isActive ? 1 : 0,
      updated.updatedAt.toISOString(),
      id
    );

    return this.getProviderById(id);
  }

  getProviderById(id: string): DocumentProvider | null {
    const row = this.db.prepare('SELECT * FROM document_providers WHERE id = ?').get(id);
    if (!row) return null;
    
    return this.mapProviderRow(row);
  }

  listProviders(activeOnly: boolean = true): DocumentProvider[] {
    const query = activeOnly 
      ? 'SELECT * FROM document_providers WHERE is_active = 1' 
      : 'SELECT * FROM document_providers';
      
    const rows = this.db.prepare(query).all();
    return rows.map(row => this.mapProviderRow(row));
  }

  // Provider Configuration
  async setProviderConfig(
    providerId: string, 
    key: string, 
    value: string | number | boolean | null,
    isSecret: boolean = false
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // Check if config exists
    const existing = this.db
      .prepare('SELECT id FROM document_provider_configs WHERE provider_id = ? AND config_key = ?')
      .get(providerId, key);

    if (existing) {
      this.db.prepare(`
        UPDATE document_provider_configs SET
          config_value = ?,
          is_secret = ?,
          updated_at = ?
        WHERE provider_id = ? AND config_key = ?
      `).run(
        String(value),
        isSecret ? 1 : 0,
        now,
        providerId,
        key
      );
    } else {
      this.db.prepare(`
        INSERT INTO document_provider_configs (
          id, provider_id, config_key, config_value, is_secret, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        providerId,
        key,
        String(value),
        isSecret ? 1 : 0,
        now,
        now
      );
    }
  }

  getProviderConfig(providerId: string, key: string): ProviderConfig | null {
    const row = this.db
      .prepare('SELECT * FROM document_provider_configs WHERE provider_id = ? AND config_key = ?')
      .get(providerId, key);
      
    if (!row) return null;
    
    return {
      id: row.id,
      providerId: row.provider_id,
      key: row.config_key,
      value: row.config_value,
      isSecret: row.is_secret === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  getAllProviderConfigs(providerId: string): ProviderConfig[] {
    const rows = this.db
      .prepare('SELECT * FROM document_provider_configs WHERE provider_id = ?')
      .all(providerId);
      
    return rows.map(row => ({
      id: row.id,
      providerId: row.provider_id,
      key: row.config_key,
      value: row.config_value,
      isSecret: row.is_secret === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  // Helper Methods
  private mapProviderRow(row: any): DocumentProvider {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      baseUrl: row.base_url || undefined,
      apiEndpoint: row.api_endpoint || undefined,
      apiKeyRequired: row.api_key_required === 1,
      rateLimit: row.rate_limit || undefined,
      lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
      syncFrequency: row.sync_frequency as any,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Document Ingestion
  async ingestDocument(
    providerId: string, 
    documentData: any,
    sourceId: string
  ): Promise<DocumentIngestionResult> {
    const provider = this.getProviderById(providerId);
    if (!provider) {
      return {
        success: false,
        providerId,
        sourceId,
        error: new Error(`Provider ${providerId} not found`),
        message: 'Provider not found'
      };
    }

    // Start a transaction
    const transaction = this.db.transaction(() => {
      try {
        // 1. Insert or update the document
        const now = new Date().toISOString();
        const docId = crypto.randomUUID();
        
        this.db.prepare(`
          INSERT INTO documents (
            id, title, content, source, source_id, provider_id, 
            raw_data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(provider_id, source_id) 
          DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            raw_data = excluded.raw_data,
            updated_at = excluded.updated_at
        `).run(
          docId,
          documentData.title || `Document ${sourceId}`,
          documentData.content || '',
          provider.name,
          sourceId,
          providerId,
          JSON.stringify(documentData.rawData || documentData),
          now,
          now
        );

        // 2. Process entities if present
        let entitiesExtracted = 0;
        if (Array.isArray(documentData.entities)) {
          for (const entityData of documentData.entities) {
            await this.processEntity(docId, entityData);
            entitiesExtracted++;
          }
        }

        // 3. Update provider's last sync time
        this.updateProvider(providerId, { lastSync: new Date() });

        return {
          success: true,
          documentId: docId,
          providerId,
          sourceId,
          stats: { entitiesExtracted }
        };
      } catch (error) {
        return {
          success: false,
          providerId,
          sourceId,
          error: error as Error,
          message: error instanceof Error ? error.message : 'Unknown error during ingestion'
        };
      }
    });

    return transaction();
  }

  private async processEntity(documentId: string, entityData: any): Promise<void> {
    // 1. Insert or get entity type
    let typeId = entityData.typeId || 'UNKNOWN';
    if (entityData.typeName) {
      // Try to find existing type by name
      const type = this.db
        .prepare('SELECT id FROM entity_types WHERE name = ?')
        .get(entityData.typeName);
        
      if (type) {
        typeId = type.id;
      } else {
        // Create new type if it doesn't exist
        typeId = crypto.randomUUID();
        this.db.prepare(`
          INSERT INTO entity_types (id, name, description, is_active, created_at)
          VALUES (?, ?, ?, 1, ?)
        `).run(
          typeId,
          entityData.typeName,
          entityData.typeDescription || `Auto-generated type for ${entityData.typeName}`,
          new Date().toISOString()
        );
      }
    }

    // 2. Insert or update entity
    const entityId = entityData.id || crypto.randomUUID();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO entities (
        id, name, type_id, description, source_id, source_url, 
        metadata, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) 
      DO UPDATE SET
        name = excluded.name,
        type_id = excluded.type_id,
        description = excluded.description,
        source_url = excluded.source_url,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(
      entityId,
      entityData.name,
      typeId,
      entityData.description || null,
      entityData.sourceId || null,
      entityData.sourceUrl || null,
      entityData.metadata ? JSON.stringify(entityData.metadata) : null,
      now,
      now
    );

    // 3. Link entity to document
    this.db.prepare(`
      INSERT OR IGNORE INTO document_entities (document_id, entity_id, created_at)
      VALUES (?, ?, ?)
    `).run(documentId, entityId, now);

    // 4. Process aliases if any
    if (Array.isArray(entityData.aliases)) {
      for (const alias of entityData.aliases) {
        this.db.prepare(`
          INSERT INTO entity_aliases (id, entity_id, alias, alias_type, is_primary, created_at)
          VALUES (?, ?, ?, ?, 0, ?)
          ON CONFLICT(entity_id, alias) DO NOTHING
        `).run(
          crypto.randomUUID(),
          entityId,
          alias,
          'alternate_spelling',
          now
        );
      }
    }
  }

  // Scheduled sync for providers
  async runScheduledSyncs(): Promise<Array<{providerId: string; result: DocumentIngestionResult}>> {
    const providers = this.listProviders(true);
    const results = [];
    
    for (const provider of providers) {
      if (!provider.syncFrequency || provider.syncFrequency === 'manual') continue;
      
      // Check if it's time to sync
      const lastSync = provider.lastSync ? new Date(provider.lastSync) : new Date(0);
      const now = new Date();
      let shouldSync = false;
      
      switch (provider.syncFrequency) {
        case 'hourly':
          shouldSync = (now.getTime() - lastSync.getTime()) > 3600 * 1000;
          break;
        case 'daily':
          shouldSync = now.getDate() !== lastSync.getDate() || 
                      now.getMonth() !== lastSync.getMonth() || 
                      now.getFullYear() !== lastSync.getFullYear();
          break;
        case 'weekly':
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          shouldSync = lastSync < oneWeekAgo;
          break;
        case 'monthly':
          shouldSync = now.getMonth() !== lastSync.getMonth() || 
                      now.getFullYear() !== lastSync.getFullYear();
          break;
      }
      
      if (shouldSync) {
        try {
          // This is a placeholder - actual implementation would call the provider's API
          // and process the documents
          const result = await this.syncProvider(provider.id);
          results.push({ providerId: provider.id, result });
        } catch (error) {
          results.push({
            providerId: provider.id,
            result: {
              success: false,
              providerId: provider.id,
              error: error as Error,
              message: error instanceof Error ? error.message : 'Unknown error during sync'
            }
          });
        }
      }
    }
    
    return results;
  }

  // Placeholder for provider-specific sync logic
  private async syncProvider(providerId: string): Promise<DocumentIngestionResult> {
    const provider = this.getProviderById(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // This is a placeholder - actual implementation would:
    // 1. Call the provider's API to get new/updated documents
    // 2. Process each document using ingestDocument
    // 3. Return a summary of the sync operation
    
    return {
      success: true,
      providerId,
      sourceId: 'sync-batch-' + new Date().toISOString(),
      message: 'Sync completed successfully',
      stats: {
        entitiesExtracted: 0,
        entitiesLinked: 0,
        relationshipsCreated: 0
      }
    };
  }
}
