// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    sku: 'SKU-KEYBD-002',
    name: 'Mechanical Keyboard TKL',
    description: 'Tenkeyless mechanical keyboard with Cherry MX switches and RGB backlighting.',
    price: 549900,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
  },
  {
    sku: 'SKU-PSSD-001',
    name: 'Portable SSD 1TB',
    description: 'NVMe portable SSD with 1050 MB/s read speed and shock resistance.',
    price: 679900,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&q=80',
  },
  {
    sku: 'SKU-WATCH-034',
    name: 'Smart Watch Series X',
    description: 'Health and fitness tracker with AMOLED display and 7-day battery.',
    price: 1299900,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  },
  {
    sku: 'SKU-USBHB-023',
    name: 'USB-C Hub 7-in-1',
    description: 'Expand your laptop ports with HDMI 4K, USB 3.0, SD card reader, and more.',
    price: 229900,
    imageUrl: 'https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=800&q=80',
  },
  {
    sku: 'SKU-HEADPH-001',
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Premium over-ear headphones with 40-hour battery life and adaptive ANC.',
    price: 899900,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
  },
];

const warehouses = [
  { name: 'Mumbai Central', location: 'Mumbai, Maharashtra' },
  { name: 'Delhi North Hub', location: 'Delhi, NCR' },
  { name: 'Bangalore Tech Park', location: 'Bangalore, Karnataka' },
];

const stockData: Record<string, Record<string, { total: number; reserved: number }>> = {
  'SKU-KEYBD-002': {
    'Mumbai Central': { total: 8, reserved: 0 },
    'Delhi North Hub': { total: 11, reserved: 0 },
    'Bangalore Tech Park': { total: 8, reserved: 0 },
  },
  'SKU-PSSD-001': {
    'Delhi North Hub': { total: 16, reserved: 0 },
    'Bangalore Tech Park': { total: 10, reserved: 0 },
  },
  'SKU-WATCH-034': {
    'Mumbai Central': { total: 1, reserved: 0 },
    'Delhi North Hub': { total: 2, reserved: 0 },
    'Bangalore Tech Park': { total: 15, reserved: 0 },
  },
  'SKU-USBHB-023': {
    'Mumbai Central': { total: 49, reserved: 0 },
    'Bangalore Tech Park': { total: 30, reserved: 0 },
  },
  'SKU-HEADPH-001': {
    'Mumbai Central': { total: 24, reserved: 0 },
    'Delhi North Hub': { total: 1, reserved: 0 },
    'Bangalore Tech Park': { total: 4, reserved: 0 },
  },
};

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const createdWarehouses: Record<string, string> = {};
  for (const wh of warehouses) {
    const warehouse = await prisma.warehouse.create({ data: wh });
    createdWarehouses[wh.name] = warehouse.id;
    console.log(`  ✓ Warehouse: ${wh.name}`);
  }

  // Create products and stock levels
  for (const product of products) {
    const created = await prisma.product.create({ data: product });
    console.log(`  ✓ Product: ${product.name}`);

    const stockForProduct = stockData[product.sku];
    if (stockForProduct) {
      for (const [warehouseName, stock] of Object.entries(stockForProduct)) {
        const warehouseId = createdWarehouses[warehouseName];
        if (warehouseId) {
          await prisma.stockLevel.create({
            data: {
              productId: created.id,
              warehouseId,
              totalUnits: stock.total,
              reservedUnits: stock.reserved,
            },
          });
        }
      }
    }
  }

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
