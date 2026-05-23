// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true, imageUrl: true } },
        warehouse: { select: { id: true, name: true, location: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error(`GET /api/reservations/${id} error:`, error);
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 });
  }
}
