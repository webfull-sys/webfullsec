/**
 * ============================================
 * WebfullSec — API: Block Individual
 * PATCH  /api/projects/[id]/blocks/[blockId] — Atualiza bloco
 * DELETE /api/projects/[id]/blocks/[blockId] — Remove bloco
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.6.0
 * ============================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * PATCH — Atualiza conteúdo, tipo ou propriedades de um bloco
 */
export async function PATCH(request, { params }) {
  try {
    const { blockId } = await params;
    const body = await request.json();

    const data = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.content !== undefined) data.content = body.content;
    if (body.properties !== undefined) {
      data.properties = typeof body.properties === 'string'
        ? body.properties
        : JSON.stringify(body.properties);
    }
    if (body.position !== undefined) data.position = body.position;
    if (body.parentId !== undefined) data.parentId = body.parentId;

    const block = await prisma.projectBlock.update({
      where: { id: blockId },
      data,
    });

    return NextResponse.json(block);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
    }
    console.error('Erro PATCH /blocks/[blockId]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar bloco' }, { status: 500 });
  }
}

/**
 * DELETE — Remove um bloco e seus filhos (cascade)
 */
export async function DELETE(request, { params }) {
  try {
    const { blockId } = await params;

    await prisma.projectBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ message: 'Bloco removido com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
    }
    console.error('Erro DELETE /blocks/[blockId]:', error);
    return NextResponse.json({ error: 'Erro ao remover bloco' }, { status: 500 });
  }
}
