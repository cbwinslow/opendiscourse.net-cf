import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { OpenAI } from 'langchain/llms/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { HumanMessage, SystemMessage } from 'langchain/schema';

// Type definitions for better type safety
type Heading = { level: number; text: string };
type Link = { text: string; url: string };
type Table = { headers: string[]; rows: string[][]; caption?: string };

interface ScrapingResult {
  url: string;
  title: string;
  description: string;
  headings: { level: number; text: string }[];
  links: { text: string; url: string }[];
  tables: { headers: string[]; rows: string[][]; caption?: string }[];
  content: Record<string, any>;
  metadata: {
    language?: string;
    keywords?: string[];
    viewport?: string;
    hasForms: boolean;
    hasLogin: boolean;
  };
}

export class WebScraper {
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
   * Scrapes a webpage and extracts structured data
   */
  async scrape(url: string): Promise<ScrapingResult> {
    try {
      // Fetch the webpage
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const dom = new JSDOM(html);
      
      // Extract basic information
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      
      // Extract headings
      const headings: Heading[] = [];
      for (let i = 1; i <= 6; i++) {
        $(`h${i}`).each((_, el) => {
          headings.push({
            level: i,
            text: $(el).text().trim()
          });
        });
      }
      
      // Extract links
      const links: Link[] = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            links.push({
              text: $(el).text().trim(),
              url: new URL(href, url).toString()
            });
          } catch (error) {
            console.warn(`Invalid URL: ${href}`, error);
          }
        }
      });
      
      // Extract tables
      const tables: Table[] = [];
      $('table').each((i, table) => {
        const headers: string[] = [];
        const rows: string[][] = [];
        const caption = $(table).find('caption').text().trim();
        
        // Get headers (th elements)
        $(table).find('th').each((_, th) => {
          headers.push($(th).text().trim());
        });
        
        // If no headers found, use first row
        if (headers.length === 0) {
          $(table).find('tr').first().find('td, th').each((_, cell) => {
            headers.push($(cell).text().trim());
          });
        }
        
        // Get rows
        $(table).find('tr').each((_, row) => {
          const rowData: string[] = [];
          $(row).find('td').each((_, cell) => {
            rowData.push($(cell).text().trim());
          });
          
          if (rowData.length > 0) {
            rows.push(rowData);
          }
        });
        
        if (headers.length > 0 || rows.length > 0) {
          const tableData: Table = {
            headers,
            rows,
            caption: caption || undefined
          };
          tables.push(tableData);
        }
      });
      
      // Extract metadata
      const metadata = {
        language: $('html').attr('lang') || dom.window.document.documentElement.lang || undefined,
        keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [],
        viewport: $('meta[name="viewport"]').attr('content'),
        hasForms: $('form').length > 0,
        hasLogin: $('input[type="password"], input[name*="pass"], input[name*="login"]').length > 0
      };
      
      // Use AI to extract structured content
      const content = await this.extractStructuredContent(html, url);
      
      return {
        url,
        title,
        description,
        headings,
        links: this.deduplicateLinks(links),
        tables,
        content,
        metadata
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error scraping ${url}:`, error);
      throw new Error(`Failed to scrape ${url}: ${errorMessage}`);
    }
  }
  
  /**
   * Uses AI to extract structured content from HTML
   */
  private async extractStructuredContent(html: string, url: string): Promise<Record<string, any>> {
    try {
      // First, clean the HTML to reduce token usage
      const cleanedHtml = this.cleanHtmlForAnalysis(html);
      
      // Create a prompt for the AI
      const prompt = `Analyze the following webpage content and extract structured data.
      
URL: ${url}

HTML Content:
${cleanedHtml.substring(0, 15000)}... [content truncated]`;
      
      const response = await this.chat.call([
        new SystemMessage(`You are an expert web content analyzer. Extract structured data from the webpage.
        
Extract the following information if available:
1. Main topic or purpose of the page
2. Key entities (people, organizations, locations, dates, etc.)
3. Any numerical data or statistics
4. Key points or highlights
5. Any structured data like products, articles, events, etc.
6. Sentiment (positive, negative, neutral)
7. Any visible API endpoints or data sources

Format your response as a JSON object with appropriate fields.`),
        new HumanMessage(prompt)
      ]);
      
      // Try to parse the JSON response
      try {
        return JSON.parse(response.content);
      } catch (e) {
        console.error('Error parsing AI response:', e);
        return { error: 'Failed to parse AI response', rawResponse: response.content };
      }
    } catch (error) {
      console.error('Error extracting structured content:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Cleans HTML to reduce token usage while preserving structure
   */
  private cleanHtmlForAnalysis(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, noscript, iframe, svg, img, video, audio, picture, source, track, canvas, map, area').remove();
    
    // Remove common non-content elements
    $('header, footer, nav, aside, form, button, input, select, textarea, label, button').remove();
    
    // Remove attributes to reduce noise
    $('*').each(function() {
      const attributes = this.attributes || [];
      for (let i = attributes.length - 1; i >= 0; i--) {
        const attr = attributes[i].name;
        if (!['id', 'class', 'href', 'src'].includes(attr)) {
          $(this).removeAttr(attr);
        }
      }
    });
    
    // Get the main content or fall back to body
    let content = $('main, article, [role="main"], .content, .main, #content, #main').first();
    if (content.length === 0) {
      content = $('body');
    }
    
    // Limit the content length
    const text = content.text()
      .replace(/\s+/g, ' ')
      .substring(0, 20000); // Further limit to reduce token usage
    
    return text;
  }
  
  /**
   * Removes duplicate links while preserving order
   */
  private deduplicateLinks(links: { text: string; url: string }[]): { text: string; url: string }[] {
    const seen = new Set();
    return links.filter(link => {
      const key = `${link.url}|${link.text}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Extracts data from a webpage using a schema
   */
  async extractWithSchema<T>(url: string, schema: Record<string, any>): Promise<T> {
    try {
      // First, scrape the page
      const result = await this.scrape(url);
      
      // Create a prompt for the AI to extract data according to the schema
      const prompt = `Extract data from the following webpage content according to the provided schema.
      
Webpage URL: ${url}
Webpage Title: ${result.title}

Schema:
${JSON.stringify(schema, null, 2)}

Webpage Content:
${JSON.stringify(result.content, null, 2)}

Extracted Data (JSON):`;
      
      const response = await this.chat.call([
        new SystemMessage(`You are an expert data extractor. Extract data from the webpage according to the provided schema.
        
- Follow the schema exactly
- Only include fields defined in the schema
- Return a valid JSON object
- If a field isn't found, use null`),
        new HumanMessage(prompt)
      ]);
      
      // Try to parse the JSON response
      try {
        return JSON.parse(response.content);
      } catch (e) {
        console.error('Error parsing AI response:', e);
        throw new Error(`Failed to parse AI response: ${response.content}`);
      }
    } catch (error) {
      console.error('Error extracting data with schema:', error);
      throw new Error(`Failed to extract data: ${error.message}`);
    }
  }
}
