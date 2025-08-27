#!/usr/bin/env node

// Sample data analysis script for OpenDiscourse
// This script demonstrates how to analyze political data

// Sample bill text for analysis
const sampleBillText = `
American Data Privacy Act of 2025

This bill establishes a comprehensive consumer data privacy framework. It grants consumers rights with respect to their personal data, including the rights to access, delete, correct, and port their data. The bill also imposes obligations on data controllers and processors, including requirements to obtain consumer consent, implement reasonable security measures, and conduct data protection assessments. Civil penalties for violations range from $2,500 to $7,500 per violation. Consumers may bring civil actions against data controllers for certain violations.

Section 1. Short Title
This Act may be cited as the "American Data Privacy Act of 2025".

Section 2. Definitions
For purposes of this Act:
(1) CONSUMER - The individual about whom personal data is collected or processed.
(2) DATA CONTROLLER - The natural or legal person who alone or jointly with others determines the purposes and means of the processing of personal data.
(3) PERSONAL DATA - Any information relating to an identified or identifiable natural person.
(4) PROCESSING - Any operation performed on personal data.

Section 3. Consumer Rights
(a) Right of Access - Consumers shall have the right to obtain confirmation as to whether or not personal data concerning them is being processed, and, where that is the case, to access such personal data.
(b) Right to Deletion - Consumers shall have the right to obtain the erasure of personal data concerning them.
(c) Right to Correction - Consumers shall have the right to rectify inaccurate personal data concerning them.
(d) Right to Portability - Consumers shall have the right to receive the personal data concerning them in a structured, commonly used and machine-readable format.

Section 4. Obligations of Data Controllers
(a) Consent - Data controllers shall obtain explicit consent from consumers before processing their personal data.
(b) Security Measures - Data controllers shall implement reasonable security measures to protect personal data.
(c) Data Protection Assessments - Data controllers shall conduct regular data protection impact assessments.

Section 5. Enforcement
(a) Civil Penalties - Violations of this Act shall be subject to civil penalties ranging from $2,500 to $7,500 per violation.
(b) Private Right of Action - Consumers may bring civil actions against data controllers for certain violations.

Section 6. Severability
If any provision of this Act is held invalid, the remainder of the Act shall not be affected.
`;

// Mock analysis functions
function extractEntities(text) {
  const entities = [];
  
  // Extract person names (simple regex for demo)
  const personMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
  personMatches.forEach(name => {
    if (!entities.find(e => e.text === name)) {
      entities.push({
        text: name,
        type: "PERSON",
        relevance: 0.8
      });
    }
  });
  
  // Extract organizations
  const orgMatches = text.match(/\b(?:Congress|House|Senate|Committee|Federal|Act|Bill|Law|Regulation)\b/gi) || [];
  orgMatches.forEach(org => {
    if (!entities.find(e => e.text === org)) {
      entities.push({
        text: org,
        type: "ORGANIZATION",
        relevance: 0.9
      });
    }
  });
  
  // Extract legislation
  const billMatches = text.match(/\b(?:Act|Bill|Law|Regulation)\b/g) || [];
  billMatches.forEach(bill => {
    if (!entities.find(e => e.text === bill)) {
      entities.push({
        text: bill,
        type: "LEGISLATION",
        relevance: 0.85
      });
    }
  });
  
  return entities;
}

function analyzeSentiment(text) {
  // Simple sentiment analysis based on keywords
  const positiveWords = ['protect', 'right', 'security', 'privacy', 'framework', 'comprehensive'];
  const negativeWords = ['violation', 'penalty', 'fine', 'punishment'];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  const words = text.toLowerCase().split(/\W+/);
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveScore++;
    if (negativeWords.includes(word)) negativeScore++;
  });
  
  const total = positiveScore + negativeScore;
  const polarity = total > 0 ? (positiveScore - negativeScore) / total : 0;
  
  return {
    polarity: parseFloat(polarity.toFixed(2)),
    subjectivity: total > 0 ? Math.min(1, total / 50) : 0.5
  };
}

function extractKeyPhrases(text) {
  // Simple key phrase extraction
  const phrases = [];
  
  // Extract noun phrases (simplified)
  const nounPhrases = text.match(/\b(?:data|privacy|consumer|personal|security|information|framework|rights|obligations|violations|penalties|assessment)\s+(?:[a-z]+){1,2}\b/gi) || [];
  
  // Count occurrences and sort by frequency
  const phraseCounts = {};
  nounPhrases.forEach(phrase => {
    const lowerPhrase = phrase.toLowerCase();
    phraseCounts[lowerPhrase] = (phraseCounts[lowerPhrase] || 0) + 1;
  });
  
  // Convert to array and sort
  Object.entries(phraseCounts)
    .map(([phrase, count]) => ({ phrase, count, score: count / 10 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach(({ phrase, score }) => {
      phrases.push({
        phrase,
        score: parseFloat(score.toFixed(2))
      });
    });
  
  return phrases;
}

function summarizeText(text) {
  // Simple summarization by extracting first and last sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length <= 3) {
    return text;
  }
  
  return `${sentences[0].trim()}. ... ${sentences[sentences.length - 1].trim()}.`;
}

function analyzeTopics(entities) {
  const topics = [];
  
  // Determine topics based on entities
  const orgCount = entities.filter(e => e.type === 'ORGANIZATION').length;
  const personCount = entities.filter(e => e.type === 'PERSON').length;
  const legislationCount = entities.filter(e => e.type === 'LEGISLATION').length;
  
  if (orgCount > 0) {
    topics.push({
      topic: "Government",
      confidence: 0.8
    });
  }
  
  if (legislationCount > 0) {
    topics.push({
      topic: "Legislation",
      confidence: 0.9
    });
  }
  
  if (entities.some(e => e.text.toLowerCase().includes('data') || e.text.toLowerCase().includes('privacy'))) {
    topics.push({
      topic: "Privacy",
      confidence: 0.95
    });
  }
  
  if (entities.some(e => e.text.toLowerCase().includes('consumer'))) {
    topics.push({
      topic: "Consumer Protection",
      confidence: 0.9
    });
  }
  
  return topics;
}

async function analyzeSampleData() {
  console.log("Starting sample data analysis...\n");
  
  try {
    // Extract entities
    console.log("--- Entity Extraction ---");
    const entities = extractEntities(sampleBillText);
    console.log(`Found ${entities.length} entities:`);
    entities.slice(0, 10).forEach((entity, index) => {
      console.log(`${index + 1}. ${entity.text} (${entity.type}) - Relevance: ${entity.relevance}`);
    });
    
    // Analyze sentiment
    console.log("\n--- Sentiment Analysis ---");
    const sentiment = analyzeSentiment(sampleBillText);
    console.log(`Polarity: ${sentiment.polarity} (${sentiment.polarity > 0 ? 'Positive' : sentiment.polarity < 0 ? 'Negative' : 'Neutral'})`);
    console.log(`Subjectivity: ${sentiment.subjectivity} (${sentiment.subjectivity > 0.5 ? 'Subjective' : 'Objective'})`);
    
    // Extract key phrases
    console.log("\n--- Key Phrase Extraction ---");
    const keyPhrases = extractKeyPhrases(sampleBillText);
    console.log("Top key phrases:");
    keyPhrases.slice(0, 10).forEach((phrase, index) => {
      console.log(`${index + 1}. ${phrase.phrase} - Score: ${phrase.score}`);
    });
    
    // Summarize text
    console.log("\n--- Text Summarization ---");
    const summary = summarizeText(sampleBillText);
    console.log("Summary:");
    console.log(summary);
    
    // Analyze topics
    console.log("\n--- Topic Analysis ---");
    const topics = analyzeTopics(entities);
    console.log("Identified topics:");
    topics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.topic} - Confidence: ${topic.confidence}`);
    });
    
    // Generate insights
    console.log("\n--- Insights ---");
    console.log("1. The bill focuses on data privacy and consumer protection");
    console.log("2. It establishes a comprehensive framework with specific consumer rights");
    console.log("3. Strong emphasis on enforcement with civil penalties");
    console.log("4. Positive sentiment toward consumer protection");
    console.log("5. Key entities include Congress, data controllers, and consumers");
    
    console.log("\n--- Analysis Complete ---");
    
  } catch (error) {
    console.error("Error during sample data analysis:", error);
  }
}

// Run the analysis
analyzeSampleData().catch(console.error);