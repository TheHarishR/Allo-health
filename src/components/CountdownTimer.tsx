// src/components/CountdownTimer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const expiry = new Date(expiresAt).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, expiry - now);
      setRemaining(diff);
      if (diff === 0) onExpire?.();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (!mounted) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isExpired = remaining === 0;
  const isUrgent = remaining < 60_000 && remaining > 0;

  const progressPct = Math.min(100, (remaining / (10 * 60 * 1000)) * 100);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-2 font-mono text-2xl font-bold tabular-nums',
          isExpired && 'text-red-600',
          isUrgent && 'text-orange-500 countdown-urgent',
          !isExpired && !isUrgent && 'text-[#1A1A1A]'
        )}
      >
        <Clock className={cn('w-5 h-5', isUrgent && 'text-orange-500', isExpired && 'text-red-600')} />
        {isExpired ? (
          <span>Expired</span>
        ) : (
          <span>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        )}
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            isExpired && 'bg-red-500 w-0',
            isUrgent && 'bg-orange-400',
            !isExpired && !isUrgent && 'bg-blue-500'
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
