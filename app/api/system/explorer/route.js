import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'openExplorer') {
      const folderPath = body.path || 'C:\\Users';
      
      // Abra o Windows Explorer na pasta especificada
      const child = spawn('explorer.exe', [folderPath], {
        detached: true,
        stdio: 'ignore',
        shell: true
      });
      
      child.unref();
      
      return NextResponse.json({ success: true, message: 'Explorer aberto' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}