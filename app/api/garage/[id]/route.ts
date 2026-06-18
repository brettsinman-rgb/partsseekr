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

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to update your garage.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null) as GarageVehiclePayload | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid vehicle details.' }, { status: 400 });
  }

  const parsed = parseGarageVehicle(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await prisma.garageVehicle.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
  }

  const vehicle = await prisma.garageVehicle.update({
    where: { id },
    data: parsed.data
  });

  return NextResponse.json({ vehicle });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to update your garage.' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.garageVehicle.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
  }

  await prisma.garageVehicle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
