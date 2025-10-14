'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchManifest, parseManifestFile, type DbtManifest } from '@/lib/manifestParser';
import { buildGraph } from '@/lib/graphBuilder';
import { useGraphStore } from '@/store/useGraphStore';

export default function Home() {
  const router = useRouter();
  const { setGraph } = useGraphStore();
  const [url, setUrl] = useState('https://salurbal-mort-datwarehouse-v0-0-3.netlify.app');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const manifest = await fetchManifest(url);
      const { nodes, edges } = buildGraph(manifest.nodes);
      setGraph(nodes, edges, manifest);
      router.push('/visualize');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse manifest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = async (manifestFileName: string, projectName: string) => {
    console.log(`=== DEMO BUTTON CLICKED: ${projectName} ===`);
    console.log('Manifest file:', manifestFileName);

    setError('');
    setIsLoading(true);

    try {
      // Load the demo manifest from public folder
      const currentPath = window.location.pathname.endsWith('/')
        ? window.location.pathname.slice(0, -1)
        : window.location.pathname;

      const manifestUrl = `${window.location.origin}${currentPath}/${manifestFileName}`;
      console.log('Fetching:', manifestUrl);

      const response = await fetch(manifestUrl);

      if (!response.ok) {
        throw new Error(`Failed to load ${projectName} demo (${response.status}: ${response.statusText})`);
      }

      const manifest = await response.json() as DbtManifest;
      console.log('✅ Demo manifest loaded successfully');

      const parsed = {
        nodes: [
          ...Object.values(manifest.nodes || {}),
          ...Object.values(manifest.sources || {}),
          ...Object.values(manifest.seeds || {})
        ],
        projectName: manifest.metadata?.project_name || projectName,
        generatedAt: manifest.metadata?.generated_at || new Date().toISOString()
      };

      const { nodes, edges } = buildGraph(parsed.nodes);
      console.log('Graph built - nodes:', nodes.length, 'edges:', edges.length);

      setGraph(nodes, edges, parsed);
      router.push('/visualize');
    } catch (err) {
      console.error('❌ Demo loading error:', err);
      setError(err instanceof Error ? err.message : `Failed to load ${projectName} demo`);
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

  const handleJsonPaste = async () => {
    if (!jsonText.trim()) {
      setError('Please paste manifest.json content');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const manifest: DbtManifest = JSON.parse(jsonText);

      const parsed = {
        nodes: [
          ...Object.values(manifest.nodes || {}),
          ...Object.values(manifest.sources || {}),
          ...Object.values(manifest.seeds || {})
        ],
        projectName: manifest.metadata?.project_name || 'Pasted Manifest',
        generatedAt: manifest.metadata?.generated_at || new Date().toISOString()
      };

      const { nodes, edges } = buildGraph(parsed.nodes);
      setGraph(nodes, edges, parsed);
      router.push('/visualize');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your pasted content.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to parse manifest');
      }
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

          {/* Load Your Project */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">
              Load Your Project
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Choose how to import your manifest.json
            </p>

            <div className="space-y-4">
              {/* URL Input */}
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
                    From dbt Docs URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.netlify.app"
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isLoading ? 'Loading...' : 'Fetch'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    We'll automatically fetch manifest.json from your dbt docs site
                  </p>
                </div>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-slate-500">OR</span>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload File
                </label>
                <label className="inline-block cursor-pointer w-full">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <span className="block bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-lg border-2 border-dashed border-slate-300 transition-colors text-center">
                    Choose manifest.json file
                  </span>
                </label>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-slate-500">OR</span>
                </div>
              </div>

              {/* Paste JSON */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste manifest.json Content
                </label>
                <button
                  onClick={() => setShowJsonInput(!showJsonInput)}
                  disabled={isLoading}
                  className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-lg border-2 border-dashed border-slate-300 transition-colors"
                >
                  {showJsonInput ? 'Hide JSON Input' : 'Show JSON Input'}
                </button>

                {showJsonInput && (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      placeholder='Paste your manifest.json content here...'
                      disabled={isLoading}
                      className="w-full h-48 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs resize-y"
                    />
                    <button
                      onClick={handleJsonPaste}
                      disabled={isLoading || !jsonText.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      {isLoading ? 'Parsing...' : 'Parse & Visualize'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Demo Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">
              Try Sample Projects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Jaffle Shop Demo */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border border-green-100">
                <div className="text-center">
                  <div className="text-3xl mb-2">🥪</div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Jaffle Shop
                  </p>
                  <p className="text-xs text-slate-600 mb-4">
                    Classic dbt tutorial project with staging & marts
                  </p>
                  <button
                    onClick={() => handleDemoClick('manifest_jaffle_active_v0_0_1.json', 'Jaffle Shop')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    {isLoading ? 'Loading...' : 'View Project'}
                  </button>
                </div>
              </div>

              {/* Data Warehouse Demo */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border border-blue-100">
                <div className="text-center">
                  <div className="text-3xl mb-2">🏢</div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Data Warehouse
                  </p>
                  <p className="text-xs text-slate-600 mb-4">
                    Production data warehouse with custom layers
                  </p>
                  <button
                    onClick={() => handleDemoClick('test.json', 'Data Warehouse')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    {isLoading ? 'Loading...' : 'View Project'}
                  </button>
                </div>
              </div>

              {/* Lakehouse Demo */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-6 border border-purple-100">
                <div className="text-center">
                  <div className="text-3xl mb-2">🏠</div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Lakehouse
                  </p>
                  <p className="text-xs text-slate-600 mb-4">
                    Modern lakehouse architecture with multi-layer design
                  </p>
                  <button
                    onClick={() => handleDemoClick('manifest_salurbal_api_v1_2_2.json', 'Lakehouse')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    {isLoading ? 'Loading...' : 'View Project'}
                  </button>
                </div>
              </div>
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
