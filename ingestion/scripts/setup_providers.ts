import { Database } from 'better-sqlite3';
import { DocumentProviderService } from '../services/document_provider_service';

interface ProviderConfig {
  name: string;
  description: string;
  baseUrl?: string;
  apiEndpoint?: string;
  apiKeyRequired: boolean;
  rateLimit?: number;
  syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';
  config?: Record<string, { value: string | number | boolean; isSecret: boolean }>;
}

const COMMON_PROVIDERS: ProviderConfig[] = [
  {
    name: 'GOVINFO',
    description: 'U.S. Government Publishing Office (GPO) govinfo API',
    baseUrl: 'https://api.govinfo.gov',
    apiKeyRequired: true,
    rateLimit: 1000, // Requests per hour
    syncFrequency: 'daily',
    config: {
      'api.key': { value: '', isSecret: true },
      'collections.congressional-bills': { value: 'BILLS', isSecret: false },
      'collections.congressional-record': { value: 'CREC', isSecret: false },
      'collections.federal-register': { value: 'FR', isSecret: false },
    },
  },
  {
    name: 'ProPublica Congress API',
    description: 'ProPublica Congress API for U.S. legislative data',
    baseUrl: 'https://api.propublica.org/congress/v1',
    apiKeyRequired: true,
    rateLimit: 5000, // Requests per day
    syncFrequency: 'daily',
    config: {
      'api.key': { value: '', isSecret: true },
      'congress': { value: 118, isSecret: false }, // Current Congress
    },
  },
  {
    name: 'Congress.gov',
    description: 'Official website for U.S. federal legislative information',
    baseUrl: 'https://www.congress.gov',
    apiKeyRequired: false,
    rateLimit: 100, // Conservative estimate
    syncFrequency: 'weekly',
  },
  {
    name: 'GovTrack',
    description: 'Open government website tracking the U.S. Congress',
    baseUrl: 'https://www.govtrack.us/api/v2',
    apiKeyRequired: false,
    rateLimit: 500, // Conservative estimate
    syncFrequency: 'daily',
  },
  {
    name: 'OpenSecrets',
    description: 'Research group tracking money in U.S. politics',
    baseUrl: 'https://www.opensecrets.org/api',
    apiKeyRequired: true,
    rateLimit: 1000, // Requests per hour
    syncFrequency: 'monthly',
    config: {
      'api.key': { value: '', isSecret: true },
    },
  },
];

export async function setupDefaultProviders(db: Database): Promise<void> {
  const providerService = new DocumentProviderService(db);
  
  for (const providerConfig of COMMON_PROVIDERS) {
    console.log(`Setting up provider: ${providerConfig.name}`);
    
    // Check if provider already exists
    const existingProvider = providerService.listProviders(false).find(
      p => p.name.toLowerCase() === providerConfig.name.toLowerCase()
    );
    
    let provider: any;
    
    if (existingProvider) {
      console.log(`  - Updating existing provider: ${providerConfig.name}`);
      provider = await providerService.updateProvider(existingProvider.id, {
        ...providerConfig,
        baseUrl: providerConfig.baseUrl,
        apiEndpoint: providerConfig.apiEndpoint,
        apiKeyRequired: providerConfig.apiKeyRequired,
        rateLimit: providerConfig.rateLimit,
        syncFrequency: providerConfig.syncFrequency,
      });
    } else {
      console.log(`  - Creating new provider: ${providerConfig.name}`);
      provider = await providerService.createProvider({
        ...providerConfig,
        baseUrl: providerConfig.baseUrl,
        apiEndpoint: providerConfig.apiEndpoint,
        apiKeyRequired: providerConfig.apiKeyRequired,
        rateLimit: providerConfig.rateLimit,
        syncFrequency: providerConfig.syncFrequency,
        isActive: true,
      });
    }
    
    // Set provider configuration
    if (providerConfig.config) {
      console.log(`  - Configuring provider: ${providerConfig.name}`);
      for (const [key, { value, isSecret }] of Object.entries(providerConfig.config)) {
        await providerService.setProviderConfig(provider.id, key, value, isSecret);
      }
    }
  }
  
  console.log('Provider setup complete');
}

// If this file is run directly (not imported)
if (require.main === module) {
  const Database = require('better-sqlite3');
  const path = require('path');
  
  // Assuming SQLite database is in the project root
  const dbPath = path.join(__dirname, '../../opendiscourse.db');
  const db = new Database(dbPath);
  
  // Run migrations first (simplified example)
  console.log('Running migrations...');
  // In a real app, you would use a proper migration system
  
  setupDefaultProviders(db)
    .then(() => {
      console.log('Default providers setup completed successfully');
      db.close();
      process.exit(0);
    })
    .catch(error => {
      console.error('Error setting up providers:', error);
      db.close();
      process.exit(1);
    });
}
