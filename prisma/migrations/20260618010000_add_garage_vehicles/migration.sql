-- Add saved garage vehicles for signed-in users.
CREATE TABLE IF NOT EXISTS "GarageVehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "series" TEXT,
    "engine" TEXT,
    "badge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarageVehicle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GarageVehicle_userId_idx" ON "GarageVehicle"("userId");
CREATE INDEX IF NOT EXISTS "GarageVehicle_make_model_year_idx" ON "GarageVehicle"("make", "model", "year");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'GarageVehicle_userId_fkey'
  ) THEN
    ALTER TABLE "GarageVehicle"
    ADD CONSTRAINT "GarageVehicle_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
