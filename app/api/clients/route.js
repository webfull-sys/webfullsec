import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.crmCliente.findMany({
      orderBy: { criado_em: 'desc' }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Erro GET clients:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes CRM' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const client = await prisma.crmCliente.create({
      data: {
        nome_cliente: body.nome_cliente,
        email: body.email,
        telefone: body.telefone,
        status_cliente: body.status_cliente || 'Lead',
        nivel_prioridade: parseInt(body.nivel_prioridade) || 3,
        notas_contexto: body.notas_contexto || ''
      }
    });
    return NextResponse.json(client);
  } catch (error) {
    console.error('Erro POST client:', error);
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }
}
