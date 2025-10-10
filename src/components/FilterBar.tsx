'use client';

import { useState, useMemo } from 'react';
import { useGraphStore } from '@/store/useGraphStore';
import { nodeColors } from '@/lib/graphBuilder';

const RESOURCE_TYPES = [
  { type: 'model', label: 'Models', color: nodeColors.model },
  { type: 'source', label: 'Sources', color: nodeColors.source },
];

export default function FilterBar() {
  const {
    nodes,
    resourceTypeFilters,
    tagFilters,
    tagFilterMode,
    inferredTagFilters,
    toggleResourceType,
    toggleTag,
    setTagFilterMode,
    toggleInferredTag,
  } = useGraphStore();
  const [isResourceExpanded, setIsResourceExpanded] = useState(false);
  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const [isInferredTagExpanded, setIsInferredTagExpanded] = useState(false);

  // Extract all unique tags from nodes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node) => {
      node.data.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  // Extract all unique inferred tags from nodes
  const allInferredTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node) => {
      node.data.inferredTags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-300 shadow-lg z-20">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Resource Type Filter */}
            <button
              onClick={() => setIsResourceExpanded(!isResourceExpanded)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-semibold text-slate-700"
            >
              <span>Resource Type</span>
              <svg
                className={`w-4 h-4 transition-transform ${isResourceExpanded ? 'rotate-180' : ''}`}
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

            {isResourceExpanded && (
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

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <>
                <button
                  onClick={() => setIsTagExpanded(!isTagExpanded)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm font-semibold text-slate-700"
                >
                  <span>Tags</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isTagExpanded ? 'rotate-180' : ''}`}
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

                {isTagExpanded && (
                  <div className="flex items-center gap-3 max-w-2xl overflow-x-auto">
                    {/* AND/OR Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => setTagFilterMode('OR')}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          tagFilterMode === 'OR'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        OR
                      </button>
                      <button
                        onClick={() => setTagFilterMode('AND')}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          tagFilterMode === 'AND'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        AND
                      </button>
                    </div>

                    {allTags.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          checked={tagFilters.has(tag)}
                          onChange={() => toggleTag(tag)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{tag}</span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Inferred Tags Filter */}
            {allInferredTags.length > 0 && (
              <>
                <button
                  onClick={() => setIsInferredTagExpanded(!isInferredTagExpanded)}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors text-sm font-semibold text-amber-800"
                >
                  <span>Inferred Layer</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isInferredTagExpanded ? 'rotate-180' : ''}`}
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

                {isInferredTagExpanded && (
                  <div className="flex items-center gap-3 max-w-2xl overflow-x-auto">
                    {allInferredTags.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <input
                          type="checkbox"
                          checked={inferredTagFilters.has(tag)}
                          onChange={() => toggleInferredTag(tag)}
                          className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-sm text-amber-800 font-medium">{tag}</span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {!isResourceExpanded && !isTagExpanded && !isInferredTagExpanded && (
            <div className="flex items-center gap-4 text-xs text-slate-600">
              {/* Resource Type Pills */}
              <div className="flex items-center gap-2">
                <span>Resources:</span>
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

              {/* Tag Pills */}
              {tagFilters.size > 0 && (
                <div className="flex items-center gap-2">
                  <span>Tags:</span>
                  <div className="flex items-center gap-1">
                    {Array.from(tagFilters).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded bg-slate-500 text-white text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inferred Tag Pills */}
              {inferredTagFilters.size > 0 && (
                <div className="flex items-center gap-2">
                  <span>Inferred:</span>
                  <div className="flex items-center gap-1">
                    {Array.from(inferredTagFilters).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded bg-amber-500 text-white text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
