// GovInfo.gov data ingestion module
// Handles fetching and processing data from the GovInfo API

interface GovInfoConfig {
  apiBaseUrl: string;
  apiKey: string;
  collections: string[];
}

interface Package {
  packageId: string;
  title: string;
  category: string;
  dateIssued: string;
  lastModified: string;
  collectionCode: string;
  congress?: number;
  type?: string;
  number?: string;
  volume?: string;
  session?: string;
  associatedDate?: string;
  granulesLink?: string;
  previousLink?: string;
  nextLink?: string;
}

interface Download {
  type: string;
  url: string;
  size?: number;
}

export class GovInfoIngestion {
  private config: GovInfoConfig;
  private baseUrl: string;

  constructor(config: GovInfoConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl;
  }

  // Fetch list of packages for a collection
  async fetchPackages(
    collection: string,
    offset: number = 0,
    pageSize: number = 100,
  ): Promise<any> {
    const url = `${this.baseUrl}/collections/${collection}?offset=${offset}&pageSize=${pageSize}&api_key=${this.config.apiKey}`;
    console.log(`Fetching packages for collection ${collection} from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(
        `Error fetching packages for collection ${collection}:`,
        error,
      );
      throw error;
    }
  }

  // Fetch package details
  async fetchPackageDetails(packageId: string): Promise<any> {
    const url = `${this.baseUrl}/packages/${packageId}/summary?api_key=${this.config.apiKey}`;
    console.log(`Fetching package details for ${packageId} from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching package details for ${packageId}:`, error);
      throw error;
    }
  }

  // Fetch granules for a package
  async fetchGranules(packageId: string): Promise<any> {
    const url = `${this.baseUrl}/packages/${packageId}/granules?api_key=${this.config.apiKey}`;
    console.log(`Fetching granules for package ${packageId} from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching granules for package ${packageId}:`, error);
      throw error;
    }
  }

  // Fetch chapters for a granule
  async fetchChapters(granuleId: string): Promise<any> {
    const url = `${this.baseUrl}/granules/${granuleId}/chapters?api_key=${this.config.apiKey}`;
    console.log(`Fetching chapters for granule ${granuleId} from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching chapters for granule ${granuleId}:`, error);
      throw error;
    }
  }

  // Download file content
  async downloadFile(url: string): Promise<ArrayBuffer> {
    console.log(`Downloading file from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error(`Error downloading file from ${url}:`, error);
      throw error;
    }
  }

  // Process a package and its contents
  async processPackage(packageId: string): Promise<any> {
    console.log(`Processing package ${packageId}`);

    try {
      // Fetch package details
      const packageDetails = await this.fetchPackageDetails(packageId);

      // Extract downloads
      const downloads: Download[] = [];
      if (packageDetails.download) {
        for (const [type, url] of Object.entries(packageDetails.download)) {
          downloads.push({
            type,
            url: url as string,
          });
        }
      }

      // Fetch granules if available
      let granules: any[] = [];
      if (packageDetails.granulesLink) {
        const granulesData = await this.fetchGranules(packageId);
        granules = granulesData.granules || [];
      }

      return {
        package: packageDetails,
        downloads,
        granules,
      };
    } catch (error) {
      console.error(`Error processing package ${packageId}:`, error);
      throw error;
    }
  }

  // Ingest data for a collection
  async ingestCollection(
    collection: string,
    limit: number = 1000,
  ): Promise<void> {
    console.log(`Ingesting data for collection ${collection}`);

    let offset = 0;
    let totalProcessed = 0;

    try {
      while (totalProcessed < limit) {
        const packagesData = await this.fetchPackages(
          collection,
          offset,
          Math.min(100, limit - totalProcessed),
        );

        if (!packagesData.packages || packagesData.packages.length === 0) {
          console.log(`No more packages found for collection ${collection}`);
          break;
        }

        console.log(
          `Found ${packagesData.packages.length} packages in collection ${collection}`,
        );

        // Process each package
        for (const pkg of packagesData.packages) {
          if (totalProcessed >= limit) break;

          try {
            const processedPackage = await this.processPackage(pkg.packageId);
            console.log(`Successfully processed package ${pkg.packageId}`);
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to process package ${pkg.packageId}:`, error);
          }
        }

        offset += packagesData.packages.length;

        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(
        `Finished ingesting ${totalProcessed} packages for collection ${collection}`,
      );
    } catch (error) {
      console.error(`Error ingesting collection ${collection}:`, error);
      throw error;
    }
  }

  // Ingest data for all configured collections
  async ingestAllCollections(limitPerCollection: number = 1000): Promise<void> {
    console.log("Ingesting data for all configured collections");

    for (const collection of this.config.collections) {
      try {
        await this.ingestCollection(collection, limitPerCollection);
      } catch (error) {
        console.error(`Failed to ingest collection ${collection}:`, error);
      }
    }

    console.log("Finished ingesting all collections");
  }
}
