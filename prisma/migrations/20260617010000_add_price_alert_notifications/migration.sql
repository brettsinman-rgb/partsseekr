-- Add notification and triggered-product metadata for Price Alerts.
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "notificationType" TEXT NOT NULL DEFAULT 'in_app';
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "notificationStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "notificationSentAt" TIMESTAMP(3);
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "triggeredPrice" DOUBLE PRECISION;
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "triggeredProductTitle" TEXT;
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "triggeredProductUrl" TEXT;
ALTER TABLE "PriceAlert" ADD COLUMN IF NOT EXISTS "triggeredProductImage" TEXT;

CREATE INDEX IF NOT EXISTS "PriceAlert_notificationStatus_idx" ON "PriceAlert"("notificationStatus");
