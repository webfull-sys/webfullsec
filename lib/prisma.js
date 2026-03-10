/**
 * ============================================
 * WebfullSec — Instância Prisma Client (Singleton)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Garante uma única instância do PrismaClient em dev
 * para evitar múltiplas conexões ao banco.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
