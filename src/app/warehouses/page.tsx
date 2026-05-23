// src/app/warehouses/page.tsx
import { Navbar } from '@/components/Navbar';
import { MapPin, Package2, Warehouse } from 'lucide-react';
import { prisma } from '@/lib/prisma';

async function getWarehouses() {
  return prisma.warehouse.findMany({
    include: { _count: { select: { stockLevels: true } } },
    orderBy: { name: 'asc' },
  });
}

export default async function WarehousesPage() {
  let warehouses: Awaited<ReturnType<typeof getWarehouses>> = [];
  let error: string | null = null;

  try {
    warehouses = await getWarehouses();
  } catch (e) {
    console.error('WarehousesPage error:', e);
    error = 'Failed to load warehouses.';
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Warehouses</h1>
          {!error && (
            <p className="text-sm text-[#6B7280] mt-1">
              {warehouses.length} active location{warehouses.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <div key={wh.id} className="card p-5 fade-in">
              <div className="w-10 h-10 bg-[#F5F5F0] rounded-xl flex items-center justify-center mb-4">
                <Warehouse className="w-5 h-5 text-[#6B7280]" />
              </div>
              <h2 className="font-semibold text-[#1A1A1A]">{wh.name}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-[#6B7280]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{wh.location}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-[#F0F0EB] flex items-center gap-1.5 text-sm text-[#6B7280]">
                <Package2 className="w-3.5 h-3.5" />
                <span>
                  {wh._count.stockLevels} product SKU
                  {wh._count.stockLevels !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
