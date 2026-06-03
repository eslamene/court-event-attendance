ALTER TABLE "Event" ADD COLUMN "seatingLayoutType" TEXT NOT NULL DEFAULT 'theater';
ALTER TABLE "Event" ADD COLUMN "seatingLayoutJson" TEXT NOT NULL DEFAULT '{}';
