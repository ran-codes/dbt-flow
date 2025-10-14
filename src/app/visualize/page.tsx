'use client';

import { useEffect, useState } from 'react';
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
  const { nodes, projectName, searchQuery, setSearchQuery, exportNodesData, getFilteredNodes } = useGraphStore();
  const [mounted, setMounted] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to home if no data
  useEffect(() => {
    if (mounted && nodes.length === 0) {
      router.push('/');
    }
  }, [mounted, nodes.length, router]);

  const handleExportClick = () => {
    // Get currently filtered nodes based on all active filters
    const filteredNodes = getFilteredNodes();
    const data = exportNodesData(filteredNodes);
    setExportData(data);
    setIsExportModalOpen(true);
  };

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
          {/* Export Data Button */}
          <button
            onClick={handleExportClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data
          </button>
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
        data={exportData}
      />
    </div>
  );
}
