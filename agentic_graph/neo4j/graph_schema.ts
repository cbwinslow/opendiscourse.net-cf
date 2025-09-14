// Graph schema definition for the political knowledge graph
// Defines the structure of nodes and relationships in the Neo4j database

export interface GraphNode {
  label: string;
  properties: string[];
  requiredProperties: string[];
}

export interface GraphRelationship {
  type: string;
  from: string;
  to: string;
  properties: string[];
}

export class GraphSchema {
  static readonly NODES: GraphNode[] = [
    {
      label: "Politician",
      properties: [
        "id",
        "name",
        "firstName",
        "lastName",
        "fullName",
        "birthDate",
        "party",
        "state",
        "district",
        "chamber",
        "bioguideId",
        "govtrackId",
        "opensecretsId",
        "votesmartId",
        "fecIds",
        "cspanId",
        "wikipediaId",
        "ballotpediaId",
        "maplightId",
        "icpsrId",
        "twitterId",
        "youtubeId",
        "facebookId",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "name"],
    },
    {
      label: "Legislation",
      properties: [
        "id",
        "billId",
        "title",
        "shortTitle",
        "congress",
        "type",
        "number",
        "introducedDate",
        "latestActionDate",
        "latestActionText",
        "summary",
        "summaryShort",
        "keywords",
        "subjects",
        "committees",
        "relatedBills",
        "cosponsorsCount",
        "primarySubject",
        "createdAt",
        "updatedAt",
      ],
      requiredProperties: ["id", "billId", "title"],
    },
    {
      label: "GovernmentBody",
      properties: [
        "id",
        "name",
        "type",
        "chamber",
        "url",
        "address",
        "phone",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "name"],
    },
    {
      label: "Vote",
      properties: [
        "id",
        "voteId",
        "billId",
        "chamber",
        "congress",
        "session",
        "actionDate",
        "question",
        "result",
        "totalYes",
        "totalNo",
        "totalPresent",
        "totalAbsent",
        "democraticYes",
        "democraticNo",
        "republicanYes",
        "republicanNo",
        "independentYes",
        "independentNo",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "voteId", "billId"],
    },
    {
      label: "Action",
      properties: [
        "id",
        "actionType",
        "actionDate",
        "text",
        "chamber",
        "committee",
        "sourceSystem",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "actionDate", "text"],
    },
    {
      label: "Statement",
      properties: [
        "id",
        "speakerId",
        "speakerName",
        "text",
        "date",
        "source",
        "url",
        "topic",
        "sentiment",
        "biasScore",
        "factCheckScore",
        "hateSpeechScore",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "speakerId", "text", "date"],
    },
    {
      label: "MediaAppearance",
      properties: [
        "id",
        "speakerId",
        "speakerName",
        "title",
        "date",
        "source",
        "url",
        "transcript",
        "duration",
        "topics",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "speakerId", "title", "date"],
    },
    {
      label: "SocialMediaPost",
      properties: [
        "id",
        "postId",
        "platform",
        "speakerId",
        "speakerName",
        "text",
        "date",
        "url",
        "likes",
        "shares",
        "comments",
        "sentiment",
        "biasScore",
        "hateSpeechScore",
        "createdDate",
        "lastUpdated",
      ],
      requiredProperties: ["id", "postId", "platform", "speakerId", "text"],
    },
    {
      label: "Organization",
      properties: ["id", "name", "type", "url", "createdDate", "lastUpdated"],
      requiredProperties: ["id", "name"],
    },
  ];

  static readonly RELATIONSHIPS: GraphRelationship[] = [
    {
      type: "MEMBER_OF",
      from: "Politician",
      to: "GovernmentBody",
      properties: ["startDate", "endDate", "role", "party", "createdDate"],
    },
    {
      type: "SPONSORS",
      from: "Politician",
      to: "Legislation",
      properties: ["date", "isPrimary", "createdDate"],
    },
    {
      type: "VOTES_ON",
      from: "Politician",
      to: "Vote",
      properties: ["vote", "createdDate"],
    },
    {
      type: "AUTHORS",
      from: "Politician",
      to: "Statement",
      properties: ["date", "createdDate"],
    },
    {
      type: "MAKES",
      from: "Politician",
      to: "Statement",
      properties: ["date", "createdDate"],
    },
    {
      type: "APPEARS_IN",
      from: "Politician",
      to: "MediaAppearance",
      properties: ["date", "createdDate"],
    },
    {
      type: "POSTS",
      from: "Politician",
      to: "SocialMediaPost",
      properties: ["date", "createdDate"],
    },
    {
      type: "AFFILIATED_WITH",
      from: "Politician",
      to: "Organization",
      properties: ["startDate", "endDate", "role", "createdDate"],
    },
    {
      type: "OPPOSES",
      from: "Politician",
      to: "Legislation",
      properties: ["date", "reason", "createdDate"],
    },
    {
      type: "SUPPORTS",
      from: "Politician",
      to: "Legislation",
      properties: ["date", "reason", "createdDate"],
    },
    {
      type: "DECLARED_IN",
      from: "Action",
      to: "Legislation",
      properties: ["date", "createdDate"],
    },
    {
      type: "AFFECTS",
      from: "Legislation",
      to: "Politician",
      properties: ["provision", "createdDate"],
    },
    {
      type: "REFERENCES",
      from: "Legislation",
      to: "Legislation",
      properties: ["type", "createdDate"],
    },
    {
      type: "RELATED_TO",
      from: "Legislation",
      to: "Legislation",
      properties: ["type", "createdDate"],
    },
  ];

  // Get node definition by label
  static getNodeByLabel(label: string): GraphNode | undefined {
    return this.NODES.find((node) => node.label === label);
  }

  // Get relationship definition by type
  static getRelationshipByType(type: string): GraphRelationship | undefined {
    return this.RELATIONSHIPS.find((rel) => rel.type === type);
  }

  // Validate node properties
  static validateNode(label: string, properties: Record<string, any>): boolean {
    const nodeDef = this.getNodeByLabel(label);
    if (!nodeDef) return false;

    // Check required properties
    for (const requiredProp of nodeDef.requiredProperties) {
      if (!(requiredProp in properties)) {
        console.error(
          `Missing required property '${requiredProp}' for node type '${label}'`,
        );
        return false;
      }
    }

    return true;
  }

  // Validate relationship properties
  static validateRelationship(
    type: string,
    properties: Record<string, any>,
  ): boolean {
    const relDef = this.getRelationshipByType(type);
    if (!relDef) return false;

    // For now, we'll just return true as all relationships are valid
    // In a more complex system, we might validate specific properties
    return true;
  }
}
