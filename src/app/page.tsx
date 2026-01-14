'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
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
  const [savedProjects, setSavedProjects] = useState<ProjectMetadata[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manifestDropdownOpen, setManifestDropdownOpen] = useState(false);
  const [sampleDropdownOpen, setSampleDropdownOpen] = useState(false);
  const [activeManifestOption, setActiveManifestOption] = useState<'url' | 'paste' | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'name-asc' | 'name-desc'>('recent');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const manifestUploadRef = useRef<HTMLInputElement>(null);
  const manifestDropdownRef = useRef<HTMLDivElement>(null);
  const sampleDropdownRef = useRef<HTMLDivElement>(null);

  // Load saved projects on mount
  useEffect(() => {
    listProjects().then(setSavedProjects);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manifestDropdownRef.current && !manifestDropdownRef.current.contains(event.target as Node)) {
        setManifestDropdownOpen(false);
      }
      if (sampleDropdownRef.current && !sampleDropdownRef.current.contains(event.target as Node)) {
        setSampleDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and sort projects
  const filteredProjects = savedProjects
    .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    .sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'recent':
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
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
      a.download = `dbt-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
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
        <input
          ref={manifestUploadRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Get Started Section */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-slate-900 uppercase tracking-wide mb-3">
            Get Started
          </h2>
          <div className="border border-slate-200 rounded-lg p-4">
            {/* Three buttons in a row */}
            <div className="flex gap-3">
              {/* Import dbt Project Dropdown */}
              <div className="relative flex-1" ref={manifestDropdownRef}>
                <button
                  onClick={() => {
                    setManifestDropdownOpen(!manifestDropdownOpen);
                    setSampleDropdownOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  Import dbt Project
                  <svg className={`w-4 h-4 transition-transform ${manifestDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {manifestDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                    <button
                      onClick={() => {
                        setActiveManifestOption('url');
                        setManifestDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors text-slate-900"
                    >
                      Enter URL
                    </button>
                    <button
                      onClick={() => {
                        manifestUploadRef.current?.click();
                        setManifestDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors text-slate-900"
                    >
                      Upload file
                    </button>
                    <button
                      onClick={() => {
                        setActiveManifestOption('paste');
                        setManifestDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors text-slate-900"
                    >
                      Paste JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Start Blank Project Button */}
              <button
                onClick={() => router.push('/visualize?blank=true')}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                Start Blank Project
              </button>

              {/* Open Sample Project Dropdown */}
              <div className="relative flex-1" ref={sampleDropdownRef}>
                <button
                  onClick={() => {
                    setSampleDropdownOpen(!sampleDropdownOpen);
                    setManifestDropdownOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-sm font-medium text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  Open Sample Project
                  <svg className={`w-4 h-4 transition-transform ${sampleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sampleDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                    <button
                      onClick={() => router.push('/visualize?sample=jaffle')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-900">Jaffle Shop</span>
                      <span className="block text-xs text-slate-500">Classic dbt tutorial</span>
                    </button>
                    <button
                      onClick={() => router.push('/visualize?sample=warehouse')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-900">Data Warehouse</span>
                      <span className="block text-xs text-slate-500">Custom layers</span>
                    </button>
                    <button
                      onClick={() => router.push('/visualize?sample=lakehouse')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-900">Lakehouse</span>
                      <span className="block text-xs text-slate-500">Multi-layer architecture</span>
                    </button>
                    <button
                      onClick={() => router.push('/visualize?sample=salurbal')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-900">SALURBAL Mortality</span>
                      <span className="block text-xs text-slate-500">Metadata inheritance demo</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded options below buttons */}
            {activeManifestOption === 'url' && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <form onSubmit={handleUrlSubmit}>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    dbt Docs URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.netlify.app"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      disabled={isLoading}
                      autoFocus
                      required
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
                    >
                      {isLoading ? 'Loading...' : 'Fetch'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveManifestOption(null)}
                      className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeManifestOption === 'paste' && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Paste manifest.json
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Paste your manifest.json content here..."
                  disabled={isLoading}
                  autoFocus
                  className="w-full h-40 px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-y"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleJsonPaste}
                    disabled={isLoading || !jsonText.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
                  >
                    {isLoading ? 'Parsing...' : 'Parse & Visualize'}
                  </button>
                  <button
                    onClick={() => {
                      setActiveManifestOption(null);
                      setJsonText('');
                    }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Saved Projects Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3 gap-4">
            <h2 className="text-sm font-medium text-slate-900 uppercase tracking-wide whitespace-nowrap">
              Saved Projects {savedProjects.length > 0 && `(${savedProjects.length})`}
            </h2>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent w-40"
                />
              </div>
              {/* Sort dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  {sortOrder === 'recent' ? 'Recent' : sortOrder === 'name-asc' ? 'A-Z' : 'Z-A'}
                  <svg className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sortDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                    <button
                      onClick={() => { setSortOrder('recent'); setSortDropdownOpen(false); }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${sortOrder === 'recent' ? 'text-slate-900 font-medium' : 'text-slate-900'}`}
                    >
                      Recent first
                    </button>
                    <button
                      onClick={() => { setSortOrder('name-asc'); setSortDropdownOpen(false); }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${sortOrder === 'name-asc' ? 'text-slate-900 font-medium' : 'text-slate-900'}`}
                    >
                      Name A-Z
                    </button>
                    <button
                      onClick={() => { setSortOrder('name-desc'); setSortDropdownOpen(false); }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${sortOrder === 'name-desc' ? 'text-slate-900 font-medium' : 'text-slate-900'}`}
                    >
                      Name Z-A
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {filteredProjects.length > 0 ? (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
              {filteredProjects.map((project) => (
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
                      className="px-3 py-1.5 text-sm font-medium text-slate-900 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
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
          ) : savedProjects.length > 0 ? (
            <div className="border border-slate-200 border-dashed rounded-lg px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No projects match your search</p>
            </div>
          ) : (
            <div className="border border-slate-200 border-dashed rounded-lg px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No saved projects yet</p>
              <p className="text-xs text-slate-400 mt-1">Projects you save will appear here</p>
            </div>
          )}
          {/* Database backup/restore */}
          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <button
              onClick={handleBackupDatabase}
              disabled={isLoading || savedProjects.length === 0}
              className="px-3 py-1.5 text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Backup DB
            </button>
            <button
              onClick={() => restoreInputRef.current?.click()}
              disabled={isLoading}
              className="px-3 py-1.5 text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Restore DB
            </button>
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
      <footer className="border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm text-slate-500 text-center">
            No data leaves your browser · Open source
          </p>
        </div>
      </footer>
    </div>
  );
}
