// src/app/reservations/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Package,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Navbar } from '@/components/Navbar';
import { formatPrice } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import type { Reservation } from '@/types';

type PageStatus = 'loading' | 'ready' | 'confirming' | 'releasing' | 'error';

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        setPageError('Reservation not found.');
        setStatus('error');
        return;
      }
      const data = await res.json();
      setReservation(data.reservation);
      setStatus('ready');
    } catch {
      setPageError('Failed to load reservation.');
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  async function handleConfirm() {
    if (!reservation) return;
    setStatus('confirming');
    setActionError(null);

    const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 410) {
        setActionError('This reservation has expired and can no longer be confirmed.');
      } else {
        setActionError(data.error ?? 'Failed to confirm reservation.');
      }
      setStatus('ready');
      await fetchReservation();
      return;
    }

    setReservation(data.reservation);
    setStatus('ready');
  }

  async function handleCancel() {
    if (!reservation) return;
    setStatus('releasing');
    setActionError(null);

    const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      setActionError(data.error ?? 'Failed to cancel reservation.');
      setStatus('ready');
      return;
    }

    setReservation(data.reservation);
    setStatus('ready');
  }

  function handleExpire() {
    fetchReservation();
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-[#6B7280] animate-spin" />
        </div>
      </div>
    );
  }

  if (status === 'error' || !reservation) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-[#1A1A1A] font-semibold mb-1">Not found</p>
          <p className="text-sm text-[#6B7280] mb-6">{pageError ?? 'Reservation not found.'}</p>
          <Link href="/" className="btn-primary inline-flex">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const isPending = reservation.status === 'PENDING';
  const isConfirmed = reservation.status === 'CONFIRMED';
  const isReleased = reservation.status === 'RELEASED';
  const isBusy = status === 'confirming' || status === 'releasing';
  const total = reservation.product.price * reservation.quantity;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1A1A1A] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Products
        </Link>

        {/* Status banner */}
        {isConfirmed && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mb-4 fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Order confirmed!</p>
              <p className="text-xs text-green-700">Your purchase is complete.</p>
            </div>
          </div>
        )}

        {isReleased && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-4 fade-in">
            <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-700 text-sm">Reservation released</p>
              <p className="text-xs text-gray-500">Units are back in stock.</p>
            </div>
          </div>
        )}

        {/* Error */}
        {actionError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4 fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{actionError}</p>
          </div>
        )}

        {/* Main card */}
        <div className="card overflow-hidden">
          {/* Product image */}
          {reservation.product.imageUrl && (
            <div className="relative aspect-[16/7] overflow-hidden bg-[#F5F5F0]">
              <Image
                src={reservation.product.imageUrl}
                alt={reservation.product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 512px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Product info */}
            <div>
              <p className="text-[10px] text-[#9CA3AF] font-mono uppercase tracking-wider">
                {reservation.product.sku}
              </p>
              <h1 className="text-xl font-bold text-[#1A1A1A] mt-0.5">
                {reservation.product.name}
              </h1>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F9F9F6] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-1">
                  Warehouse
                </p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {reservation.warehouse.name}
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 ml-4">
                  {reservation.warehouse.location}
                </p>
              </div>

              <div className="bg-[#F9F9F6] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-wider mb-1">
                  Order
                </p>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-[#6B7280]" />
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {reservation.quantity} unit{reservation.quantity !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 ml-4">
                  {formatPrice(reservation.product.price)} each
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-3 py-3 bg-[#1A1A1A] rounded-xl">
              <span className="text-sm text-white/70">Total</span>
              <span className="font-bold text-white text-lg">{formatPrice(total)}</span>
            </div>

            {/* Countdown (only for pending) */}
            {isPending && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Hold expires in
                </p>
                <CountdownTimer
                  expiresAt={reservation.expiresAt}
                  onExpire={handleExpire}
                />
              </div>
            )}

            {/* Status pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9CA3AF]">Status:</span>
              <span
                className={cn(
                  'badge',
                  isPending && 'badge-blue',
                  isConfirmed && 'badge-green',
                  isReleased && 'badge-gray'
                )}
              >
                {reservation.status}
              </span>
              <span className="text-[11px] text-[#9CA3AF] font-mono ml-auto">
                #{reservation.id.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {isPending && (
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isBusy}
                className="btn-outline flex-1"
              >
                {status === 'releasing' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling…
                  </span>
                ) : (
                  'Cancel'
                )}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isBusy}
                className="btn-success flex-1"
              >
                {status === 'confirming' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming…
                  </span>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          )}

          {(isConfirmed || isReleased) && (
            <div className="px-5 pb-5">
              <Link href="/" className="btn-outline w-full block text-center">
                Back to Products
              </Link>
            </div>
          )}
        </div>

        {/* Reservation ID */}
        <p className="text-center text-[11px] text-[#9CA3AF] mt-4 font-mono">
          Reservation ID: {reservation.id}
        </p>
      </main>
    </div>
  );
}
