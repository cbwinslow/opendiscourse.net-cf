// Political bias detection service
// Detects political bias, sentiment, and stance in political documents

interface BiasAnalysis {
  biasScore: number; // -1 (left/liberal) to 1 (right/conservative)
  confidence: number;
  biasType: string;
  evidence: string[];
}

interface SentimentAnalysis {
  sentiment: number; // -1 (negative) to 1 (positive)
  subjectivity: number; // 0 (objective) to 1 (subjective)
  confidence: number;
  keyPhrases: string[];
}

interface FactCheckResult {
  factualAccuracy: number; // 0 (inaccurate) to 1 (accurate)
  claims: Claim[];
  confidence: number;
}

interface Claim {
  text: string;
  isFactual: boolean;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

interface HateSpeechResult {
  hasHateSpeech: boolean;
  severity: number; // 0 (none) to 1 (extreme)
  targetedGroups: string[];
  confidence: number;
}

export class PoliticalAnalyzer {
  // Detect political bias in text
  static async detectBias(text: string): Promise<BiasAnalysis> {
    // In a real implementation, we would use trained models for bias detection
    // For now, we'll simulate bias detection based on keyword analysis
    
    console.log(`Detecting political bias in text: ${text.substring(0, 50)}...`);
    
    // Simple keyword-based bias detection
    const leftKeywords = [
      'progressive', 'liberal', 'democrat', 'social justice', 'equality', 
      'climate change', 'renewable energy', 'public healthcare', 'tax the rich',
      'workers rights', 'union', 'minimum wage', 'social security',
      'environmental protection', 'gun control', 'reproductive rights'
    ];
    
    const rightKeywords = [
      'conservative', 'republican', 'traditional values', 'free market', 
      'small government', 'lower taxes', 'personal responsibility', 'border security',
      'second amendment', 'fiscal responsibility', 'deregulation', 'school choice',
      'religious freedom', 'national security', 'illegal immigration'
    ];
    
    const leftCount = leftKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    const rightCount = rightKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    // Calculate bias score
    const total = leftCount + rightCount;
    const biasScore = total > 0 ? (rightCount - leftCount) / total : 0;
    
    // Determine bias type
    let biasType = 'NEUTRAL';
    if (Math.abs(biasScore) > 0.3) {
      biasType = biasScore > 0 ? 'CONSERVATIVE' : 'LIBERAL';
    }
    
    // Collect evidence
    const evidence: string[] = [];
    leftKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        evidence.push(`Contains left-leaning term: ${keyword}`);
      }
    });
    
    rightKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        evidence.push(`Contains right-leaning term: ${keyword}`);
      }
    });
    
    return {
      biasScore,
      confidence: total > 0 ? Math.min(1, total / 10) : 0.5,
      biasType,
      evidence
    };
  }

  // Analyze sentiment in text
  static async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    // In a real implementation, we would use sentiment analysis models
    // For now, we'll simulate sentiment analysis
    
    console.log(`Analyzing sentiment in text: ${text.substring(0, 50)}...`);
    
    // Simple keyword-based sentiment analysis
    const positiveWords = [
      'good', 'great', 'excellent', 'positive', 'support', 'benefit', 'improve',
      'success', 'achieve', 'progress', 'help', 'protect', 'strengthen', 'advance'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'negative', 'oppose', 'harm', 'worsen',
      'fail', 'problem', 'threat', 'danger', 'attack', 'destroy', 'weaken'
    ];
    
    const subjectiveWords = [
      'believe', 'think', 'feel', 'opinion', 'personal', 'subjective',
      'apparently', 'seems', 'appears', 'suggests', 'indicates'
    ];
    
    const positiveCount = positiveWords.filter(word => 
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    
    const negativeCount = negativeWords.filter(word => 
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    
    const subjectiveCount = subjectiveWords.filter(word => 
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    
    // Calculate sentiment
    const total = positiveCount + negativeCount;
    const sentiment = total > 0 ? (positiveCount - negativeCount) / total : 0;
    
    // Calculate subjectivity
    const subjectivity = Math.min(1, subjectiveCount / 20);
    
    // Extract key phrases
    const keyPhrases: string[] = [];
    const phrases = text.match(/\b[\w\s]{5,50}\b/g) || [];
    keyPhrases.push(...phrases.slice(0, 5));
    
    return {
      sentiment,
      subjectivity,
      confidence: Math.min(1, (positiveCount + negativeCount + subjectiveCount) / 20),
      keyPhrases
    };
  }

  // Check facts in text
  static async factCheck(text: string): Promise<FactCheckResult> {
    // In a real implementation, we would use fact-checking databases and models
    // For now, we'll simulate fact checking
    
    console.log(`Fact checking text: ${text.substring(0, 50)}...`);
    
    // Simple pattern-based fact checking
    const claimPatterns = [
      /\b(according to|studies show|research indicates|data suggests)\s+.*?\b/g,
      /\b(claims|states|argues|asserts)\s+that\s+.*?\b/g,
      /\b(is|was|are|were|have been|has been)\s+(a|an)\s+.*?\b/g
    ];
    
    const claims: Claim[] = [];
    
    claimPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          claims.push({
            text: match,
            isFactual: Math.random() > 0.3, // Random for simulation
            supportingEvidence: [],
            contradictingEvidence: []
          });
        });
      }
    });
    
    // Calculate factual accuracy
    const factualClaims = claims.filter(c => c.isFactual);
    const factualAccuracy = claims.length > 0 ? factualClaims.length / claims.length : 0.8;
    
    return {
      factualAccuracy,
      claims,
      confidence: 0.7 // Simulated confidence
    };
  }

  // Detect hate speech in text
  static async detectHateSpeech(text: string): Promise<HateSpeechResult> {
    // In a real implementation, we would use specialized hate speech detection models
    // For now, we'll simulate hate speech detection
    
    console.log(`Detecting hate speech in text: ${text.substring(0, 50)}...`);
    
    // Simple keyword-based hate speech detection
    const hateSpeechTerms = [
      'racist', 'racism', 'bigot', 'bigotry', 'xenophobe', 'xenophobia',
      'homophobe', 'homophobia', 'transphobe', 'transphobia', 'sexist',
      'discriminate', 'hate group', 'white supremacist', 'antisemitic'
    ];
    
    const targetedGroups = [
      'racial minorities', 'immigrants', 'LGBTQ+', 'religious groups',
      'women', 'disabled people', 'elderly', 'youth'
    ];
    
    const hateTermsFound: string[] = [];
    hateSpeechTerms.forEach(term => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        hateTermsFound.push(term);
      }
    });
    
    const groupsMentioned: string[] = [];
    targetedGroups.forEach(group => {
      if (text.toLowerCase().includes(group.toLowerCase())) {
        groupsMentioned.push(group);
      }
    });
    
    const hasHateSpeech = hateTermsFound.length > 0;
    const severity = Math.min(1, hateTermsFound.length / 5);
    
    return {
      hasHateSpeech,
      severity,
      targetedGroups: groupsMentioned,
      confidence: hasHateSpeech ? 0.9 : 0.7
    };
  }

  // Comprehensive political analysis
  static async analyze(text: string): Promise<{
    bias: BiasAnalysis,
    sentiment: SentimentAnalysis,
    factCheck: FactCheckResult,
    hateSpeech: HateSpeechResult
  }> {
    try {
      // Run all analyses in parallel
      const [bias, sentiment, factCheck, hateSpeech] = await Promise.all([
        this.detectBias(text),
        this.analyzeSentiment(text),
        this.factCheck(text),
        this.detectHateSpeech(text)
      ]);
      
      return {
        bias,
        sentiment,
        factCheck,
        hateSpeech
      };
    } catch (error) {
      console.error('Error during political analysis:', error);
      throw error;
    }
  }
}