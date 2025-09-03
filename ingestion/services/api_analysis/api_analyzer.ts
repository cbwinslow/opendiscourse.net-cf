import { OpenAI } from 'langchain/llms/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
import { HumanMessage, SystemMessage } from 'langchain/schema';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';

interface APIDiscoveryResult {
  endpoints: APIEndpoint[];
  documentation: string;
  authentication: {
    required: boolean;
    methods: string[];
  };
  rateLimiting: {
    detected: boolean;
    details?: string;
  };
}

interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  parameters: Parameter[];
  responseFormat: string;
  authenticationRequired: boolean;
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: any;
}

export class APIAnalyzer {
  private openai: OpenAI;
  private chat: ChatOpenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ 
      openAIApiKey: apiKey,
      temperature: 0.3,
      modelName: 'gpt-4-turbo'
    });
    this.chat = new ChatOpenAI({ 
      openAIApiKey: apiKey,
      temperature: 0.3,
      modelName: 'gpt-4-turbo'
    });
  }

  /**
   * Discovers and analyzes API endpoints from a website
   */
  async discoverAPIEndpoints(url: string): Promise<APIDiscoveryResult> {
    try {
      // First, try to find API documentation
      const documentation = await this.findAPIDocumentation(url);
      
      // Then analyze the website for API endpoints
      const endpoints = await this.analyzeWebsiteForEndpoints(url);
      
      // Analyze authentication requirements
      const authentication = await this.analyzeAuthentication(url);
      
      // Check for rate limiting
      const rateLimiting = await this.checkRateLimiting(url);
      
      return {
        endpoints,
        documentation: documentation || 'No formal API documentation found',
        authentication,
        rateLimiting
      };
    } catch (error) {
      console.error('Error discovering API endpoints:', error);
      throw new Error(`API discovery failed: ${error.message}`);
    }
  }

  /**
   * Attempts to find and extract API documentation from a website
   */
  private async findAPIDocumentation(url: string): Promise<string> {
    try {
      // Common documentation URL patterns
      const docPaths = [
        '/api-docs', '/documentation', '/docs', '/api', '/developer',
        '/swagger', '/swagger.json', '/openapi.json', '/api/v1/docs'
      ];
      
      const docUrls = docPaths.map(path => new URL(path, url).toString());
      
      for (const docUrl of docUrls) {
        try {
          const response = await axios.get(docUrl, { 
            timeout: 5000,
            headers: { 'User-Agent': 'OpenDiscourseBot/1.0' }
          });
          
          // Check if this looks like API documentation
          if (this.isLikelyAPIDocumentation(response.data, docUrl)) {
            return `Found API documentation at ${docUrl}`;
          }
        } catch (e) {
          // Ignore 404s and other errors, try next URL
          continue;
        }
      }
      
      // If no documentation found, try to analyze the homepage
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const links = $('a[href*="api"], a[href*="doc"], a[href*="developer"]')
        .map((_, el) => $(el).attr('href'))
        .get();
      
      if (links.length > 0) {
        return `Potential documentation links found: ${links.join(', ')}`;
      }
      
      return 'No formal API documentation found';
    } catch (error) {
      console.error('Error finding API documentation:', error);
      return 'Error finding API documentation';
    }
  }

  /**
   * Analyzes a website to find potential API endpoints
   */
  private async analyzeWebsiteForEndpoints(url: string): Promise<APIEndpoint[]> {
    try {
      // Get the website content
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract all JavaScript files which might contain API calls
      const scripts = $('script[src]')
        .map((_, el) => $(el).attr('src'))
        .get()
        .filter(src => src.endsWith('.js'));
      
      // Look for common API endpoint patterns in the HTML
      const potentialEndpoints = this.findPotentialEndpoints(response.data);
      
      // Analyze JavaScript files for API calls
      const jsEndpoints = await this.analyzeJavaScriptFiles(scripts, url);
      
      // Combine and deduplicate endpoints
      const allEndpoints = [...potentialEndpoints, ...jsEndpoints];
      const uniqueEndpoints = Array.from(new Set(allEndpoints.map(e => JSON.stringify(e))))
        .map(e => JSON.parse(e));
      
      // Use AI to analyze and describe the endpoints
      return await this.analyzeEndpointsWithAI(uniqueEndpoints, url);
    } catch (error) {
      console.error('Error analyzing website for endpoints:', error);
      return [];
    }
  }

  /**
   * Finds potential API endpoints in text using regex patterns
   */
  private findPotentialEndpoints(text: string): string[] {
    // Common API endpoint patterns
    const patterns = [
      /['"](\/api\/v?\d*\/\w+[\w\/]*)['"]/g,
      /['"](\/v\d+\/\w+[\w\/]*)['"]/g,
      /['"](\/graphql)['"]/g,
      /['"](\/rest\/v\d+\/\w+[\w\/]*)['"]/g,
      /(https?:\/\/[\w\-\.]+\/api\/v?\d*\/\w+[\w\/]*)/g
    ];
    
    const endpoints = new Set<string>();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        endpoints.add(match[1]);
      }
    }
    
    return Array.from(endpoints);
  }

  /**
   * Analyzes JavaScript files for API calls
   */
  private async analyzeJavaScriptFiles(scriptUrls: string[], baseUrl: string): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];
    
    for (const scriptUrl of scriptUrls.slice(0, 5)) { // Limit to first 5 scripts
      try {
        const fullUrl = scriptUrl.startsWith('http') 
          ? scriptUrl 
          : new URL(scriptUrl, baseUrl).toString();
        
        const response = await axios.get(fullUrl, { 
          timeout: 5000,
          headers: { 'User-Agent': 'OpenDiscourseBot/1.0' }
        });
        
        // Look for fetch, axios, XHR, etc. calls
        const apiCalls = this.findAPICallsInJS(response.data);
        endpoints.push(...apiCalls);
      } catch (error) {
        console.error(`Error analyzing script ${scriptUrl}:`, error);
        continue;
      }
    }
    
    return endpoints;
  }

  /**
   * Finds API calls in JavaScript code
   */
  private findAPICallsInJS(code: string): APIEndpoint[] {
    // This is a simplified version - in a real implementation, you'd want to use a proper JavaScript parser
    const patterns = [
      // fetch calls
      /fetch\(['"]([^'")]+)['"]/g,
      // axios.get/post/etc
      /axios\.(get|post|put|delete|patch|head|options|request)\s*\(\s*['"]([^'")]+)['"]/g,
      // XHR
      /\.open\s*\(\s*['"](GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)['"]\s*,\s*['"]([^'")]+)['"]/g,
      // jQuery.ajax
      /\.ajax\s*\(\s*{[^}]*url\s*:\s*['"]([^'")]+)['"]/g
    ];
    
    const endpoints = new Set<string>();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        // The URL is in different capture groups depending on the pattern
        const url = match[2] || match[1];
        if (url && !url.startsWith('http') && url.includes('/')) {
          endpoints.add(url);
        }
      }
    }
    
    // Convert to APIEndpoint objects with minimal info
    return Array.from(endpoints).map(path => ({
      path,
      method: this.guessHttpMethod(path),
      description: 'Discovered from JavaScript analysis',
      parameters: [],
      responseFormat: 'unknown',
      authenticationRequired: false
    }));
  }

  /**
   * Guesses the HTTP method based on the endpoint path
   */
  private guessHttpMethod(path: string): string {
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('/get/') || lowerPath.endsWith('/get')) return 'GET';
    if (lowerPath.includes('/post/') || lowerPath.endsWith('/post')) return 'POST';
    if (lowerPath.includes('/put/') || lowerPath.endsWith('/put')) return 'PUT';
    if (lowerPath.includes('/delete/') || lowerPath.endsWith('/delete')) return 'DELETE';
    return 'GET'; // Default to GET
  }

  /**
   * Uses AI to analyze and describe the discovered endpoints
   */
  private async analyzeEndpointsWithAI(endpoints: APIEndpoint[], baseUrl: string): Promise<APIEndpoint[]> {
    const prompt = `You are an API analyst. For each of the following API endpoints found on ${baseUrl}, 
provide a detailed description, guess the parameters it might accept, and the expected response format.

Endpoints to analyze:
${endpoints.map((e, i) => `${i + 1}. ${e.method} ${e.path}`).join('\n')}

For each endpoint, provide:
1. A description of what it might do
2. Required and optional parameters with types
3. The expected response format
4. Whether authentication is likely required

Format your response as a JSON array of objects with these properties:
- path: The endpoint path
- method: HTTP method
- description: Description of the endpoint
- parameters: Array of {name, type, required, description, example}
- responseFormat: Description of the response format
- authenticationRequired: boolean`;

    try {
      const response = await this.chat.call([
        new SystemMessage('You are a helpful assistant that analyzes API endpoints.'),
        new HumanMessage(prompt)
      ]);
      
      // Parse the response and update the endpoints
      try {
        const analyzedEndpoints = JSON.parse(response.content);
        return analyzedEndpoints;
      } catch (e) {
        console.error('Error parsing AI response:', e);
        console.log('AI response:', response.content);
        return endpoints; // Return original if parsing fails
      }
    } catch (error) {
      console.error('Error analyzing endpoints with AI:', error);
      return endpoints; // Return original if AI analysis fails
    }
  }

  /**
   * Analyzes authentication requirements for the API
   */
  private async analyzeAuthentication(url: string): Promise<{required: boolean, methods: string[]}> {
    // Try common authentication endpoints
    const authEndpoints = ['/auth', '/login', '/oauth2', '/token', '/api/auth'];
    const foundMethods = new Set<string>();
    
    for (const endpoint of authEndpoints) {
      try {
        const fullUrl = new URL(endpoint, url).toString();
        const response = await axios.head(fullUrl, {
          validateStatus: null,
          timeout: 3000,
          headers: { 'User-Agent': 'OpenDiscourseBot/1.0' }
        });
        
        if (response.status !== 404) {
          // Check for common auth headers
          const authHeader = response.headers['www-authenticate'] || '';
          if (authHeader.includes('Bearer')) foundMethods.add('Bearer Token');
          if (authHeader.includes('Basic')) foundMethods.add('Basic Auth');
          if (authHeader.includes('OAuth')) foundMethods.add('OAuth');
          if (authHeader.includes('API-Key')) foundMethods.add('API Key');
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // If no auth endpoints found, try to make a request to the base URL
    if (foundMethods.size === 0) {
      try {
        const response = await axios.get(url, {
          validateStatus: null,
          timeout: 5000,
          headers: { 'User-Agent': 'OpenDiscourseBot/1.0' }
        });
        
        // Check for common auth-related responses
        if (response.status === 401 || response.status === 403) {
          foundMethods.add('Unknown (authentication required)');
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    return {
      required: foundMethods.size > 0,
      methods: Array.from(foundMethods)
    };
  }

  /**
   * Checks for rate limiting on the API
   */
  private async checkRateLimiting(url: string): Promise<{detected: boolean, details?: string}> {
    try {
      // Make multiple rapid requests to check for rate limiting
      const responses = await Promise.all([
        axios.get(url, { 
          headers: { 'User-Agent': 'OpenDiscourseBot/1.0' },
          validateStatus: null
        }),
        axios.get(url, { 
          headers: { 'User-Agent': 'OpenDiscourseBot/1.0' },
          validateStatus: null
        }),
        axios.get(url, { 
          headers: { 'User-Agent': 'OpenDiscourseBot/1.0' },
          validateStatus: null
        })
      ]);
      
      // Check for rate limit headers
      const rateLimitHeaders = [
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-ratelimit-reset',
        'retry-after',
        'x-rate-limit-limit',
        'x-rate-limit-remaining',
        'x-rate-limit-reset'
      ];
      
      for (const response of responses) {
        const headers = response.headers;
        const hasRateLimitHeader = Object.keys(headers).some(header => 
          rateLimitHeaders.includes(header.toLowerCase())
        );
        
        if (hasRateLimitHeader) {
          const limitHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(headers)) {
            if (rateLimitHeaders.includes(key.toLowerCase())) {
              limitHeaders[key] = value as string;
            }
          }
          
          return {
            detected: true,
            details: `Rate limiting detected with headers: ${JSON.stringify(limitHeaders)}`
          };
        }
        
        // Check for rate limit status codes
        if (response.status === 429) {
          return {
            detected: true,
            details: 'Rate limiting detected (HTTP 429 Too Many Requests)'
          };
        }
      }
      
      return { detected: false };
    } catch (error) {
      // If we get a network error, it might be because of rate limiting
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return {
          detected: true,
          details: 'Rate limiting detected (HTTP 429 Too Many Requests)'
        };
      }
      
      return { 
        detected: false,
        details: `Error checking rate limiting: ${error.message}`
      };
    }
  }

  /**
   * Determines if the content is likely API documentation
   */
  private isLikelyAPIDocumentation(content: string, url: string): boolean {
    // Check for common API documentation frameworks
    const indicators = [
      'swagger', 'openapi', 'api-docs', 'apidoc', 'redoc',
      'API Reference', 'Endpoints', 'Authentication',
      'basePath', 'paths', 'definitions', 'parameters'
    ];
    
    const lowerContent = content.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    // Check URL patterns
    if (/\/api-?docs?\//i.test(lowerUrl) || /\/docs?\/api/i.test(lowerUrl)) {
      return true;
    }
    
    // Check content for indicators
    const matchingIndicators = indicators.filter(indicator => 
      lowerContent.includes(indicator.toLowerCase())
    );
    
    // If we find several indicators, it's probably API docs
    return matchingIndicators.length >= 3;
  }
}
