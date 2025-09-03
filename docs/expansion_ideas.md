# Expansion ideas for OpenDiscourse.net

Short brainstorm of features and modules to build a political document analysis and politician profile database.

Core features
- Centralized "Individuals" table with profiles, verified handles, contact metadata, and provenance.
- Ingestion pipeline connectors: X (Twitter) API, YouTube (video/audio), RSS news feeds, public gov records, official websites, press releases.
- Raw content buckets (S3/MinIO) for: audio, video, full-text, attachments, metadata.
- Transcription pipeline (Whisper/OpenAI) to produce searchable text from audio/video.
- NLP/AI pipeline to compute metrics/KPIs per individual: bias, accuracy, truthfulness, centricity, toxicity, outreach, media exposure metrics.
- Dashboard: profiles, timeline, KPI graphs, source links, download/export.
- Trust and provenance: store source, fetch date, confidence score, link back to originals.

Advanced features
- Cross-source deduplication and entity resolution (resolve multiple aliases to one individual).
- Automated issue creation (Jira / Linear / GitLab / Bitbucket) for flagged items (possible disinfo, legal takedown requests, or follow-ups).
- Community contributions with moderation, audit logs, and takedown requests.
- Verifiable citations and support for academic-style references.
- Invite-only research groups and paid subscriptions with export rights.

Privacy, legal and ethics
- Design for opt-out and data removal.
- Restrict scraping to public data only and document sources.
- Have legal review for Terms and Privacy before collecting contact info or personal data.

Next steps (implementation)
1. Add DB schema and Pydantic models for individuals and metrics.
2. Build modular collectors (start with X and YouTube) that record raw JSON to S3/local bucket and create normalized records.
3. Add transcription and storage to buckets.
4. Implement metrics module with pluggable model backends (local or cloud LLMs).
5. Wire dashboards and per-individual pages.
