'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/useGraphStore';
import ExportModal from '@/components/ExportModal';

// Import LineageGraph dynamically to avoid SSR issues with ReactFlow
const LineageGraph = dynamic(() => import('@/components/LineageGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

export default function VisualizePage() {
  const router = useRouter();
  const { nodes, projectName, searchQuery, setSearchQuery, exportWorkPlan, exportWorkPlanMarkdown } = useGraphStore();
  const [mounted, setMounted] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportContent, setExportContent] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('json');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to home if no data
  useEffect(() => {
    if (mounted && nodes.length === 0) {
      router.push('/');
    }
  }, [mounted, nodes.length, router]);

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

  // Count planned nodes for subtitle
  const plannedNodeCount = nodes.filter(n => n.data.isUserCreated).length;

  if (!mounted || nodes.length === 0) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with search */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            ← Back
          </button>
          <div className="h-6 w-px bg-slate-300"></div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{projectName}</h1>
            <p className="text-xs text-slate-500">dbt Project Lineage</p>
          </div>
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Export Work Plan Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Work Plan
              <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-3"
                >
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">JSON</span>
                  <span className="text-slate-700">For LLM Agents</span>
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-3"
                >
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">MD</span>
                  <span className="text-slate-700">Work Order Document</span>
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
    </div>
  );
}
