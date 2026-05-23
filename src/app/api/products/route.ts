// src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/expiry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Lazy expiry cleanup on every product list request
    await releaseExpiredReservations();

    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = products.map((product) => {
      const warehouses = product.stockLevels.map((sl) => ({
        warehouseId: sl.warehouseId,
        warehouseName: sl.warehouse.name,
        warehouseLocation: sl.warehouse.location,
        totalUnits: sl.totalUnits,
        reservedUnits: sl.reservedUnits,
        availableUnits: Math.max(0, sl.totalUnits - sl.reservedUnits),
      }));

      const totalStock = warehouses.reduce((sum, w) => sum + w.availableUnits, 0);

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        totalStock,
        warehouses,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
