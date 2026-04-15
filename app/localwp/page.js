'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, Server, Database, Layers, Clock, RefreshCw, ExternalLink, Search } from 'lucide-react';

export default function LocalWpPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState(null);
  const [changes, setChanges] = useState([]);
  const [activeTab, setActiveTab] = useState('sites');

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/localwp/sites?action=list');
      const data = await res.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error('Erro ao carregar sites:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkChanges = useCallback(async (siteName) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/localwp/sites?action=details&name=${siteName}`);
      const data = await res.json();
      setSelectedSite(data.site || null);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Server className="w-8 h-8 text-cyan-400" />
              LocalWP Sites
            </h1>
            <p className="text-gray-400 mt-1">
              Integração em tempo real com seus projetos WordPress locais
            </p>
          </div>
          <button
            onClick={loadSites}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('sites')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'sites' ? 'bg-cyan-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Folder className="w-4 h-4 inline mr-2" />
            Sites ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'changes' ? 'bg-cyan-600' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Alterações Recentes
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        ) : activeTab === 'sites' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <div
                key={site.name}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/50 transition-colors cursor-pointer"
                onClick={() => checkChanges(site.name)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{site.name}</h3>
                    <span className="text-sm text-cyan-400">{site.domain}</span>
                  </div>
                  <Server className="w-5 h-5 text-gray-500" />
                </div>
                
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>WP {site.wpVersion || '?'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span>{site.dbType || 'Desconhecido'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded">
                      {site.plugins?.length || 0} plugins
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {changes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma alteração detectada ainda</p>
              </div>
            ) : (
              changes.map((change, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      change.type === 'file_created'
                        ? 'bg-green-500'
                        : change.type === 'file_deleted'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-mono text-sm">{change.relativePath}</p>
                    <p className="text-xs text-gray-500">{change.site}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(change.timestamp).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {selectedSite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedSite.name}</h2>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Domínio</span>
                  <span>{selectedSite.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">WordPress</span>
                  <span>{selectedSite.wpVersion || '?'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tema</span>
                  <span>{selectedSite.themeName || '?'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Banco</span>
                  <span>{selectedSite.dbType}</span>
                </div>
                <div>
                  <span className="text-gray-400">Plugins ({selectedSite.plugins?.length})</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSite.plugins?.map((p) => (
                      <span
                        key={p}
                        className="text-xs px-2 py-1 bg-gray-800 rounded"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}