/**
 * ============================================
 * WebfullSec — N8N Remote Sync API
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * API para receber sincronização do N8N remoto
 * Permite criar projetos via webhook externo
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, siteName, siteData, projects } = body;
    
    // Autenticação simples (melhorar em produção)
    if (body.apiKey !== process.env.N8N_API_KEY && process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    if (action === 'createProject') {
      // Cria um projeto a partir de dados do N8N
      const project = await prisma.project.create({
        data: {
          title: siteData.name,
          description: `## Site LocalWP\n\n**Caminho:** ${siteData.path}\n**Domínio:** ${siteData.domain}\n**WordPress:** ${siteData.wpVersion}\n**Tema:** ${siteData.themeName}\n**Plugins:** ${siteData.plugins?.length || 0}`,
          category: 'site',
          status: 'in_progress',
          priority: 2,
          generalContext: `## Dados Técnicos\n- WP: ${siteData.wpVersion}\n- Tema: ${siteData.themeName}\n- Plugins: ${siteData.plugins?.join(', ') || 'Nenhum'}`,
          icon: '🟦',
          tags: JSON.stringify(['wordpress', 'localwp']),
        },
      });
      
      if (siteData.agentName) {
        const agent = await prisma.agent.create({
          data: {
            name: `${siteData.agentName} DevAgent`,
            description: `Especialista no site ${siteData.name} no LocalWP.`,
            systemPrompt: siteData.systemPrompt || `Você é o ${siteData.agentName} DevAgent...`,
            llmModel: 'gemini-2.0-flash',
            isActive: true,
          },
        });
        
        await prisma.projectAgent.create({
          data: {
            projectId: project.id,
            agentId: agent.id,
            role: 'executor',
          },
        });
      }
      
      return NextResponse.json({ success: true, projectId: project.id });
    }
    
    if (action === 'bulkCreate') {
      const results = [];
      for (const site of projects || []) {
        const project = await prisma.project.create({
          data: {
            title: site.name,
            description: `## Site LocalWP\n\n**Caminho:** ${site.path}\n**Domínio:** ${site.domain}\n**WordPress:** ${site.wpVersion}`,
            category: 'site',
            status: 'in_progress',
            priority: 2,
            icon: '🟦',
          },
        });
        results.push({ name: site.name, projectId: project.id });
      }
      return NextResponse.json({ success: true, results });
    }
    
    if (action === 'ping') {
      return NextResponse.json({ success: true, message: 'Server online!' });
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ 
    message: 'N8N Remote Sync API',
    actions: ['createProject', 'bulkCreate', 'ping']
  });
}