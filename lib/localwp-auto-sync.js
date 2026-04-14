/**
 * ============================================
 * WebfullSec — LocalWP Auto-Sync
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Sistema de sincronização automática:
 * - Detecta alterações em tempo real
 * - Cria notificações
 * - Cria tarefas automáticas
 * - Agenda sync periódico
 */

import prisma from '@/lib/prisma';
import { scanLocalWpSites, getSiteDetails } from './localwp-scanner';
import { createLocalwpProjectsAndAgents } from './localwp-projects';

const lastSnapshot = new Map();

export async function initAutoSync() {
  console.log('🔄 Inicializando Auto-Sync LocalWP...');
  
  for (const site of await scanLocalWpSites()) {
    lastSnapshot.set(site.name, {
      timestamp: Date.now(),
      files: await getFileList(site),
    });
  }
  
  console.log(`✅ Auto-Sync iniciado para ${lastSnapshot.size} sites`);
}

async function getFileList(site) {
  const fs = await import('fs');
  const path = await import('path');
  
  const files = [];
  const publicPath = site.publicPath;
  
  if (!fs.existsSync(publicPath)) return files;
  
  const scanDir = (dir, depth = 0) => {
    if (depth > 3) return;
    if (!fs.existsSync(dir)) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            files.push({
              path: fullPath,
              relativePath: path.relative(publicPath, fullPath),
              name: entry.name,
              size: stat.size,
              modifiedAt: stat.mtime.getTime(),
            });
          } catch {}
        } else if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1);
        }
      }
    } catch {}
  };
  
  scanDir(publicPath);
  return files;
}

export async function checkChangesForAllSites() {
  const sites = await scanLocalWpSites();
  const changes = [];
  
  for (const site of sites) {
    const siteChanges = await checkSiteChanges(site);
    if (siteChanges.length > 0) {
      changes.push({ site: site.name, changes: siteChanges });
    }
    
    lastSnapshot.set(site.name, {
      timestamp: Date.now(),
      files: await getFileList(site),
    });
  }
  
  return changes;
}

export async function checkSiteChanges(site) {
  const currentFiles = await getFileList(site);
  const lastSnap = lastSnapshot.get(site.name);
  
  if (!lastSnap) {
    lastSnapshot.set(site.name, { timestamp: Date.now(), files: currentFiles });
    return [{ type: 'initial', message: 'Scan inicial realizado' }];
  }
  
  const changes = [];
  const lastFiles = lastSnap.files;
  const currentPaths = new Set(currentFiles.map(f => f.path));
  const lastPaths = new Set(lastFiles.map(f => f.path));
  
  for (const file of currentFiles) {
    if (!lastPaths.has(file.path)) {
      changes.push({
        type: 'file_created',
        relativePath: file.relativePath,
        name: file.name,
      });
    }
  }
  
  for (const file of lastFiles) {
    if (!currentPaths.has(file.path)) {
      changes.push({
        type: 'file_deleted',
        relativePath: file.relativePath,
        name: file.name,
      });
    }
  }
  
  for (const file of currentFiles) {
    const lastFile = lastFiles.find(f => f.path === file.path);
    if (lastFile && lastFile.modifiedAt !== file.modifiedAt) {
      changes.push({
        type: 'file_modified',
        relativePath: file.relativePath,
        name: file.name,
        oldSize: lastFile.size,
        newSize: file.size,
      });
    }
  }
  
  return changes;
}

export async function createAutoTask(projectId, title, description, priority = 2) {
  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority,
      status: 'todo',
      projectId,
    },
  });
  
  await prisma.notification.create({
    data: {
      title: `Nova tarefa automática: ${title}`,
      message: description,
      type: 'info',
      link: `/tasks`,
    },
  });
  
  return task;
}

export async function processChangesAndCreateTasks(changes) {
  const results = [];
  
  for (const { site, changes: siteChanges } of changes) {
    if (siteChanges.length === 0) continue;
    
    const project = await prisma.project.findFirst({
      where: { title: site },
    });
    
    if (!project) continue;
    
    const newFiles = siteChanges.filter(c => c.type === 'file_created');
    const modifiedFiles = siteChanges.filter(c => c.type === 'file_modified');
    const deletedFiles = siteChanges.filter(c => c.type === 'file_deleted');
    
    if (newFiles.length > 3) {
      const task = await createAutoTask(
        project.id,
        `Revisar novos arquivos em ${site}`,
        `${newFiles.length} novos arquivos detectados: ${newFiles.map(f => f.name).slice(0, 5).join(', ')}...`,
        2
      );
      results.push({ type: 'task_created', task: task.title });
    }
    
    if (modifiedFiles.some(f => f.name === 'style.css' || f.name === 'functions.php')) {
      const task = await createAutoTask(
        project.id,
        `Revisar alterações em ${site}`,
        `Arquivos de tema modificados: ${modifiedFiles.find(f => f.name === 'style.css' || f.name === 'functions.php')?.name}`,
        3
      );
      results.push({ type: 'task_created', task: task.title });
    }
    
    await prisma.memory.create({
      data: {
        content: `Alterações detectadas: ${siteChanges.length} (${newFiles.length} novos, ${modifiedFiles.length} modificados, ${deletedFiles.length} removidos)`,
        type: 'progress',
        projectId: project.id,
      },
    });
  }
  
  return results;
}

export async function runScheduledSync() {
  try {
    console.log('🔄 Executando sincronização agendada...');
    
    const syncResults = await createLocalwpProjectsAndAgents();
    console.log('✅ Projetos sincronizados:', syncResults.created.length);
    
    const changes = await checkChangesForAllSites();
    const taskResults = await processChangesAndCreateTasks(changes);
    console.log('✅ Tarefas criadas:', taskResults.length);
    
    return {
      sync: syncResults,
      changes,
      tasks: taskResults,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return { error: error.message };
  }
}

export default {
  initAutoSync,
  checkChangesForAllSites,
  checkSiteChanges,
  processChangesAndCreateTasks,
  runScheduledSync,
};