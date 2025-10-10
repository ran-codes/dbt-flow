'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/useGraphStore';

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
  const { nodes, projectName, searchQuery, setSearchQuery } = useGraphStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to home if no data
  useEffect(() => {
    if (mounted && nodes.length === 0) {
      router.push('/');
    }
  }, [mounted, nodes.length, router]);

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
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
              <span className="text-slate-600">Model</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
              <span className="text-slate-600">Source</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
              <span className="text-slate-600">Test</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
              <span className="text-slate-600">Seed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Graph area - calculate height to account for header and filter bar */}
      <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(100vh - 4.5rem - 3.5rem)' }}>
        <LineageGraph />
      </div>
    </div>
  );
}
