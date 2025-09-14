// Entity extraction service using BERT-based Named Entity Recognition
// Extracts entities and relationships from political documents

interface Entity {
  text: string;
  label: string;
  confidence: number;
  startPosition: number;
  endPosition: number;
}

interface Relationship {
  subject: Entity;
  predicate: string;
  object: Entity;
  confidence: number;
}

export class EntityExtractor {
  // Extract entities from text using BERT-based NER
  static async extractEntities(text: string): Promise<Entity[]> {
    // In a real implementation, we would use a BERT-based NER model
    // For now, we'll simulate entity extraction

    console.log(`Extracting entities from text: ${text.substring(0, 50)}...`);

    // Simulated entities based on common political document patterns
    const entities: Entity[] = [];

    // Extract person names (politicians)
    const personMatches = text.match(
      /\b(?:Senator|Representative|President|Governor|Mayor|Councilmember|Assemblymember)\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g,
    );
    if (personMatches) {
      personMatches.forEach((match) => {
        entities.push({
          text: match.replace(
            /^(?:Senator|Representative|President|Governor|Mayor|Councilmember|Assemblymember)\s+/,
            "",
          ),
          label: "PERSON",
          confidence: 0.95,
          startPosition: text.indexOf(match),
          endPosition: text.indexOf(match) + match.length,
        });
      });
    }

    // Extract organizations
    const orgMatches = text.match(
      /\b(?:Congress|House|Senate|Supreme Court|Department of [A-Za-z]+|Federal [A-Za-z]+|American [A-Za-z]+|[A-Z][a-z]+\s+(?:Committee|Commission|Agency|Bureau))\b/g,
    );
    if (orgMatches) {
      orgMatches.forEach((match) => {
        entities.push({
          text: match,
          label: "ORG",
          confidence: 0.9,
          startPosition: text.indexOf(match),
          endPosition: text.indexOf(match) + match.length,
        });
      });
    }

    // Extract government bodies
    const govMatches = text.match(
      /\b(?:118th Congress|117th Congress|House of Representatives|United States Senate|State Senate|State Assembly)\b/g,
    );
    if (govMatches) {
      govMatches.forEach((match) => {
        entities.push({
          text: match,
          label: "GOV_BODY",
          confidence: 0.95,
          startPosition: text.indexOf(match),
          endPosition: text.indexOf(match) + match.length,
        });
      });
    }

    // Extract dates
    const dateMatches = text.match(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    );
    if (dateMatches) {
      dateMatches.forEach((match) => {
        entities.push({
          text: match,
          label: "DATE",
          confidence: 0.95,
          startPosition: text.indexOf(match),
          endPosition: text.indexOf(match) + match.length,
        });
      });
    }

    // Extract legislation names (bills)
    const billMatches = text.match(
      /\b(?:H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.)\s*\d+\b/g,
    );
    if (billMatches) {
      billMatches.forEach((match) => {
        entities.push({
          text: match,
          label: "LEGISLATION",
          confidence: 0.95,
          startPosition: text.indexOf(match),
          endPosition: text.indexOf(match) + match.length,
        });
      });
    }

    return entities;
  }

  // Extract relationships between entities
  static async extractRelationships(
    text: string,
    entities: Entity[],
  ): Promise<Relationship[]> {
    // In a real implementation, we would use relationship extraction models
    // For now, we'll simulate relationship extraction based on patterns

    console.log(`Extracting relationships from ${entities.length} entities`);

    const relationships: Relationship[] = [];

    // Look for patterns like "Senator X introduced bill Y"
    for (const entity of entities) {
      if (entity.label === "PERSON") {
        // Check if this person introduced legislation
        const introducedMatch = text.match(
          new RegExp(
            `${entity.text}\\s+(?:introduced|sponsored)\\s+((?:H\\.R\\.|S\\.|H\\.J\\.Res\\.|S\\.J\\.Res\\.|H\\.Con\\.Res\\.|S\\.Con\\.Res\\.|H\\.Res\\.|S\\.Res\\.)\\s*\\d+)`,
            "i",
          ),
        );
        if (introducedMatch) {
          const billEntity = entities.find(
            (e) => e.text === introducedMatch[1] && e.label === "LEGISLATION",
          );
          if (billEntity) {
            relationships.push({
              subject: entity,
              predicate: "SPONSORS",
              object: billEntity,
              confidence: 0.9,
            });
          }
        }

        // Check if this person is a member of a government body
        const memberMatch = text.match(
          new RegExp(
            `${entity.text}\\s+(?:is|was)\\s+(?:a|an)\\s+member\\s+of\\s+((?:118th Congress|117th Congress|House of Representatives|United States Senate|State Senate|State Assembly))`,
            "i",
          ),
        );
        if (memberMatch) {
          const govEntity = entities.find(
            (e) => e.text === memberMatch[1] && e.label === "GOV_BODY",
          );
          if (govEntity) {
            relationships.push({
              subject: entity,
              predicate: "MEMBER_OF",
              object: govEntity,
              confidence: 0.85,
            });
          }
        }
      }
    }

    return relationships;
  }

  // Extract actions from text (who did what to whom)
  static async extractActions(text: string): Promise<any[]> {
    // In a real implementation, we would use more sophisticated NLP models
    // For now, we'll simulate action extraction

    console.log(`Extracting actions from text: ${text.substring(0, 50)}...`);

    const actions: any[] = [];

    // Look for patterns like "Senator X voted for bill Y"
    const voteMatches = text.match(
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(voted for|voted against|supported|opposed)\s+((?:H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.)\s*\d+)/g,
    );
    if (voteMatches) {
      voteMatches.forEach((match) => {
        const parts = match.match(
          /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(voted for|voted against|supported|opposed)\s+((?:H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.)\s*\d+)/,
        );
        if (parts) {
          actions.push({
            actor: parts[1],
            action: parts[2],
            target: parts[3],
            type: "VOTE",
            confidence: 0.9,
          });
        }
      });
    }

    // Look for patterns like "The bill was signed by President X"
    const signedMatches = text.match(
      /((?:H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.)\s*\d+)\s+(?:was|is)\s+(?:signed|approved)\s+(?:by|by\s+President)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
    );
    if (signedMatches) {
      signedMatches.forEach((match) => {
        const parts = match.match(
          /((?:H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.)\s*\d+)\s+(?:was|is)\s+(?:signed|approved)\s+(?:by|by\s+President)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/,
        );
        if (parts) {
          actions.push({
            actor: parts[2],
            action: "SIGNED",
            target: parts[1],
            type: "LEGISLATIVE_ACTION",
            confidence: 0.95,
          });
        }
      });
    }

    return actions;
  }

  // Main extraction method that combines all extraction techniques
  static async extractAll(
    text: string,
  ): Promise<{
    entities: Entity[];
    relationships: Relationship[];
    actions: any[];
  }> {
    try {
      // Extract entities
      const entities = await this.extractEntities(text);

      // Extract relationships
      const relationships = await this.extractRelationships(text, entities);

      // Extract actions
      const actions = await this.extractActions(text);

      return {
        entities,
        relationships,
        actions,
      };
    } catch (error) {
      console.error("Error during entity extraction:", error);
      throw error;
    }
  }
}
