import { GovInfoIngestion } from '../../ingestion/govinfo/govinfo_ingestion';
import { Database } from '../../services/database';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Configuration
const config = {
  govinfo: {
    apiBaseUrl: 'https://api.govinfo.gov',
    apiKey: process.env.GOVINFO_API_KEY || '',
    collections: ['BILLS', 'CRPT', 'CREC', 'FR'],
  },
  db: {
    url: process.env.DATABASE_URL || '',
  },
  batchSize: 10, // Number of packages to process in a batch
  maxPackages: 50, // Maximum number of packages to process (for testing)
};

async function main() {
  try {
    console.log('Starting govinfo.gov data ingestion...');
    
    // Initialize services
    const govinfo = new GovInfoIngestion({
      apiBaseUrl: config.govinfo.apiBaseUrl,
      apiKey: config.govinfo.apiKey,
      collections: config.govinfo.collections,
    });
    
    const db = new Database(config.db.url);
    await db.connect();
    
    // Process each collection
    for (const collection of config.govinfo.collections) {
      console.log(`\nProcessing collection: ${collection}`);
      await processCollection(govinfo, db, collection);
    }
    
    console.log('\nData ingestion completed successfully!');
  } catch (error) {
    console.error('Error during data ingestion:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

async function processCollection(govinfo: GovInfoIngestion, db: Database, collection: string) {
  let offset = 0;
  let totalProcessed = 0;
  let hasMore = true;
  
  while (hasMore && totalProcessed < config.maxPackages) {
    console.log(`\nFetching packages (offset: ${offset}, batch: ${config.batchSize})`);
    
    // Fetch a batch of packages
    const response = await govinfo.fetchPackages(collection, offset, config.batchSize);
    const packages = response?.packages || [];
    
    if (!packages.length) {
      console.log('No more packages to process');
      hasMore = false;
      continue;
    }
    
    // Process each package in the batch
    for (const pkg of packages) {
      if (totalProcessed >= config.maxPackages) break;
      
      try {
        console.log(`\nProcessing package: ${pkg.packageId}`);
        await processPackage(govinfo, db, pkg, collection);
        totalProcessed++;
      } catch (error) {
        console.error(`Error processing package ${pkg.packageId}:`, error);
        // Continue with next package on error
      }
    }
    
    // Update offset for next batch
    offset += packages.length;
    
    // Check if we've reached the end
    if (packages.length < config.batchSize) {
      hasMore = false;
    }
  }
  
  console.log(`\nProcessed ${totalProcessed} packages from ${collection}`);
}

async function processPackage(govinfo: GovInfoIngestion, db: Database, pkg: any, collection: string) {
  // Fetch package details
  const details = await govinfo.fetchPackageDetails(pkg.packageId);
  
  // Prepare package data for database
  const packageData = {
    id: pkg.packageId,
    package_id: pkg.packageId,
    title: pkg.title,
    category: pkg.category,
    date_issued: pkg.dateIssued,
    last_modified: pkg.lastModified,
    collection_code: collection,
    congress: pkg.congress,
    type: pkg.type,
    number: pkg.number,
    volume: pkg.volume,
    session: pkg.session,
    associated_date: pkg.associatedDate,
    granules_link: pkg.granulesLink,
    previous_link: pkg.previousLink,
    next_link: pkg.nextLink,
  };
  
  // Save package to database
  await db.query(
    `INSERT INTO govinfo_packages (${Object.keys(packageData).join(', ')})
     VALUES (${Object.keys(packageData).map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (package_id) DO UPDATE SET
       ${Object.keys(packageData).filter(k => k !== 'id' && k !== 'package_id').map((k, i) => `${k} = EXCLUDED.${k}`).join(', ')},
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    Object.values(packageData)
  );
  
  // Process downloads if any
  if (pkg.downloads?.length) {
    for (const download of pkg.downloads) {
      await db.query(
        `INSERT INTO govinfo_package_downloads (package_id, type, url, size)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (package_id, type) DO UPDATE SET
           url = EXCLUDED.url,
           size = EXCLUDED.size`,
        [pkg.packageId, download.type, download.url, download.size]
      );
    }
  }
  
  // Process granules if available
  if (pkg.granulesLink) {
    await processGranules(govinfo, db, pkg.packageId);
  }
  
  console.log(`Processed package: ${pkg.packageId}`);
}

async function processGranules(govinfo: GovInfoIngestion, db: Database, packageId: string) {
  try {
    const response = await govinfo.fetchGranules(packageId);
    const granules = response?.granules || [];
    
    for (const granule of granules) {
      // Save granule to database
      const granuleData = {
        id: granule.granuleId,
        package_id: packageId,
        granule_id: granule.granuleId,
        title: granule.title,
        date_issued: granule.dateIssued,
        last_modified: granule.lastModified,
        category: granule.category,
        chapters_link: granule.chaptersLink,
      };
      
      await db.query(
        `INSERT INTO govinfo_granules (${Object.keys(granuleData).join(', ')})
         VALUES (${Object.keys(granuleData).map((_, i) => `$${i + 1}`).join(', ')})
         ON CONFLICT (id) DO UPDATE SET
           ${Object.keys(granuleData).filter(k => k !== 'id' && k !== 'package_id' && k !== 'granule_id').map(k => `${k} = EXCLUDED.${k}`).join(', ')},
           updated_at = CURRENT_TIMESTAMP`,
        Object.values(granuleData)
      );
      
      // Process downloads if any
      if (granule.downloads?.length) {
        for (const download of granule.downloads) {
          await db.query(
            `INSERT INTO govinfo_granule_downloads (granule_id, type, url, size)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (granule_id, type) DO UPDATE SET
               url = EXCLUDED.url,
               size = EXCLUDED.size`,
            [granule.granuleId, download.type, download.url, download.size]
          );
        }
      }
      
      // Process chapters if available
      if (granule.chaptersLink) {
        await processChapters(govinfo, db, granule.granuleId);
      }
    }
  } catch (error) {
    console.error(`Error processing granules for package ${packageId}:`, error);
    // Continue with next granule on error
  }
}

async function processChapters(govinfo: GovInfoIngestion, db: Database, granuleId: string) {
  try {
    const response = await govinfo.fetchChapters(granuleId);
    const chapters = response?.chapters || [];
    
    for (const chapter of chapters) {
      // Save chapter to database
      const chapterData = {
        id: chapter.chapterId,
        granule_id: granuleId,
        chapter_id: chapter.chapterId,
        title: chapter.title,
        level: chapter.level,
        part: chapter.part,
        section: chapter.section,
        content: chapter.content,
      };
      
      await db.query(
        `INSERT INTO govinfo_chapters (${Object.keys(chapterData).join(', ')})
         VALUES (${Object.keys(chapterData).map((_, i) => `$${i + 1}`).join(', ')})
         ON CONFLICT (id) DO UPDATE SET
           ${Object.keys(chapterData).filter(k => k !== 'id' && k !== 'granule_id' && k !== 'chapter_id').map(k => `${k} = EXCLUDED.${k}`).join(', ')},
           updated_at = CURRENT_TIMESTAMP`,
        Object.values(chapterData)
      );
      
      // Process downloads if any
      if (chapter.downloads?.length) {
        for (const download of chapter.downloads) {
          await db.query(
            `INSERT INTO govinfo_chapter_downloads (chapter_id, type, url, size)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (chapter_id, type) DO UPDATE SET
               url = EXCLUDED.url,
               size = EXCLUDED.size`,
            [chapter.chapterId, download.type, download.url, download.size]
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error processing chapters for granule ${granuleId}:`, error);
    // Continue with next chapter on error
  }
}

// Run the main function
main().catch(console.error);
