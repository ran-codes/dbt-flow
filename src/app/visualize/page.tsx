'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
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

function VisualizeContent() {
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
    isBlankProject,
    setCurrentProjectId,
    setSavedProjectName,
    setIsBlankProject,
    markSaved,
    loadSavedProject,
    startBlankProject,
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const projectLoadedRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load project from URL param or start blank project
  useEffect(() => {
    if (!mounted || projectLoadedRef.current) return;

    const projectId = searchParams.get('project');
    const isBlank = searchParams.get('blank') === 'true';

    if (isBlank && !isBlankProject) {
      projectLoadedRef.current = true;
      startBlankProject();
      // Clean up URL
      router.replace('/visualize');
    } else if (projectId && nodes.length === 0) {
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
  }, [mounted, searchParams, nodes.length, loadSavedProject, router, isBlankProject, startBlankProject]);

  // Redirect to home if no data, no project param, and not blank project
  useEffect(() => {
    if (mounted && nodes.length === 0 && !searchParams.get('project') && !searchParams.get('blank') && !isBlankProject) {
      router.push('/');
    }
  }, [mounted, nodes.length, router, searchParams, isBlankProject]);

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

  // Auto-save with 2s debounce (only for already-saved projects)
  useEffect(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Only auto-save if project was already saved and has unsaved changes
    if (hasUnsavedChanges && currentProjectId && savedProjectName && !isSaving) {
      autoSaveTimerRef.current = setTimeout(() => {
        doAutoSave();
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, currentProjectId, savedProjectName, nodes, edges, isSaving]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges && currentProjectId && savedProjectName) {
        // Synchronous save attempt - may not complete but worth trying
        const project: SavedProject = {
          metadata: createMetadata(currentProjectId, savedProjectName, projectName, nodes, false),
          nodes,
          edges,
          filters: serializeFilters(
            resourceTypeFilters,
            tagFilters,
            tagFilterMode,
            inferredTagFilters,
            inferredTagFilterMode
          ),
          manifestInfo: { projectName, generatedAt },
        };
        // Use navigator.sendBeacon for more reliable unload saves
        const blob = new Blob([JSON.stringify({ type: 'save', project })], { type: 'application/json' });
        // localForage doesn't support sendBeacon, so we just try a regular save
        saveProject(project);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, currentProjectId, savedProjectName, nodes, edges, projectName, generatedAt, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters, inferredTagFilterMode]);

  const doAutoSave = async () => {
    if (!currentProjectId || !savedProjectName || isSaving) return;

    setSaveStatus('saving');

    const project: SavedProject = {
      metadata: createMetadata(currentProjectId, savedProjectName, projectName, nodes, false),
      nodes,
      edges,
      filters: serializeFilters(
        resourceTypeFilters,
        tagFilters,
        tagFilterMode,
        inferredTagFilters,
        inferredTagFilterMode
      ),
      manifestInfo: { projectName, generatedAt },
    };

    const success = await saveProject(project);
    if (success) {
      markSaved();
      setSaveStatus('saved');
    } else {
      setSaveStatus('idle');
    }
  };

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

  const handleExportProject = () => {
    const project: SavedProject = {
      metadata: createMetadata(
        currentProjectId || generateProjectId(),
        savedProjectName || `${projectName} Planning`,
        projectName,
        nodes,
        !currentProjectId
      ),
      nodes,
      edges,
      filters: serializeFilters(
        resourceTypeFilters,
        tagFilters,
        tagFilterMode,
        inferredTagFilters,
        inferredTagFilterMode
      ),
      manifestInfo: { projectName, generatedAt },
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${savedProjectName || projectName}-project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleStartEditTitle = () => {
    setEditedTitle(savedProjectName || projectName);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSaveTitle = () => {
    const newTitle = editedTitle.trim();
    if (newTitle && newTitle !== (savedProjectName || projectName)) {
      setSavedProjectName(newTitle);
      // Mark as unsaved so it will auto-save
      if (currentProjectId) {
        // Trigger a save with the new name
        doSave(newTitle);
      }
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditTitle();
    }
  };

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
      setIsBlankProject(false); // No longer a blank project after saving
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
  if (!mounted || (nodes.length === 0 && searchParams.get('project') && !isBlankProject)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  // Don't render null for blank projects - they start with 0 nodes
  if (nodes.length === 0 && !isBlankProject) {
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
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={handleTitleKeyDown}
                  className="text-lg font-semibold text-slate-900 bg-transparent border-b-2 border-slate-900 outline-none px-0 py-0"
                  style={{ width: `${Math.max(editedTitle.length, 10)}ch` }}
                />
              ) : (
                <button
                  onClick={handleStartEditTitle}
                  className="text-lg font-semibold text-slate-900 hover:bg-slate-100 px-1 -mx-1 rounded transition-colors group flex items-center gap-1"
                >
                  {savedProjectName || projectName}
                  <svg className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
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
                <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">Work Plan</div>
                <button
                  onClick={handleExportMarkdown}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-500 w-8">MD</span>
                  <span className="text-slate-700">Markdown</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-500 w-8">JSON</span>
                  <span className="text-slate-700">JSON</span>
                </button>
                <div className="border-t border-slate-200 my-1" />
                <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">Project</div>
                <button
                  onClick={handleExportProject}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-500 w-8">FILE</span>
                  <span className="text-slate-700">Download as JSON</span>
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

export default function VisualizePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
        </div>
      }
    >
      <VisualizeContent />
    </Suspense>
  );
}
