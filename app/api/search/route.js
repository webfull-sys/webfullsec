/**
 * ============================================
 * WebfullSec — API: Search (Busca Global)
 * GET /api/search?q=query
 * Busca em tarefas, projetos, clientes e inbox
 * Autoria: Webfull (https://webfull.com.br)
 * ============================================
 */

import prisma from '@/lib/prisma';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return apiResponse({ results: [] });
    }

    // Buscar em paralelo em todas as entidades
    const [tasks, projects, clients, inboxItems] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: { id: true, title: true, status: true, priority: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: { id: true, title: true, category: true, status: true },
        take: 5,
      }),
      prisma.crmCliente.findMany({
        where: {
          OR: [
            { nome_cliente: { contains: query } },
            { email: { contains: query } },
            { telefone: { contains: query } },
          ],
        },
        select: { id: true, nome_cliente: true, email: true },
        take: 5,
      }),
      prisma.inboxItem.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        select: { id: true, title: true, source: true },
        take: 3,
      }),
    ]);

    // Formatar para exibição no Command Palette
    const results = [
      ...tasks.map(t => ({
        type: 'task',
        title: t.title,
        description: `Tarefa • ${t.status}`,
        href: `/tasks?id=${t.id}`,
        icon: '✅',
      })),
      ...projects.map(p => ({
        type: 'project',
        title: p.title,
        description: `Projeto • ${p.category}`,
        href: `/projects/${p.id}`,
        icon: '📁',
      })),
      ...clients.map(c => ({
        type: 'client',
        title: c.nome_cliente,
        description: c.email || 'Cliente',
        href: `/clients?id=${c.id}`,
        icon: '👤',
      })),
      ...inboxItems.map(i => ({
        type: 'inbox',
        title: i.title,
        description: `Inbox • ${i.source}`,
        href: `/inbox?id=${i.id}`,
        icon: '📥',
      })),
    ];

    return apiResponse({ results });
  } catch (error) {
    console.error('Erro na busca:', error);
    return apiError('Erro ao buscar', 500);
  }
}
