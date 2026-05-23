// src/app/api/reservations/route.ts

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { acquireLock, releaseLock, getIdempotencyResult, setIdempotencyResult } from '@/lib/redis';
import { ReserveSchema } from '@/lib/schemas';


const RESERVATION_TTL_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ReserveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // ── Idempotency (bonus) ──────────────────────────────────────────────────
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) {
      const cached = await getIdempotencyResult(idempotencyKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json(parsed, { status: 201 });
      }
    }

    // ── Distributed lock — one lock per product+warehouse ───────────────────
    // This prevents two simultaneous requests from both reading "enough stock"
    // before either has written the reservation.
    const lockKey = `stock:${productId}:${warehouseId}`;
    let lockValue: string | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 200;

    while (attempts < MAX_ATTEMPTS) {
      lockValue = await acquireLock(lockKey);
      if (lockValue) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      attempts++;
    }

    if (!lockValue) {
      return NextResponse.json(
        { error: 'Service temporarily busy. Please retry in a moment.' },
        { status: 503 }
      );
    }

    try {
      // ── Critical section ─────────────────────────────────────────────────
      // Read current stock inside the lock
      const stockLevel = await prisma.stockLevel.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (!stockLevel) {
        return NextResponse.json(
          { error: 'Product not available at this warehouse' },
          { status: 404 }
        );
      }

      const available = stockLevel.totalUnits - stockLevel.reservedUnits;
      if (available < quantity) {
        return NextResponse.json(
          {
            error: `Not enough stock. Requested ${quantity}, available ${available}.`,
            available,
          },
          { status: 409 }
        );
      }

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

      // Atomically increment reservedUnits and create reservation
      const [, reservation] = await prisma.$transaction([
        prisma.stockLevel.update({
          where: { productId_warehouseId: { productId, warehouseId } },
          data: { reservedUnits: { increment: quantity } },
        }),
        prisma.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: 'PENDING',
            expiresAt,
            idempotencyKey: idempotencyKey ?? undefined,
          },
          include: {
            product: { select: { id: true, name: true, sku: true, price: true, imageUrl: true } },
            warehouse: { select: { id: true, name: true, location: true } },
          },
        }),
      ]);

      const response = { reservation };

      // Store idempotency result
      if (idempotencyKey) {
        await setIdempotencyResult(idempotencyKey, response);
      }

      return NextResponse.json(response, { status: 201 });
    } finally {
      // Always release the lock
      await releaseLock(lockKey, lockValue);
    }
  } catch (error) {
    console.error('POST /api/reservations error:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
