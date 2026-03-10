import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { interactions: true }
        }
      }
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agentes' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validação básica
    if (!data.name || !data.systemPrompt) {
      return NextResponse.json(
        { error: 'Nome e System Prompt são obrigatórios' },
        { status: 400 }
      );
    }

    const newAgent = await prisma.agent.create({
      data: {
        name: data.name,
        description: data.description || '',
        systemPrompt: data.systemPrompt,
        llmModel: data.llmModel || 'gemini-2.0-flash',
        webhookUrl: data.webhookUrl || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      }
    });

    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agente:', error);
    return NextResponse.json(
      { error: 'Erro ao criar agente' },
      { status: 500 }
    );
  }
}
