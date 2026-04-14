/**
 * ============================================
 * WebfullSec — LocalWP Scanner
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Scanner de sites LocalWP:
 * - Detecta sites WordPress no diretório configurado
 * - Extrai metadados (versões, plugins, temas)
 * - Integra com banco de dados ProjectLink
 */

import fs from 'fs';
import path from 'path';

export const LOCALWP_BASE_PATH = process.env.LOCALWP_BASE_PATH || 'C:\\Users\\LuizFerreira\\Local Sites';

export async function scanLocalWpSites(customPath = null) {
  const basePath = customPath || LOCALWP_BASE_PATH;
  
  if (!fs.existsSync(basePath)) {
    throw new Error(`Diretório LocalWP não encontrado: ${basePath}`);
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });
  const sites = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const sitePath = path.join(basePath, entry.name);
    const siteData = await extractSiteData(entry.name, sitePath);
    
    if (siteData.isValid) {
      sites.push(siteData);
    }
  }

  return sites;
}

async function extractSiteData(siteName, sitePath) {
  const publicPath = path.join(sitePath, 'app', 'public');
  const wpConfigPath = path.join(publicPath, 'wp-config.php');
  const wpContentPath = path.join(publicPath, 'wp-content');
  
  const isValid = fs.existsSync(wpConfigPath);
  
  if (!isValid) {
    return { name: siteName, path: sitePath, isValid: false };
  }

  let wpVersion = null;
  let phpVersion = null;
  let themeName = null;
  let plugins = [];
  let dbType = null;

  try {
    const wpVersionPath = path.join(publicPath, 'wp-includes', 'version.php');
    if (fs.existsSync(wpVersionPath)) {
      const versionContent = fs.readFileSync(wpVersionPath, 'utf-8');
      const wpVersionMatch = versionContent.match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
      if (wpVersionMatch) wpVersion = wpVersionMatch[1];
    }
  } catch {}

  try {
    const themePath = path.join(wpContentPath, 'themes');
    if (fs.existsSync(themePath)) {
      const themes = fs.readdirSync(themePath).filter(f => {
        return fs.statSync(path.join(themePath, f)).isDirectory();
      });
      const activeTheme = themes.find(t => fs.existsSync(path.join(themePath, t, 'style.css')));
      if (activeTheme) {
        const styleCss = fs.readFileSync(path.join(themePath, activeTheme, 'style.css'), 'utf-8');
        const themeNameMatch = styleCss.match(/Theme Name:\s*([^\n]+)/);
        themeName = themeNameMatch ? themeNameMatch[1].trim() : activeTheme;
      }
    }
  } catch {}

  try {
    const pluginsPath = path.join(wpContentPath, 'plugins');
    if (fs.existsSync(pluginsPath)) {
      plugins = fs.readdirSync(pluginsPath).filter(f => {
        const stat = fs.statSync(path.join(pluginsPath, f));
        return stat.isDirectory() && !f.startsWith('.');
      });
    }
  } catch {}

  try {
    const dbFile = path.join(sitePath, 'app', 'local-sqlite', 'database');
    if (fs.existsSync(dbFile) || fs.existsSync(sitePath + '\\app\\conf\\database\\database.sqlite')) {
      dbType = 'SQLite';
    } else if (fs.existsSync(path.join(sitePath, 'app'))) {
      const confFiles = fs.readdirSync(path.join(sitePath, 'app', 'conf'));
      if (confFiles.some(f => f.includes('mysql'))) dbType = 'MariaDB';
    }
  } catch {
    dbType = 'Unknown';
  }

  return {
    name: siteName,
    path: sitePath,
    publicPath,
    isValid: true,
    wpVersion,
    phpVersion,
    themeName,
    plugins,
    dbType,
    domain: `${siteName}.local`,
  };
}

export async function getSiteDetails(siteName) {
  const sites = await scanLocalWpSites();
  const baseSite = sites.find(s => s.name.toLowerCase() === siteName.toLowerCase());
  
  if (!baseSite) return null;
  
  const extraDetails = await extractAdvancedDetails(baseSite);
  return { ...baseSite, ...extraDetails };
}

async function extractAdvancedDetails(site) {
  const details = {
    wpConfig: {},
    activePlugins: [],
    muPlugins: [],
    isMultisite: false,
  };
  
  const publicPath = site.publicPath;
  if (!publicPath || !fs.existsSync(publicPath)) return details;
  
  try {
    const wpConfigPath = path.join(publicPath, 'wp-config.php');
    if (fs.existsSync(wpConfigPath)) {
      const content = fs.readFileSync(wpConfigPath, 'utf-8');
      if (content.includes('MULTISITE')) details.isMultisite = true;
      const tableMatch = content.match(/\$table_prefix\s*=\s*['"]([^'"]+)['"]/);
      if (tableMatch) details.wpConfig.tablePrefix = tableMatch[1];
    }
    
    const muPluginsPath = path.join(publicPath, 'wp-content', 'mu-plugins');
    if (fs.existsSync(muPluginsPath)) {
      details.muPlugins = fs.readdirSync(muPluginsPath).filter(f => f.endsWith('.php'));
    }
    
    details.activePlugins = site.plugins?.slice(0, 10) || [];
  } catch {}
  
  return details;
}

export async function getSiteFiles(siteName, relativeTo = 'app/public') {
  const sites = await scanLocalWpSites();
  const site = sites.find(s => s.name.toLowerCase() === siteName.toLowerCase());
  
  if (!site) return null;

  const siteRoot = path.join(site.path, relativeTo);
  if (!fs.existsSync(siteRoot)) return [];

  const files = [];
  
  function listFilesRecursive(dir, depth = 0) {
    if (depth > 3) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(siteRoot, fullPath),
          size: stat.size,
          modifiedAt: stat.mtime,
        });
      } else if (entry.isDirectory()) {
        listFilesRecursive(fullPath, depth + 1);
      }
    }
  }

  listFilesRecursive(siteRoot);
  return files;
}

export default {
  scanLocalWpSites,
  getSiteDetails,
  getSiteFiles,
  LOCALWP_BASE_PATH,
};