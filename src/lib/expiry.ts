// src/lib/expiry.ts
import { prisma } from './prisma';

/**
 * Releases all expired PENDING reservations.
 * Called lazily on every product list render + by Vercel Cron every 5 min.
 */
export async function releaseExpiredReservations(): Promise<number> {
  try {
    const now = new Date();

    const expired = await prisma.reservation.findMany({
      where: { status: 'PENDING', expiresAt: { lt: now } },
      select: { id: true, productId: true, warehouseId: true, quantity: true },
    });

    if (expired.length === 0) return 0;

    let released = 0;
    for (const reservation of expired) {
      try {
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: 'RELEASED', releasedAt: now },
          }),
          prisma.stockLevel.updateMany({
            where: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
            data: { reservedUnits: { decrement: reservation.quantity } },
          }),
        ]);
        released++;
      } catch {
        // Already processed by another worker — safe to skip
      }
    }

    return released;
  } catch (err) {
    // Don't crash the page if expiry cleanup fails
    console.error('releaseExpiredReservations error:', err);
    return 0;
  }
}
