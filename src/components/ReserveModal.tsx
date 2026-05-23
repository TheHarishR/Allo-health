// src/components/ReserveModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/schemas';
import type { Product, WarehouseStock } from '@/types';

interface ReserveModalProps {
  product: Product;
  onClose: () => void;
}

export function ReserveModal({ product, onClose }: ReserveModalProps) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseStock | null>(
    product.warehouses.find((w) => w.availableUnits > 0) ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableWarehouses = product.warehouses.filter((w) => w.availableUnits > 0);

  async function handleReserve() {
    if (!selectedWarehouse) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.warehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error ?? 'Not enough stock available.');
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.');
        }
        return;
      }

      router.push(`/reservations/${data.reservation.id}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl fade-in sm:mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#E8E8E3]">
          <div>
            <h2 className="font-semibold text-[#1A1A1A]">{product.name}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{product.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F5F0] text-[#6B7280] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warehouse selector */}
          <div>
            <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2 block">
              Select Warehouse
            </label>
            {availableWarehouses.length === 0 ? (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                No stock available at any warehouse.
              </p>
            ) : (
              <div className="space-y-2">
                {availableWarehouses.map((wh) => (
                  <button
                    key={wh.warehouseId}
                    onClick={() => setSelectedWarehouse(wh)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all',
                      selectedWarehouse?.warehouseId === wh.warehouseId
                        ? 'border-[#1A1A1A] bg-[#F5F5F0]'
                        : 'border-[#E8E8E3] hover:border-[#D1D5DB]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span className="text-sm font-medium">{wh.warehouseName}</span>
                    </div>
                    <span className="text-xs text-[#6B7280] font-mono">
                      {wh.availableUnits} avail.
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          {selectedWarehouse && (
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2 block">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl border border-[#E8E8E3] flex items-center justify-center text-lg font-medium hover:bg-[#F5F5F0] transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center font-semibold text-lg tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedWarehouse.availableUnits, q + 1))
                  }
                  className="w-9 h-9 rounded-xl border border-[#E8E8E3] flex items-center justify-center text-lg font-medium hover:bg-[#F5F5F0] transition-colors"
                  disabled={quantity >= selectedWarehouse.availableUnits}
                >
                  +
                </button>
                <span className="text-xs text-[#9CA3AF]">
                  max {selectedWarehouse.availableUnits}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Price summary */}
          {selectedWarehouse && (
            <div className="bg-[#F5F5F0] rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                <Package className="w-3.5 h-3.5" />
                <span>{quantity} × {formatPrice(product.price)}</span>
              </div>
              <span className="font-bold text-[#1A1A1A]">
                {formatPrice(product.price * quantity)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button
            onClick={handleReserve}
            disabled={loading || !selectedWarehouse || availableWarehouses.length === 0}
            className="btn-primary flex-1"
          >
            {loading ? 'Reserving…' : 'Reserve · 10 min hold'}
          </button>
        </div>
      </div>
    </div>
  );
}
