/**
 * ============================================
 * WebfullSec — API: Project Blocks (CRUD de Blocos)
 * GET   /api/projects/[id]/blocks — Lista blocos do projeto
 * POST  /api/projects/[id]/blocks — Cria novo bloco
 * PATCH /api/projects/[id]/blocks — Reordena blocos (batch)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET — Lista todos os blocos raiz do projeto ordenados por posição
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const blocks = await prisma.projectBlock.findMany({
      where: { projectId: id, parentId: null },
      orderBy: { position: 'asc' },
      include: {
        children: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Erro GET /blocks:', error);
    return NextResponse.json({ error: 'Erro ao buscar blocos' }, { status: 500 });
  }
}

/**
 * POST — Cria um novo bloco no projeto
 * Body: { type, content, properties, position, parentId, afterBlockId }
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Calcular posição: se afterBlockId fornecido, insere após ele
    let position = body.position;
    if (position === undefined || position === null) {
      if (body.afterBlockId) {
        const afterBlock = await prisma.projectBlock.findUnique({
          where: { id: body.afterBlockId },
          select: { position: true },
        });
        position = afterBlock ? afterBlock.position + 1 : 0;

        // Empurrar blocos seguintes para abrir espaço
        await prisma.projectBlock.updateMany({
          where: {
            projectId: id,
            parentId: body.parentId || null,
            position: { gte: position },
          },
          data: { position: { increment: 1 } },
        });
      } else {
        // Adicionar no final
        const lastBlock = await prisma.projectBlock.findFirst({
          where: { projectId: id, parentId: body.parentId || null },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        position = lastBlock ? lastBlock.position + 1 : 0;
      }
    }

    const block = await prisma.projectBlock.create({
      data: {
        projectId: id,
        type: body.type || 'paragraph',
        content: body.content || '',
        properties: body.properties ? JSON.stringify(body.properties) : null,
        position,
        parentId: body.parentId || null,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error('Erro POST /blocks:', error);
    return NextResponse.json({ error: 'Erro ao criar bloco' }, { status: 500 });
  }
}

/**
 * PATCH — Reordena blocos (batch update de posições)
 * Body: { blocks: [{ id, position }] }
 */
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.blocks)) {
      return NextResponse.json({ error: 'Array de blocos obrigatório' }, { status: 400 });
    }

    // Atualizar posição de cada bloco
    const updates = body.blocks.map((b) =>
      prisma.projectBlock.update({
        where: { id: b.id },
        data: { position: b.position },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ message: 'Blocos reordenados com sucesso' });
  } catch (error) {
    console.error('Erro PATCH /blocks:', error);
    return NextResponse.json({ error: 'Erro ao reordenar blocos' }, { status: 500 });
  }
}
