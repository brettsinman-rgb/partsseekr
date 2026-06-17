import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to update price alerts.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null) as {
    status?: string;
    notificationStatus?: string;
  } | null;
  const status = body?.status;
  const notificationStatus = body?.notificationStatus;

  if (status && !['active', 'paused'].includes(status)) {
    return NextResponse.json({ error: 'Invalid alert status.' }, { status: 400 });
  }

  if (notificationStatus && !['pending', 'dismissed'].includes(notificationStatus)) {
    return NextResponse.json({ error: 'Invalid notification status.' }, { status: 400 });
  }

  if (!status && !notificationStatus) {
    return NextResponse.json({ error: 'No alert update provided.' }, { status: 400 });
  }

  const existing = await prisma.priceAlert.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Price alert not found.' }, { status: 404 });
  }

  const alert = await prisma.priceAlert.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(notificationStatus ? { notificationStatus } : {})
    }
  });

  return NextResponse.json({ alert });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to delete price alerts.' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.priceAlert.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: 'Price alert not found.' }, { status: 404 });
  }

  await prisma.priceAlert.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
