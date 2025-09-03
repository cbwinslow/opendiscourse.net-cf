// Congress.gov data ingestion module
// Handles fetching and processing data from the Congress.gov API

import { IngestionUtils, RateLimitConfig } from '../shared/ingestion_utils.js';

interface CongressConfig {
  apiBaseUrl: string;
  apiKey: string;
}

interface Bill {
  billId: string;
  title: string;
  congress: number;
  type: string;
  number: number;
  introducedDate: string;
  sponsor?: {
    name: string;
    state: string;
    party: string;
  };
  cosponsorsCount: number;
  committees: string[];
  latestAction?: {
   actionDate: string;
    text: string;
  };
  xmlUrl?: string;
  pdfUrl?: string;
}

export class CongressIngestion {
  private config: CongressConfig;
  private baseUrl: string;

  constructor(config: CongressConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl;

    // Set up rate limiting for Congress API
    IngestionUtils.setRateLimit({
      maxRequests: 1000,
      perMilliseconds: 3600000, // 1 hour
      maxRPS: 5 // Conservative limit for Congress API
    } as RateLimitConfig);
  }

  // Fetch bills
  async fetchBills(offset: number = 0, pageSize: number = 250): Promise<any> {
    const url = `${this.baseUrl}/bill?api_key=${this.config.apiKey}&offset=${offset}&limit=${pageSize}`;
    console.log(`Fetching bills from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, 'fetchBills');
    }

    return result.data;
  }

  // Fetch bill details
  async fetchBillDetails(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill details for ${billId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchBillDetails-${billId}`);
    }

    return result.data;
  }

  // Fetch bill subjects
  async fetchBillSubjects(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/subjects?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill subjects for ${billId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchBillSubjects-${billId}`);
    }

    return result.data;
  }

  // Fetch bill summaries
  async fetchBillSummaries(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/summaries?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill summaries for ${billId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchBillSummaries-${billId}`);
    }

    return result.data;
  }

  // Fetch bill actions
  async fetchBillActions(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/actions?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill actions for ${billId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchBillActions-${billId}`);
    }

    return result.data;
  }

  // Fetch bill cosponsors
  async fetchBillCosponsors(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/cosponsors?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill cosponsors for ${billId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchBillCosponsors-${billId}`);
    }

    return result.data;
  }

  // Fetch members of Congress
  async fetchMembers(offset: number = 0, pageSize: number = 250): Promise<any> {
    const url = `${this.baseUrl}/member?api_key=${this.config.apiKey}&offset=${offset}&limit=${pageSize}`;
    console.log(`Fetching members from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, 'fetchMembers');
    }

    return result.data;
  }

  // Fetch member details
  async fetchMemberDetails(memberId: string): Promise<any> {
    const url = `${this.baseUrl}/member/${memberId}?api_key=${this.config.apiKey}`;
    console.log(`Fetching member details for ${memberId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchMemberDetails-${memberId}`);
    }

    return result.data;
  }

  // Fetch committees
  async fetchCommittees(offset: number = 0, pageSize: number = 250): Promise<any> {
    const url = `${this.baseUrl}/committee?api_key=${this.config.apiKey}&offset=${offset}&limit=${pageSize}`;
    console.log(`Fetching committees from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, 'fetchCommittees');
    }

    return result.data;
  }

  // Fetch committee details
  async fetchCommitteeDetails(committeeId: string): Promise<any> {
    const url = `${this.baseUrl}/committee/${committeeId}?api_key=${this.config.apiKey}`;
    console.log(`Fetching committee details for ${committeeId} from ${url}`);

    const result = await IngestionUtils.fetchWithRateLimit(url, undefined, 3, 30000);
    if (!result.success) {
      throw IngestionUtils.handleError(result.error, `fetchCommitteeDetails-${committeeId}`);
    }

    return result.data;
  }

  // Process a bill and its related data
  async processBill(billId: string): Promise<any> {
    console.log(`Processing bill ${billId}`);
    
    try {
      // Fetch bill details
      const billDetails = await this.fetchBillDetails(billId);
      
      // Fetch related data
      const [subjects, summaries, actions, cosponsors] = await Promise.all([
        this.fetchBillSubjects(billId).catch(() => ({ subjects: [] })),
        this.fetchBillSummaries(billId).catch(() => ({ summaries: [] })),
        this.fetchBillActions(billId).catch(() => ({ actions: [] })),
        this.fetchBillCosponsors(billId).catch(() => ({ cosponsors: [] }))
      ]);
      
      return {
        bill: billDetails,
        subjects: subjects.subjects || [],
        summaries: summaries.summaries || [],
        actions: actions.actions || [],
        cosponsors: cosponsors.cosponsors || []
      };
    } catch (error) {
      console.error(`Error processing bill ${billId}:`, error);
      throw error;
    }
  }

  // Ingest bills
  async ingestBills(limit: number = 10000): Promise<void> {
    console.log(`Ingesting bills (limit: ${limit})`);

    let offset = 0;
    let totalProcessed = 0;
    const pageSize = 250;
    const allBillIds: string[] = [];

    try {
      // First, collect all bill IDs to process
      while (totalProcessed < limit && allBillIds.length < limit) {
        const billsData = await this.fetchBills(offset, Math.min(pageSize, limit - totalProcessed));

        if (!billsData.bills || billsData.bills.length === 0) {
          console.log("No more bills found");
          break;
        }

        console.log(`Found ${billsData.bills.length} bills at offset ${offset}`);
        allBillIds.push(...billsData.bills.map((bill: any) => bill.billId));
        offset += billsData.bills.length;
        totalProcessed += billsData.bills.length;
      }

      // Process bills in batches using IngestionUtils
      const processedCount = await IngestionUtils.processInBatches(
        allBillIds.slice(0, limit),
        10, // Process 10 bills per batch
        async (batch: string[]) => {
          const billPromises = batch.map(async (billId) => {
            try {
              const processedBill = await this.processBill(billId);
              console.log(`Successfully processed bill ${billId}`);
              return { success: true, billId, data: processedBill };
            } catch (error) {
              console.error(`Failed to process bill ${billId}:`, error);
              return { success: false, billId, error };
            }
          });

          await Promise.all(billPromises);
        },
        (completed: number, total: number) => {
          console.log(`Processed ${completed}/${total} bill batches`);
        }
      );

      console.log(`Finished ingesting ${allBillIds.length} bills`);
    } catch (error) {
      console.error('Error ingesting bills:', error);
      throw IngestionUtils.handleError(error, 'ingestBills');
    }
  }

  // Ingest members of Congress
  async ingestMembers(limit: number = 1000): Promise<void> {
    console.log(`Ingesting members of Congress (limit: ${limit})`);
    
    let offset = 0;
    let totalProcessed = 0;
    
    try {
      while (totalProcessed < limit) {
        const membersData = await this.fetchMembers(offset, Math.min(250, limit - totalProcessed));
        
        if (!membersData.members || membersData.members.length === 0) {
          console.log("No more members found");
          break;
        }
        
        console.log(`Found ${membersData.members.length} members`);
        totalProcessed += membersData.members.length;
        offset += membersData.members.length;
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Finished ingesting ${totalProcessed} members`);
    } catch (error) {
      console.error(`Error ingesting members:`, error);
      throw error;
    }
  }

  // Ingest committees
  async ingestCommittees(limit: number = 1000): Promise<void> {
    console.log(`Ingesting committees (limit: ${limit})`);
    
    let offset = 0;
    let totalProcessed = 0;
    
    try {
      while (totalProcessed < limit) {
        const committeesData = await this.fetchCommittees(offset, Math.min(250, limit - totalProcessed));
        
        if (!committeesData.committees || committeesData.committees.length === 0) {
          console.log("No more committees found");
          break;
        }
        
        console.log(`Found ${committeesData.committees.length} committees`);
        totalProcessed += committeesData.committees.length;
        offset += committeesData.committees.length;
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Finished ingesting ${totalProcessed} committees`);
    } catch (error) {
      console.error(`Error ingesting committees:`, error);
      throw error;
    }
  }
}
