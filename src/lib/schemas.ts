// src/lib/schemas.ts
import { z } from 'zod';

export const ReserveSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;

export const ReservationIdSchema = z.object({
  id: z.string().min(1, 'Reservation ID is required'),
});

export function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
