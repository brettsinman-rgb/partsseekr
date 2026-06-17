-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "manufacturer" TEXT,
    "currentLowestPrice" DOUBLE PRECISION,
    "targetPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3),
    "lastResultTitle" TEXT,
    "lastResultUrl" TEXT,
    "lastResultPrice" DOUBLE PRECISION,
    "lastResultImage" TEXT,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceAlert_userId_idx" ON "PriceAlert"("userId");

-- CreateIndex
CREATE INDEX "PriceAlert_status_idx" ON "PriceAlert"("status");

-- CreateIndex
CREATE INDEX "PriceAlert_lastCheckedAt_idx" ON "PriceAlert"("lastCheckedAt");

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
