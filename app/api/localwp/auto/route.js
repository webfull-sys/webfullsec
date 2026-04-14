import { NextResponse } from 'next/server';
import { runScheduledSync, checkChangesForAllSites } from '@/lib/localwp-auto-sync';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'check') {
      const changes = await checkChangesForAllSites();
      return NextResponse.json({ changes });
    }
    
    if (action === 'sync') {
      const results = await runScheduledSync();
      return NextResponse.json(results);
    }
    
    return NextResponse.json({ error: 'Ação inválida. Use ?action=sync ou ?action=check' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ 
    message: 'LocalWP Auto-Sync API',
    actions: {
      POST: {
        sync: 'Executa sincronização completa',
        check: 'Verifica alterações',
      }
    }
  });
}