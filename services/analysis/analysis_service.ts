// Analysis service for OpenDiscourse
// Handles NLP processing, sentiment analysis, and topic modeling

export interface SentimentAnalysis {
  polarity: number; // -1 (negative) to 1 (positive)
  subjectivity: number; // 0 (objective) to 1 (subjective)
}

export interface Entity {
  entity: string;
  type: string; // PERSON, ORGANIZATION, LOCATION, etc.
  relevance: number; // 0 to 1
}

export interface Topic {
  topic: string;
  confidence: number; // 0 to 1
}

export interface KeyPhrase {
  phrase: string;
  relevance: number; // 0 to 1
}

export interface DocumentAnalysis {
  sentiment: SentimentAnalysis;
  entities: Entity[];
  topics: Topic[];
  keyPhrases: KeyPhrase[];
  summary: string;
  language: string;
}

export class AnalysisService {
  // Perform sentiment analysis
  static async analyzeSentiment(
    text: string,
    env: any,
  ): Promise<SentimentAnalysis> {
    // In a real implementation, we would use Cloudflare AI models
    // For now, we'll simulate sentiment analysis

    // Simple heuristic-based sentiment analysis
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "positive",
      "support",
      "benefit",
      "improve",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "negative",
      "oppose",
      "harm",
      "worsen",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }

    const polarity =
      (positiveCount - negativeCount) /
      Math.max(1, positiveCount + negativeCount);
    const subjectivity = Math.min(
      1,
      (positiveCount + negativeCount) / words.length,
    );

    return {
      polarity: parseFloat(polarity.toFixed(2)),
      subjectivity: parseFloat(subjectivity.toFixed(2)),
    };
  }

  // Extract entities from text
  static async extractEntities(text: string, env: any): Promise<Entity[]> {
    // In a real implementation, we would use Cloudflare AI models
    // For now, we'll simulate entity extraction

    // Simple pattern-based entity extraction
    const entities: Entity[] = [];

    // Extract potential organizations (capitalized words)
    const orgMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const orgs = [...new Set(orgMatches)].slice(0, 5); // Unique organizations, limit to 5

    orgs.forEach((org, index) => {
      entities.push({
        entity: org,
        type: "ORGANIZATION",
        relevance: parseFloat((0.9 - index * 0.1).toFixed(2)),
      });
    });

    // Extract potential persons (Mr./Mrs. followed by name)
    const personMatches =
      text.match(/\b(?:Mr|Mrs|Ms)\.?\s+[A-Z][a-z]+\b/g) || [];
    const persons = [...new Set(personMatches)].slice(0, 3); // Unique persons, limit to 3

    persons.forEach((person, index) => {
      entities.push({
        entity: person,
        type: "PERSON",
        relevance: parseFloat((0.8 - index * 0.1).toFixed(2)),
      });
    });

    return entities;
  }

  // Extract topics from text
  static async extractTopics(text: string, env: any): Promise<Topic[]> {
    // In a real implementation, we would use Cloudflare AI models
    // For now, we'll simulate topic extraction

    // Simple keyword-based topic extraction
    const topicKeywords: Record<string, string[]> = {
      Politics: [
        "government",
        "policy",
        "election",
        "vote",
        "congress",
        "senate",
      ],
      Economy: [
        "economy",
        "financial",
        "budget",
        "tax",
        "employment",
        "growth",
      ],
      Healthcare: [
        "health",
        "medical",
        "hospital",
        "insurance",
        "patient",
        "treatment",
      ],
      Education: [
        "school",
        "education",
        "student",
        "teacher",
        "university",
        "learning",
      ],
      Environment: [
        "environment",
        "climate",
        "pollution",
        "energy",
        "sustainability",
        "green",
      ],
    };

    const topics: Topic[] = [];
    const words = text.toLowerCase().split(/\s+/);

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      let matchCount = 0;
      for (const keyword of keywords) {
        if (words.includes(keyword)) matchCount++;
      }

      if (matchCount > 0) {
        const confidence = Math.min(1, matchCount / keywords.length);
        topics.push({
          topic: topic,
          confidence: parseFloat(confidence.toFixed(2)),
        });
      }
    }

    // Sort by confidence and limit to top 5
    return topics.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  // Extract key phrases from text
  static async extractKeyPhrases(text: string, env: any): Promise<KeyPhrase[]> {
    // In a real implementation, we would use Cloudflare AI models
    // For now, we'll simulate key phrase extraction

    // Simple n-gram based key phrase extraction
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const phrases: KeyPhrase[] = [];

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      // Extract 2-3 word phrases
      for (let i = 0; i < words.length - 1; i++) {
        if (i < words.length - 1) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          phrases.push({
            phrase: phrase,
            relevance: 0.7,
          });
        }
        if (i < words.length - 2) {
          const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          phrases.push({
            phrase: phrase,
            relevance: 0.6,
          });
        }
      }
    }

    // Remove duplicates and limit to top 10
    const uniquePhrases = [
      ...new Map(phrases.map((item) => [item.phrase, item])).values(),
    ];
    return uniquePhrases.slice(0, 10);
  }

  // Detect language of text
  static async detectLanguage(text: string, env: any): Promise<string> {
    // In a real implementation, we would use Cloudflare AI models
    // For now, we'll assume English
    return "en";
  }

  // Perform complete document analysis
  static async analyzeDocument(
    text: string,
    env: any,
  ): Promise<DocumentAnalysis> {
    // Perform all analysis tasks
    const [sentiment, entities, topics, keyPhrases, language] =
      await Promise.all([
        this.analyzeSentiment(text, env),
        this.extractEntities(text, env),
        this.extractTopics(text, env),
        this.extractKeyPhrases(text, env),
        this.detectLanguage(text, env),
      ]);

    // Generate summary
    const summary = this.generateSummary(text);

    return {
      sentiment,
      entities,
      topics,
      keyPhrases,
      summary,
      language,
    };
  }

  // Generate document summary
  static generateSummary(text: string): string {
    // Simple summary generation
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length <= 3) {
      return text;
    }

    // Return first and last sentences as summary
    return `${sentences[0].trim()}. ... ${sentences[sentences.length - 1].trim()}.`;
  }
}
