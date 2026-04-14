'use client';

import { useState } from 'react';
import { Folder, Code, Database, GitBranch, Plus, ArrowRight, Loader } from 'lucide-react';

export default function CustomScanPage() {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!path.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/custom/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: path.trim(),
          options: { createAgent: true }
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Erro desconhecido');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Folder className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-3xl font-bold">Scanner de Projeto Custom</h1>
            <p className="text-gray-400 mt-1">
              Escaneie qualquer diretório e crie um projeto no WebfullSec
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Caminho do projeto no seu PC
            </label>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:\Users\LuizFerreira\MeuProjeto"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              
              <button
                type="submit"
                disabled={loading || !path.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Criar
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Exemplo: C:\Users\LuizFerreira\Projects\meu-projeto
            </p>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400">❌ Erro: {error}</p>
          </div>
        )}

        {result && (
          <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{result.projectData.name}</h2>
                <p className="text-emerald-400">Projeto criado com sucesso!</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Tipo:</span>
                <p className="font-medium">{result.projectData.type}</p>
              </div>
              <div>
                <span className="text-gray-500">Arquivos:</span>
                <p className="font-medium">{result.projectData.files}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Tecnologias:</span>
                <p className="font-medium">{result.projectData.techStack?.join(', ') || 'Nenhuma'}</p>
              </div>
            </div>
            
            <a
              href={`/projects/${result.projectId}`}
              className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Ver projeto
            </a>
          </div>
        )}

        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="font-medium mb-2">Tipos de projeto suportados:</h3>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'React', 'Node.js', 'WordPress', 'PHP/Laravel', 'Python', 'Go', 'Rust'].map(type => (
              <span key={type} className="text-xs px-2 py-1 bg-gray-800 rounded">
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}