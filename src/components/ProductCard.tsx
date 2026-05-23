// src/components/ProductCard.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/lib/schemas';
import { ReserveModal } from './ReserveModal';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const isOutOfStock = product.totalStock === 0;

  return (
    <>
      <div className="card fade-in group">
        {/* Product image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F5F0] product-image-container">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover product-image"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#D1D5DB]">
              <ShoppingBag className="w-12 h-12" />
            </div>
          )}
          {/* Stock badge */}
          <div className="absolute top-3 right-3">
            <span
              className={cn(
                'badge text-xs',
                isOutOfStock
                  ? 'bg-red-100 text-red-700'
                  : product.totalStock <= 5
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              )}
            >
              {isOutOfStock
                ? '✕ Out of stock'
                : `+${product.totalStock} in stock`}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* SKU + Name */}
          <div className="mb-1">
            <p className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider mb-0.5">
              {product.sku}
            </p>
            <h3 className="font-semibold text-[#1A1A1A] text-base leading-snug">
              {product.name}
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{product.description}</p>
          </div>

          {/* Warehouse breakdown */}
          {product.warehouses.length > 0 && (
            <div className="mt-3 space-y-1">
              {product.warehouses.map((wh) => (
                <div
                  key={wh.warehouseId}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1 text-[#6B7280]">
                    <MapPin className="w-3 h-3" />
                    <span>{wh.warehouseName}</span>
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      wh.availableUnits === 0 ? 'text-red-500' : 'text-[#6B7280]'
                    )}
                  >
                    {wh.availableUnits === 0 ? '—' : `${wh.availableUnits} avail.`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F0F0EB]">
            <span className="font-bold text-[#1A1A1A] text-lg">
              {formatPrice(product.price)}
            </span>
            <button
              onClick={() => setShowModal(true)}
              disabled={isOutOfStock}
              className={cn(
                'btn-primary text-xs px-4 py-2',
                isOutOfStock && 'opacity-40 cursor-not-allowed'
              )}
            >
              {isOutOfStock ? 'Out of stock' : 'Reserve'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <ReserveModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
