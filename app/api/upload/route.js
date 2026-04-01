import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Gerar um nome único
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
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
