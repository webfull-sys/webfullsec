import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Erro ao buscar agente:', error);
    return NextResponse.json({ error: 'Erro ao buscar agente' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        llmModel: data.llmModel,
        webhookUrl: data.webhookUrl,
        isActive: data.isActive,
      }
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Erro ao atualizar agente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar agente' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    await prisma.agent.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Agente removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agente:', error);
    return NextResponse.json({ error: 'Erro ao deletar agente' }, { status: 500 });
  }
}
