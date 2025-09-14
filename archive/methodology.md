# Methodology: Political Document Analysis (GovInfo + Social + NLP + Graph)

Welcome to the lab manual. We like reproducible science with a side of 90s flair.

```ascii
[govinfo.gov/bulkdata] -> [raw_govinfo.*] -> [staging.documents]
                                      |                  |
                                      |                  +-> [nlp.*] -> [graph.*]
                                      |                               ^
                                      +-> [audit.*] <-----------------+
```

1. Harvest (MCP)

- Register source/endpoints in mcp.sources/mcp.endpoints (e.g., BILLS, CREC).
- Define harvest_jobs and log harvest_runs with effective params and footprints (IP, bytes, errors).

2. Ingest & Normalize

- For each fetched package/granule/file:
  - raw_govinfo.packages/granules/files capture metadata and text (if extractable).
  - Normalize the canonical text into staging.documents (source_type, congress, chamber, url).
  - Compute sha256 to dedupe and support provenance linking.

3. People & Memberships

- Load rosters into people.politicians (map bioguide IDs) and people.memberships to link persons to 118th Congress (or others).
- Committees and committee_members capture institutional context.

4. Social + Media

- Ingest official Twitter/X accounts into social.twitter_accounts and social.tweets.
- Capture transcripts of media appearances in social.media_appearances.
- Normalize tweets/media into staging.documents (source_type='tweet'/'media') for unified NLP.

5. NLP Pipeline

- Register models in nlp.models (spaCy, SBERT, BERT, toxicity/sentiment, summarizers).
- For each pass, log nlp.runs (params, versions, node, IP) for reproducibility.
- Produce:
  - nlp.embeddings: vector(1536) or your model’s dim; ivfflat index post-warmup.
  - nlp.ner_entities: entities with spans, labels, confidences, canonicalization.
  - nlp.relations: edges like MEMBER_OF, SPONSORS, MENTIONS with evidence texts.
  - nlp.sentiment_results / nlp.toxicity_results / nlp.topic_results / nlp.keyphrase_results / nlp.summaries.
  - nlp.metrics: generic scalar metrics for experimental logging.
- Store provenance in audit.provenance for input/output hashes per run.

6. Graph RAG

- Build graph.entities from canonicalized entities (PERSON, ORG, LAW, TOPIC).
- graph.edges store relations with confidence, evidence_text, and references to source docs/runs.
- Use Graph RAG to expand contexts before synthesis.

7. Retrieval-Augmented Generation (RAG)

- Use pgvector similarity search over nlp.embeddings to retrieve top-k chunks per query.
- Optionally blend with Qdrant/Weaviate as parallel stores for experimentation.

8. Observability & Ethics

- Metrics and logs in your monitoring stack.
- Methodology + experiments documented under audit.\*; we don’t do mystery meat AI.

Deliverables stored

- Models, runs, parameters, results, timestamps, IPs/locations (where relevant), provenance.
- Views for common questions:
  - staging.v_member_statements
  - social.v_politician_tweets
  - graph.v_edges_named

Note on creativity

- We use hashed embeddings for quick demos (zero dependency) and invite you to plug in the big guns when you’re ready. Dare to be weird. But reproducible weird.

Wehoooooohooooo! Screen name: RAGamuffin_98, away message: “brb indexing the Federalist Papers”.
