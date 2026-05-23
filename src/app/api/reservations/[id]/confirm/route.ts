// src/app/api/reservations/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIdempotencyResult, setIdempotencyResult } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // ── Idempotency (bonus) ──────────────────────────────────────────────────
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) {
      const cached = await getIdempotencyResult(`confirm:${idempotencyKey}`);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json(parsed);
      }
    }

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

    if (reservation.status === 'CONFIRMED') {
      return NextResponse.json({ reservation });
    }

    if (reservation.status === 'RELEASED') {
      return NextResponse.json(
        { error: 'Reservation has already been released' },
        { status: 410 }
      );
    }

    // Check expiry
    if (new Date() > reservation.expiresAt) {
      // Release stock since we're expiring it now
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data: { status: 'RELEASED', releasedAt: new Date() },
        }),
        prisma.stockLevel.updateMany({
          where: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
          data: { reservedUnits: { decrement: reservation.quantity } },
        }),
      ]);

      return NextResponse.json(
        { error: 'Reservation has expired and cannot be confirmed' },
        { status: 410 }
      );
    }

    // Confirm: decrement totalUnits (permanent deduction) and clear reservedUnits
    const [confirmed] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
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
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity },
        },
      }),
    ]);

    const response = { reservation: confirmed };

    if (idempotencyKey) {
      await setIdempotencyResult(`confirm:${idempotencyKey}`, response);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error(`POST /api/reservations/${id}/confirm error:`, error);
    return NextResponse.json({ error: 'Failed to confirm reservation' }, { status: 500 });
  }
}
