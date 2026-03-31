/**
 * ============================================
 * WebfullSec — API: Project Agents (Vínculo)
 * GET    /api/projects/[id]/agents — Lista agentes vinculados
 * POST   /api/projects/[id]/agents — Vincula agente ao projeto
 * DELETE /api/projects/[id]/agents — Desvincula agente
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET — Lista agentes vinculados ao projeto
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const projectAgents = await prisma.projectAgent.findMany({
      where: { projectId: id },
      include: {
        agent: {
          select: {
            id: true, name: true, description: true,
            llmModel: true, isActive: true, webhookUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ agents: projectAgents });
  } catch (error) {
    console.error('Erro GET /agents:', error);
    return NextResponse.json({ error: 'Erro ao buscar agentes' }, { status: 500 });
  }
}

/**
 * POST — Vincula um agente ao projeto
 * Body: { agentId, role }
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.agentId) {
      return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 });
    }

    const projectAgent = await prisma.projectAgent.create({
      data: {
        projectId: id,
        agentId: body.agentId,
        role: body.role || 'assistant',
      },
      include: {
        agent: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    return NextResponse.json(projectAgent, { status: 201 });
  } catch (error) {
    // Vínculo duplicado
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este agente já está vinculado ao projeto' },
        { status: 409 }
      );
    }
    console.error('Erro POST /agents:', error);
    return NextResponse.json({ error: 'Erro ao vincular agente' }, { status: 500 });
  }
}

/**
 * DELETE — Desvincula um agente do projeto
 * Body: { agentId }
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.agentId) {
      return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 });
    }

    await prisma.projectAgent.deleteMany({
      where: {
        projectId: id,
        agentId: body.agentId,
      },
    });

    return NextResponse.json({ message: 'Agente desvinculado com sucesso' });
  } catch (error) {
    console.error('Erro DELETE /agents:', error);
    return NextResponse.json({ error: 'Erro ao desvincular agente' }, { status: 500 });
  }
}
