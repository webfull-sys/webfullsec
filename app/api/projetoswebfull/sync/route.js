import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createProjectAndAgent } from '@/lib/projetoswebfull-projects';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, projectData, projects } = body;
    
    if (action === 'bulkCreate') {
      const results = [];
      for (const proj of projects || []) {
        try {
          const result = await createProjectAndAgent(proj);
          results.push({ name: proj.name, projectId: result.projectId, success: true });
        } catch (error) {
          results.push({ name: proj.name, error: error.message, success: false });
        }
      }
      return NextResponse.json({ success: true, results });
    }
    
    if (action === 'createProject') {
      if (!projectData) {
        return NextResponse.json({ error: 'Dados do projeto são obrigatórios' }, { status: 400 });
      }
      const result = await createProjectAndAgent(projectData);
      return NextResponse.json({ success: true, projectId: result.projectId, agentId: result.agentId });
    }
    
    if (action === 'ping') {
      return NextResponse.json({ success: true, message: 'Server online!' });
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('ProjetosWebfull Sync API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'ProjetosWebfull Sync API',
    actions: ['bulkCreate', 'createProject', 'ping']
  });
}
