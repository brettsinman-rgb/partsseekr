import { NextResponse } from 'next/server';
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

function priceAlertError(error: unknown, fallback: string, status = 500) {
  const message = error instanceof Error ? error.message : undefined;
  const isKnownMigrationIssue =
    message?.includes('PriceAlert') ||
    message?.includes('price_alerts') ||
    message?.includes('does not exist') ||
    message?.includes('table') ||
    message?.includes('column');

  return NextResponse.json(
    {
      error: isKnownMigrationIssue
        ? 'Price alerts are not available yet. Please try again later.'
        : fallback,
      message: isKnownMigrationIssue
        ? 'The price alert database table may not be ready.'
        : undefined
    },
    { status }
  );
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view price alerts.' }, { status: 401 });
    }

    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    return priceAlertError(error, 'Could not load price alerts. Please try again.');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to create a price alert.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as {
      sessionId?: string;
      targetPrice?: number | string | null;
    } | null;

    if (!body?.sessionId) {
      return NextResponse.json({ error: 'Missing search session.' }, { status: 400 });
    }

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

    const parsedTarget =
      body.targetPrice === null || body.targetPrice === undefined || body.targetPrice === ''
        ? null
        : Number(body.targetPrice);

    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      return NextResponse.json({ error: 'Enter a valid target price.' }, { status: 400 });
    }

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
        lastResultImage: lowest.image
      }
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    return priceAlertError(error, 'Could not create price alert. Please try again.');
  }
}
