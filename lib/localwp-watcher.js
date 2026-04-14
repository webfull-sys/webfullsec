/**
 * ============================================
 * WebfullSec — LocalWP Watcher
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Monitor de alterações em sites LocalWP:
 * - Detecta mudanças em arquivos
 * - Registra no banco de dados
 * - Suporta触发 ações via IA
 */

import fs from 'fs';
import path from 'path';
import { scanLocalWpSites } from './localwp-scanner';

const lastState = new Map();

export async function checkForChanges(siteName = null) {
  const changes = [];
  const sites = await scanLocalWpSites();
  
  const targetSites = siteName 
    ? sites.filter(s => s.name.toLowerCase() === siteName.toLowerCase())
    : sites;

  for (const site of targetSites) {
    const siteChanges = await detectChanges(site);
    changes.push(...siteChanges);
    
    lastState.set(site.name, {
      timestamp: Date.now(),
      files: await getFileSnapshot(site),
    });
  }

  return changes;
}

async function detectChanges(site) {
  const changes = [];
  const publicPath = site.publicPath;
  const lastSnap = lastState.get(site.name);
  
  if (!lastSnap) {
    const initialSnapshot = await getFileSnapshot(site);
    lastState.set(site.name, { timestamp: Date.now(), files: initialSnapshot });
    return [{
      type: 'initial_scan',
      site: site.name,
      message: `Scan inicial: ${initialSnapshot.length} arquivos detectados`,
      timestamp: new Date().toISOString(),
    }];
  }

  const currentFiles = await getFileSnapshot(site);
  const lastFiles = lastSnap.files;

  const currentPaths = new Set(currentFiles.map(f => f.path));
  const lastPaths = new Set(lastFiles.map(f => f.path));

  for (const file of currentFiles) {
    if (!lastPaths.has(file.path)) {
      changes.push({
        type: 'file_created',
        site: site.name,
        file: file.path,
        relativePath: file.relativePath,
        size: file.size,
        timestamp: new Date().toISOString(),
      });
    }
  }

  for (const file of lastFiles) {
    if (!currentPaths.has(file.path)) {
      changes.push({
        type: 'file_deleted',
        site: site.name,
        file: file.path,
        relativePath: file.relativePath,
        timestamp: new Date().toISOString(),
      });
    }
  }

  for (const file of currentFiles) {
    const lastFile = lastFiles.find(f => f.path === file.path);
    if (lastFile && lastFile.modifiedAt !== file.modifiedAt) {
      changes.push({
        type: 'file_modified',
        site: site.name,
        file: file.path,
        relativePath: file.relativePath,
        oldSize: lastFile.size,
        newSize: file.size,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return changes;
}

async function getFileSnapshot(site) {
  const publicPath = site.publicPath;
  const files = [];
  
  const scanDir = (dir, depth = 0) => {
    if (depth > 4) return;
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

export async function getSiteStatus(siteName) {
  const sites = await scanLocalWpSites();
  const site = sites.find(s => s.name.toLowerCase() === siteName.toLowerCase());
  
  if (!site) return { error: 'Site não encontrado' };

  const publicPath = site.publicPath;
  const hasWp = fs.existsSync(path.join(publicPath, 'wp-config.php'));
  
  return {
    name: site.name,
    domain: site.domain,
    isOnline: hasWp,
    wpVersion: site.wpVersion,
    theme: site.themeName,
    pluginsCount: site.plugins.length,
    dbType: site.dbType,
    lastChecked: new Date().toISOString(),
  };
}

export default {
  checkForChanges,
  getSiteStatus,
};