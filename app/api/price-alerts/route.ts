import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { findLowestResult } from '@/lib/price-alerts';

function inferManufacturer(query?: string | null) {
  if (!query) return null;
  const known = [
    'Volkswagen',
    'Mercedes-Benz',
    'Mercedes',
    'Toyota',
    'Audi',
    'Skoda',
    'Seat',
    'BMW',
    'Ford',
    'VAG',
    'VW'
  ];
  return known.find((brand) => query.toLowerCase().startsWith(`${brand.toLowerCase()} `)) ?? null;
}

function bestVisualResult<T extends { matchScore: number; price: number; image?: string | null }>(results: T[]) {
  return [...results]
    .filter((result) => result.image)
    .sort((a, b) => b.matchScore - a.matchScore || a.price - b.price)[0] ?? null;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return null;

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email }
  });

  return user;
}

function priceAlertError(error: unknown, fallback: string, status = 500, operation = 'unknown') {
  const message = error instanceof Error ? error.message : undefined;
  const prismaError = error instanceof Prisma.PrismaClientKnownRequestError ? error : null;
  const prismaCode = prismaError?.code;
  const prismaMeta = prismaError?.meta;

  if (process.env.NODE_ENV !== 'production') {
    console.error('[PriceAlerts] API error:', {
      operation,
      prismaCode,
      prismaMeta,
      message: message ?? String(error)
    });
  }

  const isKnownMigrationIssue =
    prismaCode === 'P2021' ||
    prismaCode === 'P2022' ||
    /\bPriceAlert\b.*\b(does not exist|column|table|relation)\b/i.test(message ?? '') ||
    /\b(lastResultImage|notificationType|notificationStatus|notificationSentAt|triggeredPrice|triggeredProductTitle|triggeredProductUrl|triggeredProductImage)\b/i.test(message ?? '') ||
    /\b(lastResultImage|notificationType|notificationStatus|notificationSentAt|triggeredPrice|triggeredProductTitle|triggeredProductUrl|triggeredProductImage)\b/i.test(JSON.stringify(prismaMeta ?? {}));

  return NextResponse.json(
    {
      error: isKnownMigrationIssue
        ? 'Price alerts are being updated. Please try again shortly.'
        : fallback,
      message: isKnownMigrationIssue
        ? 'The PriceAlert database schema is missing one or more required columns.'
        : process.env.NODE_ENV !== 'production'
          ? message
          : undefined,
      ...(process.env.NODE_ENV !== 'production'
        ? {
            debug: {
              operation,
              prismaCode,
              prismaMeta
            }
          }
        : {})
    },
    { status }
  );
}

export async function GET() {
  let operation = 'authenticate user';
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view price alerts.' }, { status: 401 });
    }

    operation = 'priceAlert.findMany';
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    return priceAlertError(error, 'Could not load price alerts. Please try again.', 500, operation);
  }
}

export async function POST(request: Request) {
  let operation = 'authenticate user';
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to create a price alert.' }, { status: 401 });
    }

    operation = 'parse request body';
    const body = await request.json().catch(() => null) as {
      sessionId?: string;
      targetPrice?: number | string | null;
    } | null;

    if (!body?.sessionId) {
      return NextResponse.json({ error: 'Missing search session.' }, { status: 400 });
    }

    operation = 'searchSession.findUnique';
    const session = await prisma.searchSession.findUnique({
      where: { id: body.sessionId },
      include: { results: true }
    });

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Search session not found.' }, { status: 404 });
    }

    if (!session.query) {
      return NextResponse.json({ error: 'Price alerts require a text search query.' }, { status: 400 });
    }

    const lowest = findLowestResult(session.results);
    if (!lowest) {
      return NextResponse.json({ error: 'No priced results are available for this search.' }, { status: 400 });
    }
    const visualResult = bestVisualResult(session.results);

    const parsedTarget =
      body.targetPrice === null || body.targetPrice === undefined || body.targetPrice === ''
        ? null
        : Number(body.targetPrice);

    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      return NextResponse.json({ error: 'Enter a valid target price.' }, { status: 400 });
    }

    operation = 'priceAlert.create';
    const alert = await prisma.priceAlert.create({
      data: {
        userId: user.id,
        searchQuery: session.query,
        manufacturer: inferManufacturer(session.query),
        currentLowestPrice: lowest.price,
        targetPrice: parsedTarget,
        currency: lowest.currency,
        status: 'active',
        lastResultTitle: lowest.title,
        lastResultUrl: lowest.productUrl,
        lastResultPrice: lowest.price,
        lastResultImage: visualResult?.image ?? lowest.image
      },
      select: {
        id: true,
        userId: true,
        searchQuery: true,
        manufacturer: true,
        currentLowestPrice: true,
        targetPrice: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastCheckedAt: true,
        triggeredAt: true,
        lastResultTitle: true,
        lastResultUrl: true,
        lastResultPrice: true,
        lastResultImage: true
      }
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    return priceAlertError(error, 'Could not create price alert. Please try again.', 500, operation);
  }
}
