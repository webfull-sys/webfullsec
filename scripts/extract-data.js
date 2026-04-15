const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const data = {};
  
  const models = [
    'user', 'client', 'project', 'task', 'inboxItem', 'memory', 
    'timeBlock', 'pomodoroSession', 'dailyLog', 'aiConversation', 
    'aiMessage', 'aiAction', 'notification', 'reminder', 
    'projectLink', 'serverMonitor', 'burnoutLog', 'agent', 
    'projectBlock', 'projectAgent', 'agentInteraction', 'knowledgeBase',
    'crmCliente', 'aiProjeto', 'beatProducao', 'baseConhecimentoVetorial',
    'fileOrganizeJob', 'fileOrganizeSchedule'
  ];

  console.log('Iniciando extração de dados do SQLite...');

  for (const model of models) {
    if (prisma[model]) {
      try {
        const records = await prisma[model].findMany();
        if (records.length > 0) {
          data[model] = records;
          console.log(`✅ [${model}] -> Extracão de ${records.length} registros concluída.`);
        } else {
            console.log(`➖ [${model}] -> Nenhum registro encontrado.`);
        }
      } catch (err) {
        console.error(`❌ [${model}] Erro na extração:`, err.message);
      }
    }
  }

  const exportPath = './prisma/backup_data.json';
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
  console.log(`\n🎉 SUCESSO! Todos os dados seguros em: ${exportPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
