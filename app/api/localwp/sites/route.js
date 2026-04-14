import { NextResponse } from 'next/server';
import { scanLocalWpSites, getSiteDetails, getSiteFiles } from '@/lib/localwp-scanner';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const siteName = searchParams.get('name');
  
  try {
    switch (action) {
      case 'list':
        const sites = await scanLocalWpSites();
        return NextResponse.json({ sites });
      
      case 'details':
        if (!siteName) {
          return NextResponse.json({ error: 'Nome do site é obrigatório' }, { status: 400 });
        }
        const site = await getSiteDetails(siteName);
        if (!site) {
          return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ site });
      
      case 'files':
        if (!siteName) {
          return NextResponse.json({ error: 'Nome do site é obrigatório' }, { status: 400 });
        }
        const files = await getSiteFiles(siteName);
        if (!files) {
          return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ files });
      
      default:
        return NextResponse.json({ error: 'Ação inválida. Use: list, details ou files' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}