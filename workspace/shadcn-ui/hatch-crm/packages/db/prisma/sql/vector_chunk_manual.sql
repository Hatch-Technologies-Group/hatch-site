CREATE TABLE IF NOT EXISTS "VectorChunk" (
  "id"          text PRIMARY KEY,
  "tenant_id"   text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id"   text NOT NULL,
  "chunk_index" integer NOT NULL,
  "content"     text NOT NULL,
  "embedding_f8" double precision[],
  "meta"        jsonb,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vectorchunk_tenant_entity_chunk_uq
  ON "VectorChunk" ("tenant_id", "entity_type", "entity_id", "chunk_index");

CREATE INDEX IF NOT EXISTS vectorchunk_tenant_entity_idx
  ON "VectorChunk" ("tenant_id", "entity_type", "entity_id");
