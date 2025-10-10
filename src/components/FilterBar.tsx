'use client';

import { useState } from 'react';
import { useGraphStore } from '@/store/useGraphStore';
import { nodeColors } from '@/lib/graphBuilder';

const RESOURCE_TYPES = [
  { type: 'model', label: 'Models', color: nodeColors.model },
  { type: 'source', label: 'Sources', color: nodeColors.source },
];

export default function FilterBar() {
  const { resourceTypeFilters, toggleResourceType } = useGraphStore();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 shadow-lg z-20">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-semibold text-slate-700"
            >
              <span>Resource Type</span>
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isExpanded && (
              <div className="flex items-center gap-3">
                {RESOURCE_TYPES.map(({ type, label, color }) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={resourceTypeFilters.has(type)}
                      onChange={() => toggleResourceType(type)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {!isExpanded && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Showing:</span>
              <div className="flex items-center gap-1">
                {Array.from(resourceTypeFilters).map((type) => {
                  const resource = RESOURCE_TYPES.find((r) => r.type === type);
                  if (!resource) return null;
                  return (
                    <span
                      key={type}
                      className="px-2 py-1 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: resource.color }}
                    >
                      {resource.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
