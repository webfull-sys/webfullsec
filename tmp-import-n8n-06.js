const fs = require('fs');
const path = require('path');

async function importWorkflows() {
  const baseUrl = 'https://n8nwebfullsec.webfullvps.com.br/rest';
  const email = 'webfullsec@agenciawebfull.com.br';
  const password = "q3i]Y3'ldC;bs0j@";

  console.log('Autenticando no N8N...');
  
  // Login
  const loginRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!loginRes.ok) {
    console.error('Falha no login:', await loginRes.text());
    process.exit(1);
  }
  
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) {
    console.error('Não foi possível obter o cookie de autenticação.');
    process.exit(1);
  }
  console.log('Login efetuado com sucesso! Iniciando importação...');

  const workflowsDir = 'c:/Users/LuizFerreira/Downloads/WebfullSec/n8n-workflows';
  
  const files = [
    '06-caixa-de-entrada-universal.json'
  ];

  for (const file of files) {
    const filePath = path.join(workflowsDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Arquivo não encontrado: ${file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const wfInput = JSON.parse(content);
    
    // Formato exato N8N
    const payload = {
      name: wfInput.name,
      nodes: wfInput.nodes,
      connections: wfInput.connections,
      settings: wfInput.settings,
      staticData: null,
      meta: null,
      tags: [],
      active: true
    };
    
    const req = await fetch(`${baseUrl}/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify(payload)
    });

    if (req.ok) {
      const result = await req.json();
      console.log(`✅ [SUCESSO] Workflow importado e Ativado: ${payload.name} (ID: ${result.data.id})`);
    } else {
      console.error(`❌ [ERRO] Falha ao importar ${file}:`, await req.text());
    }
  }
}

importWorkflows();
