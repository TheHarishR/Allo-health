// src/app/page.tsx
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/expiry';
import type { Product } from '@/types';

async function getProducts(): Promise<Product[]> {
  await releaseExpiredReservations();

  const products = await prisma.product.findMany({
    include: {
      stockLevels: {
        include: { warehouse: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return products.map((product) => {
    const warehouses = product.stockLevels.map((sl) => ({
      warehouseId: sl.warehouseId,
      warehouseName: sl.warehouse.name,
      warehouseLocation: sl.warehouse.location,
      totalUnits: sl.totalUnits,
      reservedUnits: sl.reservedUnits,
      availableUnits: Math.max(0, sl.totalUnits - sl.reservedUnits),
    }));
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      totalStock: warehouses.reduce((sum, w) => sum + w.availableUnits, 0),
      warehouses,
    };
  });
}

export default async function ProductsPage() {
  let products: Product[] = [];
  let error: string | null = null;

  try {
    products = await getProducts();
  } catch (e) {
    console.error('ProductsPage error:', e);
    error = 'Failed to load products. Please check your database connection and env vars.';
  }

  const totalStock = products.reduce((sum, p) => sum + p.totalStock, 0);
  const warehouseCount = new Set(
    products.flatMap((p) => p.warehouses.map((w) => w.warehouseId))
  ).size;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">All Products</h1>
            {!error && (
              <p className="text-sm text-[#6B7280] mt-1">
                {products.length} products across {warehouseCount} warehouse
                {warehouseCount !== 1 ? 's' : ''} · {totalStock} units available
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {!error && products.length === 0 && (
          <div className="bg-white border border-[#E8E8E3] rounded-2xl p-12 text-center">
            <p className="text-[#6B7280] text-sm">
              No products found. Run{' '}
              <code className="font-mono bg-[#F5F5F0] px-1.5 py-0.5 rounded">
                npm run db:seed
              </code>{' '}
              to seed the database.
            </p>
          </div>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
