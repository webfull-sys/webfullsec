import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.aiProjeto.findMany({
      include: { cliente: true },
      orderBy: { criado_em: 'desc' }
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Erro GET projects:', error);
    return NextResponse.json({ error: 'Erro ao buscar projetos' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const project = await prisma.aiProjeto.create({
      data: {
        titulo_projeto: body.titulo_projeto,
        cliente_id: body.cliente_id || null,
        categoria: body.categoria || 'Site',
        status_projeto: body.status_projeto || 'Briefing',
        prioridade: body.prioridade || 'Normal',
        due_date_cliente: body.due_date_cliente ? new Date(body.due_date_cliente) : null
      }
    });

    // Se a categoria for Beat, cria um BeatProducao atrelado
    if (body.categoria === 'Beat') {
      await prisma.beatProducao.create({
        data: {
          projeto_id: project.id,
          titulo_faixa: body.titulo_projeto
        }
      });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro POST project:', error);
    return NextResponse.json({ error: 'Erro ao criar projeto' }, { status: 500 });
  }
}
