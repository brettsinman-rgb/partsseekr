import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type GarageVehiclePayload = {
  make?: unknown;
  model?: unknown;
  year?: unknown;
  series?: unknown;
  engine?: unknown;
  badge?: unknown;
};

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

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function parseGarageVehicle(body: GarageVehiclePayload) {
  const make = cleanString(body.make);
  const model = cleanString(body.model);
  const year = Number(body.year);

  if (!make) return { error: 'Make is required.' };
  if (!model) return { error: 'Model is required.' };
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1) {
    return { error: 'Enter a valid vehicle year.' };
  }

  return {
    data: {
      make,
      model,
      year,
      series: optionalString(body.series),
      engine: optionalString(body.engine),
      badge: optionalString(body.badge)
    }
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to view your garage.' }, { status: 401 });
  }

  const vehicles = await prisma.garageVehicle.findMany({
    where: { userId: user.id },
    orderBy: [{ year: 'desc' }, { make: 'asc' }, { model: 'asc' }]
  });

  return NextResponse.json({ vehicles });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to add a vehicle.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as GarageVehiclePayload | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid vehicle details.' }, { status: 400 });
  }

  const parsed = parseGarageVehicle(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const vehicle = await prisma.garageVehicle.create({
    data: {
      userId: user.id,
      ...parsed.data
    }
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
