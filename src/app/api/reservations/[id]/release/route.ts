// src/app/api/reservations/[id]/release/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (reservation.status === 'RELEASED') {
      return NextResponse.json({ message: 'Reservation already released' });
    }

    if (reservation.status === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Cannot release a confirmed reservation' },
        { status: 409 }
      );
    }

    const [released] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'RELEASED', releasedAt: new Date() },
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, imageUrl: true } },
          warehouse: { select: { id: true, name: true, location: true } },
        },
      }),
      prisma.stockLevel.updateMany({
        where: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
        data: { reservedUnits: { decrement: reservation.quantity } },
      }),
    ]);

    return NextResponse.json({ reservation: released });
  } catch (error) {
    console.error(`POST /api/reservations/${id}/release error:`, error);
    return NextResponse.json({ error: 'Failed to release reservation' }, { status: 500 });
  }
}
