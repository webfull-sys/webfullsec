/**
 * ============================================
 * WebfullSec — LocalWP Auto-Scheduler
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Agenda sincronizações automáticas via API
 * Sem necessidade de N8N externo
 */

import prisma from '@/lib/prisma';

let syncInterval = null;
let isRunning = false;

export async function startAutoScheduler(intervalMinutes = 15) {
  if (syncInterval) {
    console.log('⏰ Auto-Scheduler já está rodando');
    return { message: 'Já está em execução', intervalMinutes };
  }
  
  console.log(`⏰ Iniciando Auto-Scheduler a cada ${intervalMinutes} minutos...`);
  
  syncInterval = setInterval(async () => {
    if (isRunning) {
      console.log('⏳ Sync anterior ainda em execução, pulando...');
      return;
    }
    
    isRunning = true;
    try {
      await runScheduledSync();
    } catch (error) {
      console.error('❌ Erro no Auto-Scheduler:', error);
    } finally {
      isRunning = false;
    }
  }, intervalMinutes * 60 * 1000);
  
  await prisma.notification.create({
    data: {
      title: '🔄 Auto-Scheduler LocalWP ativo',
      message: `Sincronização automática a cada ${intervalMinutes} minutos`,
      type: 'success',
    },
  });
  
  return { message: 'Auto-Scheduler iniciado', intervalMinutes };
}

export async function stopAutoScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('⏹ Auto-Scheduler parado');
    
    await prisma.notification.create({
      data: {
        title: '⏹ Auto-Scheduler LocalWP parado',
        message: 'Sincronização automática foi desativada',
        type: 'info',
      },
    });
    
    return { message: 'Auto-Scheduler parado' };
  }
  
  return { message: 'Não estava em execução' };
}

export function getAutoSchedulerStatus() {
  return {
    isRunning: !!syncInterval,
    intervalMinutes: syncInterval ? 15 : null,
  };
}

async function runScheduledSync() {
  const { runScheduledSync: sync } = await import('./localwp-auto-sync');
  return sync();
}

export default {
  startAutoScheduler,
  stopAutoScheduler,
  getAutoSchedulerStatus,
};