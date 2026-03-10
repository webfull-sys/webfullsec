import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Instância do Gemini para gerar embeddings da pergunta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { query, limit = 3 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'A query (pergunta) é obrigatória' }, { status: 400 });
    }

    // 1. Usa o Gemini para transformar a pergunta em Vetor (Embedding)
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(query);
    const embedding = result.embedding.values;
    
    // Converte o array de números para a representação de string "[0.1, 0.2, ...]" exigida pelo pgvector
    const embeddingString = `[${embedding.join(',')}]`;

    // 2. IMPORTANTE: Localmente o SQLite não suporta busca vetorial do PGVector (distância cosseno <=>).
    // Para funcionar em Dev (SQLite), mockamos a busca; em Prod (Postgres), usamos SQL bruto.
    
    // Verificar se está usando SQLite (local temp)
    const isSqlite = process.env.DATABASE_URL.startsWith('file:') || process.env.DATABASE_URL.includes('sqlite');

    let matches = [];

    if (isSqlite) {
      // MOCK: Retorna resultados simples baseados em texto em dev/sqlite
      console.warn("⚠️ Ambiente de Dev (SQLite): Busca vetorial matemática ignorada. Usando fallback de texto (LIKE).");
      matches = await prisma.knowledgeBase.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } }
          ]
        },
        take: limit
      });
      
    } else {
      // PROD: Busca matemática vetorial poderosa no PostgreSQL
      // O operador <=> calcula a distância de cosseno entre o vetor salvo e a nova pergunta.
      // Quanto MENOR o número, mais perto (semântico) o documento é da pergunta.
      
      matches = await prisma.$queryRaw`
        SELECT id, title, content, 1 - (embedding <=> ${embeddingString}::vector) as similarity
        FROM "KnowledgeBase"
        ORDER BY embedding <=> ${embeddingString}::vector
        LIMIT ${limit};
      `;
    }

    return NextResponse.json({
      query,
      results: matches
    });

  } catch (error) {
    console.error('Erro na Busca Semântica:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar base de conhecimento vetorial.' },
      { status: 500 }
    );
  }
}
