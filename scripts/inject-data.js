const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const dataPath = './prisma/backup_data.json';
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Arquivo de backup não encontrado!');
    process.exit(1);
  }

  console.log('📦 Carregando backup JSON...');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Ordem de inserção para respeitar Chaves Estrangeiras (Foreign Keys)
  const insertionOrder = [
    'user',
    'crmCliente',
    'aiProjeto',
    'beatProducao',
    'client',
    'project',
    'agent',
    'projectAgent',
    'projectLink',
    'projectBlock', // Pode ter self-relation, vamos tentar
    'task',         // Pode ter self-relation
    'memory',
    'timeBlock',
    'pomodoroSession',
    'dailyLog',
    'aiConversation',
    'aiMessage',
    'agentInteraction',
    'knowledgeBase',
    'baseConhecimentoVetorial',
    'burnoutLog',
    'serverMonitor',
    'notification',
    'reminder',
    'fileOrganizeJob',
    'fileOrganizeSchedule',
    'inboxItem',
    'aiAction'
  ];

  for (const model of insertionOrder) {
    const records = data[model];
    if (records && records.length > 0) {
      console.log(`\n⏳ Injetando ${records.length} registros em [${model}]...`);
      try {
        if (model === 'task' || model === 'projectBlock') {
            // Inserção sequencial para evitar problemas com self-relations (parentId)
            let successCount = 0;
            // Primeiro insere os que não tem parent
            const noParent = records.filter(r => !r.parentId);
            const hasParent = records.filter(r => !!r.parentId);
            
            for(const r of [...noParent, ...hasParent]) {
                try {
                    await prisma[model].create({ data: r });
                    successCount++;
                } catch(e) {
                    console.log(`  - Pulo/Erro em item de ${model}: ${e.message.split('\\n').pop()}`);
                }
            }
            console.log(`✅ [${model}] Injetados ${successCount}/${records.length} (com verificação de parentId).`);
        } else {
            // Em massa
            const result = await prisma[model].createMany({
            data: records,
            skipDuplicates: true
            });
            console.log(`✅ [${model}] Injetados: ${result.count}`);
        }
      } catch (err) {
        console.error(`❌ [${model}] Erro na injeção:`, err.message);
      }
    } else {
       console.log(`➖ Ignorando [${model}] (vazio)`);
    }
  }

  console.log('\n🎉 SUCESSO ABSOLUTO! Dados injetados no PostgreSQL na nuvem.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
