import { NextResponse } from 'next/server';
import { startAutoScheduler, stopAutoScheduler, getAutoSchedulerStatus } from '@/lib/localwp-scheduler';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const interval = parseInt(searchParams.get('interval') || '15');
    
    if (action === 'start') {
      const result = await startAutoScheduler(interval);
      return NextResponse.json(result);
    }
    
    if (action === 'stop') {
      const result = await stopAutoScheduler();
      return NextResponse.json(result);
    }
    
    if (action === 'status') {
      const result = getAutoSchedulerStatus();
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Ação inválida. Use ?action=start, stop ou status' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const status = getAutoSchedulerStatus();
  return NextResponse.json({
    ...status,
    message: 'Use POST para iniciar/parar',
    endpoints: {
      start: '/api/localwp/scheduler?action=start&interval=15',
      stop: '/api/localwp/scheduler?action=stop',
      status: '/api/localwp/scheduler?action=status',
    },
  });
}