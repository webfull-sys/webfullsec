/**
 * ============================================
 * WebfullSec — API: File Schedules (Agendamentos)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * GET    /api/files/schedules — Listar agendamentos
 * POST   /api/files/schedules — Criar novo agendamento
 * PATCH  /api/files/schedules — Atualizar agendamento
 * DELETE /api/files/schedules — Remover agendamento
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET — Listar todos os agendamentos
 */
export async function GET() {
  try {
    const schedules = await prisma.fileOrganizeSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Parsear daysOfWeek de JSON string para array
    const formatted = schedules.map(s => ({
      ...s,
      daysOfWeek: s.daysOfWeek ? JSON.parse(s.daysOfWeek) : [],
    }));

    return NextResponse.json({ schedules: formatted });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST — Criar novo agendamento
 * Body: { sourcePath, destPath, daysOfWeek, hour, minute }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sourcePath, destPath, daysOfWeek = [1], hour = 2, minute = 0 } = body;

    // Validações
    if (!sourcePath || !destPath) {
      return NextResponse.json(
        { error: 'sourcePath e destPath são obrigatórios.' },
        { status: 400 }
      );
    }

    const schedule = await prisma.fileOrganizeSchedule.create({
      data: {
        sourcePath: sourcePath.trim(),
        destPath: destPath.trim(),
        daysOfWeek: JSON.stringify(daysOfWeek),
        hour: Math.min(23, Math.max(0, hour)),
        minute: Math.min(59, Math.max(0, minute)),
        isActive: true,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Atualizar agendamento
 * Body: { id, isActive?, daysOfWeek?, hour?, minute? }
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório.' },
        { status: 400 }
      );
    }

    // Sanitizar dados
    const data = {};
    if (updates.isActive !== undefined) data.isActive = Boolean(updates.isActive);
    if (updates.daysOfWeek) data.daysOfWeek = JSON.stringify(updates.daysOfWeek);
    if (updates.hour !== undefined) data.hour = Math.min(23, Math.max(0, updates.hour));
    if (updates.minute !== undefined) data.minute = Math.min(59, Math.max(0, updates.minute));
    if (updates.sourcePath) data.sourcePath = updates.sourcePath.trim();
    if (updates.destPath) data.destPath = updates.destPath.trim();

    const schedule = await prisma.fileOrganizeSchedule.update({
      where: { id },
      data,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Remover agendamento
 * Query: id
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório.' },
        { status: 400 }
      );
    }

    await prisma.fileOrganizeSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
