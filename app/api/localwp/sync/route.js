import { NextResponse } from 'next/server';
import { createLocalwpProjectsAndAgents, getLocalwpProjectsStatus, createProjectAndAgent } from '@/lib/localwp-projects';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteName = searchParams.get('site');
    
    if (siteName) {
      const result = await createProjectAndAgent(siteName);
      return NextResponse.json(result);
    }
    
    const results = await createLocalwpProjectsAndAgents();
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'status') {
      const status = await getLocalwpProjectsStatus();
      return NextResponse.json(status);
    }
    
    return NextResponse.json({ message: 'Use POST para sincronizar, GET ?action=status para ver status' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}