/**
 * ============================================
 * WebfullSec — API: Projects (Listagem + Criação)
 * GET  /api/projects — Lista projetos com filtros
 * POST /api/projects — Cria novo projeto
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/projects
 * Lista todos os projetos com filtros opcionais.
 * Query params: category, status, search
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Construir filtro dinâmico
    const where = {};
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, importanceLevel: true } },
        projectAgents: {
          include: {
            agent: { select: { id: true, name: true, description: true } },
          },
        },
        _count: {
          select: {
            tasks: true,
            blocks: true,
            memories: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });

    // Adicionar contagem de tarefas concluídas para cada projeto
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const completedTasks = await prisma.task.count({
          where: { projectId: project.id, status: 'done' },
        });
        return {
          ...project,
          _count: {
            ...project._count,
            completedTasks,
          },
        };
      })
    );

    return NextResponse.json({ projects: enriched });
  } catch (error) {
    console.error('Erro GET /api/projects:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar projetos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Cria um novo projeto com campos estilo Notion.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validação obrigatória
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'O título é obrigatório' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        title: body.title.trim(),
        description: body.description || null,
        category: body.category || 'site',
        status: body.status || 'backlog',
        priority: body.priority || 2,
        icon: body.icon || '📁',
        coverImage: body.coverImage || null,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        clientId: body.clientId || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Criar bloco inicial na página do projeto
    await prisma.projectBlock.create({
      data: {
        projectId: project.id,
        type: 'paragraph',
        content: '',
        position: 0,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Erro POST /api/projects:', error);
    return NextResponse.json(
      { error: 'Erro ao criar projeto' },
      { status: 500 }
    );
  }
}
