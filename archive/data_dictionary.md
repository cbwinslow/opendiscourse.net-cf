# Data Dictionary (Greatest Hits)

- mcp.sources
  - code: 'govinfo'
  - base_url: 'https://www.govinfo.gov/bulkdata'
- mcp.endpoints
  - collection_code: e.g., BILLS, CREC
  - path_template: e.g., /bulkdata/BILLS/{congress}/
- mcp.harvest_jobs / mcp.harvest_runs
  - Parameters, bytes, errors, IP geodata

- raw_govinfo.collections / packages / granules / files
  - Mirrors govinfo hierarchy with flexible metadata_json
  - files.content_text: extracted text when available

- staging.documents
  - Unified normalized docs (source_type enum)
  - sha256: content hash; language, congress, chamber, url, author

- people.politicians / memberships / committees / committee_members
  - Politician entities and institutional roles

- social.twitter_accounts / tweets / media_appearances
  - Official social content and transcripts

- nlp.models / runs
  - Registry of models and all executions w/ params and status
- nlp.embeddings
  - vector(1536), chunked text, tokens, run linkage
- nlp.ner_entities / relations
  - Entities with spans/labels; edges with types and confidence
- nlp.sentiment_results / toxicity_results / topic_results / keyphrase_results / summaries / metrics
  - Broad capture of classification/regression/generation outputs

- graph.entities / edges / entity_links
  - Canonical graph with optional mapping to politicians/committees

- audit.methodologies / experiments / experiment_runs / provenance
  - Your research journal in tables. Because future you will ask “how?”
