-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "portraitAlt" TEXT,
ADD COLUMN     "portraitHeight" INTEGER,
ADD COLUMN     "portraitKey" TEXT,
ADD COLUMN     "portraitStorage" "ImageStorage",
ADD COLUMN     "portraitWidth" INTEGER,
ADD COLUMN     "statement" TEXT NOT NULL DEFAULT '';

-- ------------------------------------------------------------------------
-- The gallery shows and sells the work of one artist: its owner.
-- ------------------------------------------------------------------------

-- The first demonstration collection showed public-domain works by many
-- painters. Remove it: only demonstration works that never had an order,
-- then the old demonstration artists and exhibitions left empty. Real works
-- (isDemo = false) and anything with an order are never touched.
DELETE FROM "Artwork" a
WHERE a."isDemo"
  AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."artworkId" = a."id");

DELETE FROM "Artist" ar
WHERE ar."slug" IN (
    'johannes-vermeer', 'caspar-david-friedrich', 'john-singer-sargent', 'frederic-edwin-church',
    'rembrandt-van-rijn', 'caravaggio', 'vincent-van-gogh', 'edgar-degas', 'winslow-homer',
    'albert-pinkham-ryder', 'vilhelm-hammershoi', 'jean-simeon-chardin', 'j-m-w-turner', 'georges-seurat'
  )
  AND NOT EXISTS (SELECT 1 FROM "Artwork" w WHERE w."artistId" = ar."id");

DELETE FROM "Exhibition" e
WHERE e."slug" IN ('nocturnes', 'the-quiet-interior', 'open-air')
  AND NOT EXISTS (SELECT 1 FROM "ExhibitionWork" ew WHERE ew."exhibitionId" = e."id");

-- With one artist, "published" could only take down the whole gallery.
ALTER TABLE "Artist" DROP COLUMN "published";

-- At most one artist, ever: every row has the same value for this index.
CREATE UNIQUE INDEX "Artist_only_one" ON "Artist" ((true));

-- A portrait is all or nothing, and always described.
ALTER TABLE "Artist"
  ADD CONSTRAINT "Artist_portrait_complete" CHECK (
    ("portraitKey" IS NULL AND "portraitStorage" IS NULL AND "portraitWidth" IS NULL AND "portraitHeight" IS NULL)
    OR ("portraitKey" IS NOT NULL AND "portraitStorage" IS NOT NULL AND "portraitWidth" > 0 AND "portraitHeight" > 0
        AND length(btrim(coalesce("portraitAlt", ''))) > 0)
  );
