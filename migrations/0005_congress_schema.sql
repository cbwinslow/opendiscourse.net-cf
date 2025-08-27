-- Migration 0005: Congress.gov database schema

-- Bills table
CREATE TABLE congress_bills (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL UNIQUE,
    title TEXT,
    congress INTEGER,
    type TEXT,
    number INTEGER,
    introduced_date TEXT,
    sponsor_title TEXT,
    sponsor_name TEXT,
    sponsor_state TEXT,
    sponsor_party TEXT,
    cosponsors_count INTEGER,
    committees TEXT,
    latest_action_date TEXT,
    latest_action TEXT,
    xml_url TEXT,
    pdf_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Bill subjects
CREATE TABLE congress_bill_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES congress_bills (bill_id) ON DELETE CASCADE
);

-- Bill summaries
CREATE TABLE congress_bill_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    version TEXT,
    action_date TEXT,
    action_desc TEXT,
    summary_text TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES congress_bills (bill_id) ON DELETE CASCADE
);

-- Bill actions
CREATE TABLE congress_bill_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    action_date TEXT,
    action_type TEXT,
    action_name TEXT,
    action_stage TEXT,
    action_text TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES congress_bills (bill_id) ON DELETE CASCADE
);

-- Bill cosponsors
CREATE TABLE congress_bill_cosponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    cosponsor_name TEXT,
    cosponsor_state TEXT,
    cosponsor_party TEXT,
    cosponsor_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES congress_bills (bill_id) ON DELETE CASCADE
);

-- Bill committees
CREATE TABLE congress_bill_committees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    committee_name TEXT,
    committee_activity TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES congress_bills (bill_id) ON DELETE CASCADE
);

-- Bill related bills
CREATE TABLE congress_bill_related_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    related_bill_id TEXT,
    relation_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES congress_bills (bill_id) ON DELETE CASCADE
);

-- Members of Congress
CREATE TABLE congress_members (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    state TEXT,
    party TEXT,
    chamber TEXT,
    district INTEGER,
    start_date TEXT,
    end_date TEXT,
    phone TEXT,
    fax TEXT,
    website TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Committees
CREATE TABLE congress_committees (
    id TEXT PRIMARY KEY,
    committee_id TEXT NOT NULL UNIQUE,
    name TEXT,
    chamber TEXT,
    parent_committee_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Committee members
CREATE TABLE congress_committee_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    committee_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    rank INTEGER,
    party TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (committee_id) REFERENCES congress_committees (committee_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES congress_members (member_id) ON DELETE CASCADE
);

-- Hearings
CREATE TABLE congress_hearings (
    id TEXT PRIMARY KEY,
    hearing_id TEXT NOT NULL UNIQUE,
    committee_id TEXT,
    chamber TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    title TEXT,
    xml_url TEXT,
    pdf_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (committee_id) REFERENCES congress_committees (committee_id) ON DELETE CASCADE
);

-- Hearing witnesses
CREATE TABLE congress_hearing_witnesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hearing_id TEXT NOT NULL,
    name TEXT,
    organization TEXT,
    position TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hearing_id) REFERENCES congress_hearings (hearing_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_congress_bills_bill_id ON congress_bills(bill_id);
CREATE INDEX idx_congress_bills_congress ON congress_bills(congress);
CREATE INDEX idx_congress_bills_type ON congress_bills(type);
CREATE INDEX idx_congress_bills_introduced_date ON congress_bills(introduced_date);
CREATE INDEX idx_congress_bills_sponsor_name ON congress_bills(sponsor_name);
CREATE INDEX idx_congress_bill_subjects_bill_id ON congress_bill_subjects(bill_id);
CREATE INDEX idx_congress_bill_summaries_bill_id ON congress_bill_summaries(bill_id);
CREATE INDEX idx_congress_bill_actions_bill_id ON congress_bill_actions(bill_id);
CREATE INDEX idx_congress_bill_cosponsors_bill_id ON congress_bill_cosponsors(bill_id);
CREATE INDEX idx_congress_bill_committees_bill_id ON congress_bill_committees(bill_id);
CREATE INDEX idx_congress_bill_related_bills_bill_id ON congress_bill_related_bills(bill_id);
CREATE INDEX idx_congress_members_member_id ON congress_members(member_id);
CREATE INDEX idx_congress_members_state ON congress_members(state);
CREATE INDEX idx_congress_members_party ON congress_members(party);
CREATE INDEX idx_congress_committees_committee_id ON congress_committees(committee_id);
CREATE INDEX idx_congress_committee_members_committee_id ON congress_committee_members(committee_id);
CREATE INDEX idx_congress_committee_members_member_id ON congress_committee_members(member_id);
CREATE INDEX idx_congress_hearings_hearing_id ON congress_hearings(hearing_id);
CREATE INDEX idx_congress_hearings_committee_id ON congress_hearings(committee_id);
CREATE INDEX idx_congress_hearings_date ON congress_hearings(date);
CREATE INDEX idx_congress_hearing_witnesses_hearing_id ON congress_hearing_witnesses(hearing_id);