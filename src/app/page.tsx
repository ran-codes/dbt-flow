'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchManifest, parseManifestFile } from '@/lib/manifestParser';
import { buildGraph } from '@/lib/graphBuilder';
import { useGraphStore } from '@/store/useGraphStore';

export default function Home() {
  const router = useRouter();
  const { setGraph } = useGraphStore();
  const [url, setUrl] = useState('https://salurbal-mort-datwarehouse-v0-0-3.netlify.app');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: Remove this dev override before release - uses local test.json
      const response = await fetch('/test.json');
      if (!response.ok) throw new Error('Failed to load test manifest');
      const manifest = await response.json();
      const parsed = {
        nodes: [...Object.values(manifest.nodes || {}), ...Object.values(manifest.sources || {})],
        projectName: manifest.metadata?.project_name || 'Test Project',
        generatedAt: manifest.metadata?.generated_at || new Date().toISOString()
      };
      const { nodes, edges } = buildGraph(parsed.nodes);
      setGraph(nodes, edges, parsed);
      router.push('/visualize');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse manifest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsLoading(true);

    try {
      const manifest = await parseManifestFile(file);
      const { nodes, edges } = buildGraph(manifest.nodes);
      setGraph(nodes, edges, manifest);
      router.push('/visualize');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse manifest file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">dbt-flow</h1>
          <p className="text-sm text-slate-600">Interactive dbt Lineage Visualization</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Visualize Your dbt Project
            </h2>
            <p className="text-lg text-slate-600">
              Parse and explore dbt project lineage as an interactive DAG. Enter a dbt docs URL or
              upload your manifest.json file.
            </p>
          </div>

          {/* URL Input Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-2">
                  dbt Docs URL
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.netlify.app"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Enter the base URL of your dbt docs site (we'll fetch the manifest.json)
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isLoading ? 'Parsing...' : 'Parse & Visualize'}
              </button>
            </form>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700 mb-4">
                Or upload your manifest.json file
              </p>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                />
                <span className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg border-2 border-dashed border-slate-300 transition-colors">
                  Choose File
                </span>
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Fallback option if CORS blocks URL fetching
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Error:</span> {error}
              </p>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-600">
          <p>
            Built for visualizing dbt projects • No data leaves your browser • Open source on GitHub
          </p>
        </div>
      </footer>
    </div>
  );
}
