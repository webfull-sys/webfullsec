import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const beats = await prisma.beatProducao.findMany({
      include: { projeto: { include: { cliente: true } } },
      orderBy: { id: 'desc' }
    });
    return NextResponse.json(beats);
  } catch (error) {
    console.error('Erro GET beats:', error);
    return NextResponse.json({ error: 'Erro ao buscar beats' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const beat = await prisma.beatProducao.update({
      where: { id },
      data
    });

    // Gatilho N8N ao atualizar para Finalizado
    if (data.status_producao === 'Finalizado') {
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
        if (webhookUrl) {
           await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'beat_finalizado',
              beatId: beat.id,
              projetoId: beat.projeto_id
            })
          });
        }
      } catch (err) {
        console.error('Falha ao acionar webhook n8n:', err);
      }
    }

    return NextResponse.json(beat);
  } catch (error) {
    console.error('Erro PUT beat:', error);
    return NextResponse.json({ error: 'Erro ao atualizar beat' }, { status: 500 });
  }
}
