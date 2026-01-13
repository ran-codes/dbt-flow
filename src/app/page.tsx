'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchManifest, parseManifestFile, type DbtManifest } from '@/lib/manifestParser';
import { buildGraph } from '@/lib/graphBuilder';
import { useGraphStore } from '@/store/useGraphStore';
import { listProjects, deleteProject, saveProject, exportDatabase, importDatabase, type DatabaseBackup } from '@/lib/storageService';
import { generateProjectId, type ProjectMetadata, type SavedProject } from '@/lib/persistence';

export default function Home() {
  const router = useRouter();
  const { setGraph } = useGraphStore();
  const [url, setUrl] = useState('https://salurbal-mort-datwarehouse-v0-0-3.netlify.app');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectMetadata[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Load saved projects on mount
  useEffect(() => {
    listProjects().then(setSavedProjects);
  }, []);

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
    setError('');
    setIsLoading(true);

    try {
      const currentPath = window.location.pathname.endsWith('/')
        ? window.location.pathname.slice(0, -1)
        : window.location.pathname;

      const manifestUrl = `${window.location.origin}${currentPath}/${manifestFileName}`;
      const response = await fetch(manifestUrl);

      if (!response.ok) {
        throw new Error(`Failed to load ${projectName} demo (${response.status}: ${response.statusText})`);
      }

      const manifest = await response.json() as DbtManifest;

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
      setGraph(nodes, edges, parsed);
      router.push('/visualize');
    } catch (err) {
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

  const handleOpenProject = (projectId: string) => {
    router.push(`/visualize?project=${projectId}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    setDeletingId(projectId);
    const success = await deleteProject(projectId);
    if (success) {
      setSavedProjects(prev => prev.filter(p => p.id !== projectId));
    }
    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleBackupDatabase = async () => {
    setError('');
    setIsLoading(true);

    try {
      const backup = await exportDatabase();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dbt-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const projectCount = savedProjects.length;
    const confirmed = confirm(
      `This will replace all ${projectCount} existing project${projectCount !== 1 ? 's' : ''} with the backup contents.\n\nThis cannot be undone. Continue?`
    );

    if (!confirmed) {
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text) as DatabaseBackup;

      // Validate it's a database backup (not a single project)
      if (!backup.projects || !Array.isArray(backup.projects)) {
        throw new Error('Invalid backup file. This appears to be a single project file, not a database backup.');
      }

      const success = await importDatabase(backup);
      if (success) {
        // Refresh the list
        const projects = await listProjects();
        setSavedProjects(projects);
      } else {
        throw new Error('Failed to restore backup');
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON file. Please check the file format.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to restore backup');
      }
    } finally {
      setIsLoading(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsLoading(true);

    try {
      const text = await file.text();
      const imported = JSON.parse(text) as SavedProject;

      // Validate structure
      if (!imported.nodes || !imported.edges || !imported.metadata) {
        throw new Error('Invalid project file format');
      }

      // Generate new ID to avoid conflicts
      const newId = generateProjectId();
      const project: SavedProject = {
        ...imported,
        metadata: {
          ...imported.metadata,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Save to storage
      const success = await saveProject(project);
      if (success) {
        // Refresh the list and navigate to the project
        const projects = await listProjects();
        setSavedProjects(projects);
        router.push(`/visualize?project=${newId}`);
      } else {
        throw new Error('Failed to save imported project');
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON file. Please check the file format.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to import project');
      }
    } finally {
      setIsLoading(false);
      // Reset input
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">dbt-flow</h1>
          <p className="text-sm text-slate-500">Interactive dbt lineage visualization</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          onChange={handleImportProject}
          className="hidden"
        />
        <input
          ref={restoreInputRef}
          type="file"
          accept=".json"
          onChange={handleRestoreDatabase}
          className="hidden"
        />

        {/* Saved Projects Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Saved Projects
            </h2>
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={isLoading}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Import project
            </button>
          </div>
          {savedProjects.length > 0 ? (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
              {savedProjects.map((project) => (
                <div
                  key={project.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{project.name}</p>
                    <p className="text-sm text-slate-500">
                      {project.sourceProjectName} · {project.nodeCount} nodes · {project.plannedNodeCount} planned · Updated {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleOpenProject(project.id)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={deletingId === project.id}
                      className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      {deletingId === project.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-slate-200 border-dashed rounded-lg px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No saved projects yet</p>
              <p className="text-xs text-slate-400 mt-1">Projects you save will appear here</p>
            </div>
          )}
          {/* Database backup/restore */}
          <div className="mt-3 flex items-center justify-end gap-3 text-xs">
            <button
              onClick={handleBackupDatabase}
              disabled={isLoading || savedProjects.length === 0}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Backup DB
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => restoreInputRef.current?.click()}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
            >
              Restore DB
            </button>
          </div>
        </section>

        {/* Start New Section */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Start New
          </h2>
          <div className="border border-slate-200 rounded-lg p-5">
            {/* URL Input */}
            <form onSubmit={handleUrlSubmit} className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                From dbt Docs URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.netlify.app"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Fetch'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                We'll fetch manifest.json from your dbt docs site
              </p>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white text-xs text-slate-400">or</span>
              </div>
            </div>

            {/* File and JSON options */}
            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                />
                <span className="block px-4 py-2.5 text-sm font-medium text-slate-700 text-center border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                  Upload manifest.json
                </span>
              </label>
              <button
                onClick={() => setShowJsonInput(!showJsonInput)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                {showJsonInput ? 'Hide JSON input' : 'Paste JSON'}
              </button>
            </div>

            {/* JSON Input Area */}
            {showJsonInput && (
              <div className="mt-4">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Paste your manifest.json content here..."
                  disabled={isLoading}
                  className="w-full h-40 px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-y"
                />
                <button
                  onClick={handleJsonPaste}
                  disabled={isLoading || !jsonText.trim()}
                  className="mt-2 w-full px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
                >
                  {isLoading ? 'Parsing...' : 'Parse & Visualize'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Sample Projects Section */}
        <section>
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Sample Projects
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                name: 'Jaffle Shop',
                description: 'Classic dbt tutorial with staging & marts',
                manifest: 'manifest_jaffle_active_v0_0_1.json',
              },
              {
                name: 'Data Warehouse',
                description: 'Production warehouse with custom layers',
                manifest: 'test.json',
              },
              {
                name: 'Lakehouse',
                description: 'Modern multi-layer architecture',
                manifest: 'manifest_salurbal_api_v1_2_2.json',
              },
            ].map((sample) => (
              <div
                key={sample.name}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
              >
                <p className="font-medium text-slate-900 mb-1">{sample.name}</p>
                <p className="text-sm text-slate-500 mb-3">{sample.description}</p>
                <button
                  onClick={() => handleDemoClick(sample.manifest, sample.name)}
                  disabled={isLoading}
                  className="w-full px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent" />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm text-slate-500 text-center">
            No data leaves your browser · Open source
          </p>
        </div>
      </footer>
    </div>
  );
}
