-- Migration 0004: GovInfo.gov database schema

-- Packages table (main documents)
CREATE TABLE govinfo_packages (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL UNIQUE,
    title TEXT,
    category TEXT,
    date_issued TEXT,
    last_modified TEXT,
    collection_code TEXT,
    congress INTEGER,
    type TEXT,
    number TEXT,
    volume TEXT,
    session TEXT,
    associated_date TEXT,
    granules_link TEXT,
    previous_link TEXT,
    next_link TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Package metadata
CREATE TABLE govinfo_package_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES govinfo_packages (package_id) ON DELETE CASCADE
);

-- Package identifiers
CREATE TABLE govinfo_package_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES govinfo_packages (package_id) ON DELETE CASCADE
);

-- Package downloads
CREATE TABLE govinfo_package_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES govinfo_packages (package_id) ON DELETE CASCADE
);

-- Granules (document sections)
CREATE TABLE govinfo_granules (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL,
    granule_id TEXT NOT NULL,
    title TEXT,
    date_issued TEXT,
    last_modified TEXT,
    category TEXT,
    chapters_link TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES govinfo_packages (package_id) ON DELETE CASCADE
);

-- Granule metadata
CREATE TABLE govinfo_granule_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    granule_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (granule_id) REFERENCES govinfo_granules (granule_id) ON DELETE CASCADE
);

-- Granule downloads
CREATE TABLE govinfo_granule_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    granule_id TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (granule_id) REFERENCES govinfo_granules (granule_id) ON DELETE CASCADE
);

-- Chapters (granule sections)
CREATE TABLE govinfo_chapters (
    id TEXT PRIMARY KEY,
    granule_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    title TEXT,
    level TEXT,
    part TEXT,
    section TEXT,
    from_date TEXT,
    to_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (granule_id) REFERENCES govinfo_granules (granule_id) ON DELETE CASCADE
);

-- Chapter metadata
CREATE TABLE govinfo_chapter_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES govinfo_chapters (chapter_id) ON DELETE CASCADE
);

-- Chapter downloads
CREATE TABLE govinfo_chapter_downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES govinfo_chapters (chapter_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_govinfo_packages_package_id ON govinfo_packages(package_id);
CREATE INDEX idx_govinfo_packages_category ON govinfo_packages(category);
CREATE INDEX idx_govinfo_packages_date ON govinfo_packages(date_issued);
CREATE INDEX idx_govinfo_packages_congress ON govinfo_packages(congress);
CREATE INDEX idx_govinfo_packages_type ON govinfo_packages(type);
CREATE INDEX idx_govinfo_package_metadata_package_id ON govinfo_package_metadata(package_id);
CREATE INDEX idx_govinfo_package_identifiers_package_id ON govinfo_package_identifiers(package_id);
CREATE INDEX idx_govinfo_package_downloads_package_id ON govinfo_package_downloads(package_id);
CREATE INDEX idx_govinfo_granules_package_id ON govinfo_granules(package_id);
CREATE INDEX idx_govinfo_granules_granule_id ON govinfo_granules(granule_id);
CREATE INDEX idx_govinfo_granule_metadata_granule_id ON govinfo_granule_metadata(granule_id);
CREATE INDEX idx_govinfo_granule_downloads_granule_id ON govinfo_granule_downloads(granule_id);
CREATE INDEX idx_govinfo_chapters_granule_id ON govinfo_chapters(granule_id);
CREATE INDEX idx_govinfo_chapters_chapter_id ON govinfo_chapters(chapter_id);
CREATE INDEX idx_govinfo_chapter_metadata_chapter_id ON govinfo_chapter_metadata(chapter_id);
CREATE INDEX idx_govinfo_chapter_downloads_chapter_id ON govinfo_chapter_downloads(chapter_id);