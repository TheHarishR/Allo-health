// src/app/api/warehouses/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: { stockLevels: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = warehouses.map((wh) => ({
      id: wh.id,
      name: wh.name,
      location: wh.location,
      productCount: wh._count.stockLevels,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/warehouses error:', error);
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}
