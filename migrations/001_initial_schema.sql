-- D1 Database Schema for OpenDiscourse
-- Migrating from Neo4j to Cloudflare D1

-- Politicians table
CREATE TABLE IF NOT EXISTS politicians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  birth_date TEXT,
  party TEXT,
  state TEXT,
  district TEXT,
  chamber TEXT,
  bioguide_id TEXT,
  govtrack_id TEXT,
  opensecrets_id TEXT,
  votesmart_id TEXT,
  fec_ids TEXT, -- JSON array
  cspan_id TEXT,
  wikipedia_id TEXT,
  ballotpedia_id TEXT,
  maplight_id TEXT,
  icpsr_id TEXT,
  twitter_id TEXT,
  youtube_id TEXT,
  facebook_id TEXT,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Legislation table
CREATE TABLE IF NOT EXISTS legislation (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  title TEXT NOT NULL,
  short_title TEXT,
  congress INTEGER,
  type TEXT,
  number TEXT,
  introduced_date TEXT,
  latest_action_date TEXT,
  latest_action_text TEXT,
  summary TEXT,
  summary_short TEXT,
  keywords TEXT, -- JSON array
  subjects TEXT, -- JSON array
  committees TEXT, -- JSON array
  related_bills TEXT, -- JSON array
  cosponsors_count INTEGER,
  primary_subject TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Government Bodies table
CREATE TABLE IF NOT EXISTS government_bodies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  chamber TEXT,
  url TEXT,
  address TEXT,
  phone TEXT,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  vote_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  chamber TEXT,
  congress INTEGER,
  session INTEGER,
  action_date TEXT,
  question TEXT,
  result TEXT,
  total_yes INTEGER,
  total_no INTEGER,
  total_present INTEGER,
  total_absent INTEGER,
  democratic_yes INTEGER,
  democratic_no INTEGER,
  republican_yes INTEGER,
  republican_no INTEGER,
  independent_yes INTEGER,
  independent_no INTEGER,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES legislation(id)
);

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  bill_id TEXT,
  action_type TEXT,
  action_date TEXT NOT NULL,
  text TEXT NOT NULL,
  chamber TEXT,
  committee TEXT,
  source_system TEXT,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES legislation(id)
);

-- Statements table
CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY,
  speaker_id TEXT,
  speaker_name TEXT,
  text TEXT,
  date TEXT,
  source TEXT,
  url TEXT,
  topic TEXT,
  sentiment REAL,
  bias_score REAL,
  fact_check_score REAL,
  hate_speech_score REAL,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (speaker_id) REFERENCES politicians(id)
);

-- Relationships tables (replacing Neo4j relationships)

-- Politician relationships
CREATE TABLE IF NOT EXISTS politician_relationships (
  id TEXT PRIMARY KEY,
  from_politician_id TEXT NOT NULL,
  to_politician_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- "COLLEAGUES", "PARTY_MEMBERS", etc.
  metadata TEXT, -- JSON for additional properties
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_politician_id) REFERENCES politicians(id),
  FOREIGN KEY (to_politician_id) REFERENCES politicians(id)
);

-- Bill sponsorship/cosponsorship
CREATE TABLE IF NOT EXISTS bill_sponsorship (
  id TEXT PRIMARY KEY,
  politician_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  sponsorship_type TEXT NOT NULL, -- "SPONSOR", "COSPONSOR"
  date_signed TEXT,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (politician_id) REFERENCES politicians(id),
  FOREIGN KEY (bill_id) REFERENCES legislation(id)
);

-- Committee memberships
CREATE TABLE IF NOT EXISTS committee_memberships (
  id TEXT PRIMARY KEY,
  politician_id TEXT NOT NULL,
  committee_name TEXT NOT NULL,
  role TEXT, -- "CHAIR", "RANKING_MEMBER", "MEMBER"
  start_date TEXT,
  end_date TEXT,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (politician_id) REFERENCES politicians(id)
);

-- Vote records (individual politician votes)
CREATE TABLE IF NOT EXISTS individual_votes (
  id TEXT PRIMARY KEY,
  vote_id TEXT NOT NULL,
  politician_id TEXT NOT NULL,
  position TEXT NOT NULL, -- "YEA", "NAY", "PRESENT", "NOT_VOTING"
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vote_id) REFERENCES votes(id),
  FOREIGN KEY (politician_id) REFERENCES politicians(id)
);

-- Document embeddings (for RAG functionality)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_type TEXT, -- "BILL", "STATEMENT", "SPEECH", etc.
  chunk_index INTEGER,
  text_content TEXT NOT NULL,
  embedding_vector TEXT, -- JSON array of floats
  metadata TEXT, -- JSON for additional properties
  created_date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_politicians_party ON politicians(party);
CREATE INDEX IF NOT EXISTS idx_politicians_state ON politicians(state);
CREATE INDEX IF NOT EXISTS idx_politicians_chamber ON politicians(chamber);
CREATE INDEX IF NOT EXISTS idx_legislation_congress ON legislation(congress);
CREATE INDEX IF NOT EXISTS idx_legislation_type ON legislation(type);
CREATE INDEX IF NOT EXISTS idx_votes_bill_id ON votes(bill_id);
CREATE INDEX IF NOT EXISTS idx_votes_chamber ON votes(chamber);
CREATE INDEX IF NOT EXISTS idx_actions_bill_id ON actions(bill_id);
CREATE INDEX IF NOT EXISTS idx_actions_date ON actions(action_date);
CREATE INDEX IF NOT EXISTS idx_statements_speaker_id ON statements(speaker_id);
CREATE INDEX IF NOT EXISTS idx_statements_date ON statements(date);
CREATE INDEX IF NOT EXISTS idx_bill_sponsorship_politician ON bill_sponsorship(politician_id);
CREATE INDEX IF NOT EXISTS idx_bill_sponsorship_bill ON bill_sponsorship(bill_id);
CREATE INDEX IF NOT EXISTS idx_committee_memberships_politician ON committee_memberships(politician_id);
CREATE INDEX IF NOT EXISTS idx_individual_votes_vote ON individual_votes(vote_id);
CREATE INDEX IF NOT EXISTS idx_individual_votes_politician ON individual_votes(politician_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_type ON document_embeddings(document_type);