// Congress.gov data ingestion module
// Handles fetching and processing data from the Congress.gov API

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
  }

  // Fetch bills
  async fetchBills(offset: number = 0, pageSize: number = 250): Promise<any> {
    const url = `${this.baseUrl}/bill?api_key=${this.config.apiKey}&offset=${offset}&limit=${pageSize}`;
    console.log(`Fetching bills from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching bills:`, error);
      throw error;
    }
  }

  // Fetch bill details
  async fetchBillDetails(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill details for ${billId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching bill details for ${billId}:`, error);
      throw error;
    }
  }

  // Fetch bill subjects
  async fetchBillSubjects(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/subjects?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill subjects for ${billId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching bill subjects for ${billId}:`, error);
      throw error;
    }
  }

  // Fetch bill summaries
  async fetchBillSummaries(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/summaries?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill summaries for ${billId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching bill summaries for ${billId}:`, error);
      throw error;
    }
  }

  // Fetch bill actions
  async fetchBillActions(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/actions?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill actions for ${billId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching bill actions for ${billId}:`, error);
      throw error;
    }
  }

  // Fetch bill cosponsors
  async fetchBillCosponsors(billId: string): Promise<any> {
    const url = `${this.baseUrl}/bill/${billId}/cosponsors?api_key=${this.config.apiKey}`;
    console.log(`Fetching bill cosponsors for ${billId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching bill cosponsors for ${billId}:`, error);
      throw error;
    }
  }

  // Fetch members of Congress
  async fetchMembers(offset: number = 0, pageSize: number = 250): Promise<any> {
    const url = `${this.baseUrl}/member?api_key=${this.config.apiKey}&offset=${offset}&limit=${pageSize}`;
    console.log(`Fetching members from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching members:`, error);
      throw error;
    }
  }

  // Fetch member details
  async fetchMemberDetails(memberId: string): Promise<any> {
    const url = `${this.baseUrl}/member/${memberId}?api_key=${this.config.apiKey}`;
    console.log(`Fetching member details for ${memberId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching member details for ${memberId}:`, error);
      throw error;
    }
  }

  // Fetch committees
  async fetchCommittees(offset: number = 0, pageSize: number = 250): Promise<any> {
    const url = `${this.baseUrl}/committee?api_key=${this.config.apiKey}&offset=${offset}&limit=${pageSize}`;
    console.log(`Fetching committees from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching committees:`, error);
      throw error;
    }
  }

  // Fetch committee details
  async fetchCommitteeDetails(committeeId: string): Promise<any> {
    const url = `${this.baseUrl}/committee/${committeeId}?api_key=${this.config.apiKey}`;
    console.log(`Fetching committee details for ${committeeId} from ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching committee details for ${committeeId}:`, error);
      throw error;
    }
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
    
    try {
      while (totalProcessed < limit) {
        const billsData = await this.fetchBills(offset, Math.min(250, limit - totalProcessed));
        
        if (!billsData.bills || billsData.bills.length === 0) {
          console.log("No more bills found");
          break;
        }
        
        console.log(`Found ${billsData.bills.length} bills`);
        
        // Process each bill
        for (const bill of billsData.bills) {
          if (totalProcessed >= limit) break;
          
          try {
            const processedBill = await this.processBill(bill.billId);
            console.log(`Successfully processed bill ${bill.billId}`);
            totalProcessed++;
          } catch (error) {
            console.error(`Failed to process bill ${bill.billId}:`, error);
          }
        }
        
        offset += billsData.bills.length;
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Finished ingesting ${totalProcessed} bills`);
    } catch (error) {
      console.error(`Error ingesting bills:`, error);
      throw error;
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