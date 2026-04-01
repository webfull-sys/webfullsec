import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ success: false, error: 'Arquivo excede o limite de 10MB' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Tipo de arquivo não permitido' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gerar um nome único
    const safeName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase();
    const uniqueFileName = `${Date.now()}-${safeName}`;
    
    // Caminho local no disco (public/uploads)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Garantir que a pasta existe
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignora erro se já existe
    }

    const path = join(uploadDir, uniqueFileName);
    
    // Salvar o arquivo
    await writeFile(path, buffer);
    
    // URL que o frontend vai usar (relativa à raiz)
    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error) {
    console.error('Erro no upload local:', error);
    return NextResponse.json({ success: false, error: 'Erro no servidor durante upload' }, { status: 500 });
  }
}
