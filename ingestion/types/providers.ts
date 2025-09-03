export interface DocumentProvider {
  id: string;
  name: string;
  description?: string;
  baseUrl?: string;
  apiEndpoint?: string;
  apiKeyRequired?: boolean;
  rateLimit?: number;
  lastSync?: Date | null;
  syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProviderConfig {
  id: string;
  providerId: string;
  key: string;
  value: string | number | boolean | null;
  isSecret?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EntityType {
  id: string;
  name: string;
  description?: string;
  colorCode?: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface Entity {
  id: string;
  name: string;
  typeId: string;
  description?: string;
  sourceId?: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
  lastVerified?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EntityAlias {
  id: string;
  entityId: string;
  alias: string;
  type?: string;
  isPrimary?: boolean;
  createdAt?: Date;
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  source?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentIngestionResult {
  success: boolean;
  documentId?: string;
  providerId: string;
  sourceId: string;
  message?: string;
  error?: Error;
  stats?: {
    entitiesExtracted?: number;
    entitiesLinked?: number;
    relationshipsCreated?: number;
  };
}
