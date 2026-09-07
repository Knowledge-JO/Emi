-- Semantic agent and capability discovery needs pgvector. The extension has to exist before any
-- `vector` column or hnsw index is created, so this runs as its own first migration.
CREATE EXTENSION IF NOT EXISTS vector;
