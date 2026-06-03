-- Bump counter used by SSE clients to detect seating map changes (Vercel-safe).
ALTER TABLE "Event" ADD COLUMN "seatingRevision" INTEGER NOT NULL DEFAULT 0;
