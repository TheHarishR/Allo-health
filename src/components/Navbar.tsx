// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package2, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-[#E8E8E3]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-[#1A1A1A]">
          <div className="w-7 h-7 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
            <Package2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm tracking-tight">allo</span>
          <span className="text-xs text-[#9CA3AF] font-normal hidden sm:block">
            Inventory Platform
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/'
                ? 'bg-[#F5F5F0] text-[#1A1A1A]'
                : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F5F0]'
            )}
          >
            <Package2 className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Products</span>
          </Link>
          <Link
            href="/warehouses"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/warehouses'
                ? 'bg-[#F5F5F0] text-[#1A1A1A]'
                : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F5F0]'
            )}
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Warehouses</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
