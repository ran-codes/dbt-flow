'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/useGraphStore';
import ExportModal from '@/components/ExportModal';
import SaveProjectModal from '@/components/SaveProjectModal';
import { loadProject, saveProject } from '@/lib/storageService';
import {
  generateProjectId,
  createMetadata,
  serializeFilters,
  deserializeFilters,
  type SavedProject,
} from '@/lib/persistence';

// Import LineageGraph dynamically to avoid SSR issues with ReactFlow
const LineageGraph = dynamic(() => import('@/components/LineageGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
    </div>
  ),
});

export default function VisualizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    nodes,
    edges,
    projectName,
    generatedAt,
    searchQuery,
    setSearchQuery,
    exportWorkPlan,
    exportWorkPlanMarkdown,
    currentProjectId,
    savedProjectName,
    hasUnsavedChanges,
    setCurrentProjectId,
    setSavedProjectName,
    markSaved,
    loadSavedProject,
    resourceTypeFilters,
    tagFilters,
    tagFilterMode,
    inferredTagFilters,
    inferredTagFilterMode,
  } = useGraphStore();

  const [mounted, setMounted] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportContent, setExportContent] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('json');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const projectLoadedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load project from URL param
  useEffect(() => {
    if (!mounted || projectLoadedRef.current) return;

    const projectId = searchParams.get('project');
    if (projectId && nodes.length === 0) {
      projectLoadedRef.current = true;
      loadProject(projectId).then((project) => {
        if (project) {
          const filters = deserializeFilters(project.filters);
          loadSavedProject(
            project.nodes,
            project.edges,
            project.metadata.id,
            project.metadata.name,
            project.metadata.sourceProjectName,
            project.manifestInfo.generatedAt,
            filters
          );
        } else {
          // Project not found, redirect to home
          router.push('/');
        }
      });
    }
  }, [mounted, searchParams, nodes.length, loadSavedProject, router]);

  // Redirect to home if no data and no project param
  useEffect(() => {
    if (mounted && nodes.length === 0 && !searchParams.get('project')) {
      router.push('/');
    }
  }, [mounted, nodes.length, router, searchParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear save status after showing "Saved"
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleExportJSON = () => {
    const workPlan = exportWorkPlan();
    setExportContent(JSON.stringify(workPlan, null, 2));
    setExportFormat('json');
    setIsExportModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleExportMarkdown = () => {
    const markdown = exportWorkPlanMarkdown();
    setExportContent(markdown);
    setExportFormat('markdown');
    setIsExportModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleSaveClick = useCallback(() => {
    if (currentProjectId) {
      // Existing project - save directly
      doSave(savedProjectName);
    } else {
      // New project - show modal for name
      setIsSaveModalOpen(true);
    }
  }, [currentProjectId, savedProjectName]);

  const doSave = async (name: string) => {
    setIsSaving(true);
    setSaveStatus('saving');

    const id = currentProjectId || generateProjectId();
    const isNew = !currentProjectId;

    const project: SavedProject = {
      metadata: createMetadata(id, name, projectName, nodes, isNew),
      nodes,
      edges,
      filters: serializeFilters(
        resourceTypeFilters,
        tagFilters,
        tagFilterMode,
        inferredTagFilters,
        inferredTagFilterMode
      ),
      manifestInfo: {
        projectName,
        generatedAt,
      },
    };

    const success = await saveProject(project);

    if (success) {
      setCurrentProjectId(id);
      setSavedProjectName(name);
      markSaved();
      setSaveStatus('saved');

      // Update URL if this was a new save
      if (isNew) {
        router.replace(`/visualize?project=${id}`);
      }
    }

    setIsSaving(false);
    setIsSaveModalOpen(false);
  };

  // Count planned nodes for subtitle
  const plannedNodeCount = nodes.filter(n => n.data.isUserCreated).length;

  // Show loading while project is being loaded from URL param
  if (!mounted || (nodes.length === 0 && searchParams.get('project'))) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with search */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-slate-600 hover:text-slate-900 font-medium text-sm"
          >
            ← Back
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900">
                {savedProjectName || projectName}
              </h1>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs text-slate-500">Saved</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {savedProjectName ? projectName : 'dbt Project Lineage'}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>

          {/* Export Work Plan Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors font-medium text-sm flex items-center gap-2"
            >
              Export
              <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50">
                <button
                  onClick={handleExportMarkdown}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-500 w-8">MD</span>
                  <span className="text-slate-700">Issue</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-500 w-8">JSON</span>
                  <span className="text-slate-700">Repository</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Graph area - calculate height to account for header and filter bar */}
      <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(100vh - 4.5rem - 3.5rem)' }}>
        <LineageGraph />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        content={exportContent}
        format={exportFormat}
        title="Export Work Plan"
        subtitle={`${plannedNodeCount} planned node${plannedNodeCount !== 1 ? 's' : ''}`}
      />

      {/* Save Project Modal */}
      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={doSave}
        defaultName={savedProjectName || `${projectName} Planning`}
        isSaving={isSaving}
      />
    </div>
  );
}
