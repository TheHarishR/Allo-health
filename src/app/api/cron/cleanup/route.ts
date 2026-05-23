export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/expiry';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const released = await releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      released,
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);

    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
