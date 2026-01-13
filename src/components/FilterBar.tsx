'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useGraphStore } from '@/store/useGraphStore';
import { nodeColors, inferredTagColors, type GraphNode } from '@/lib/graphBuilder';

const RESOURCE_TYPES = [
  { type: 'model', label: 'Models', color: nodeColors.model },
  { type: 'source', label: 'Sources', color: nodeColors.source },
  { type: 'seed', label: 'Seeds', color: nodeColors.seed },
  { type: 'test', label: 'Tests', color: nodeColors.test },
];

interface FilterBarProps {
  nodeCount: number;
  edgeCount: number;
  zoomLevel: number;
  onAddNode: () => void;
  onOptimizeLayout: () => void;
  onShowFullGraph: () => void;
  showFullGraphButton: boolean;
}

type DropdownType = 'layer' | 'resource' | 'tags' | null;

export default function FilterBar({
  nodeCount,
  edgeCount,
  zoomLevel,
  onAddNode,
  onOptimizeLayout,
  onShowFullGraph,
  showFullGraphButton,
}: FilterBarProps) {
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

  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract all unique tags from nodes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node: GraphNode) => {
      node.data.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  // Extract all unique inferred tags from nodes, sorted semantically
  const allInferredTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node: GraphNode) => {
      node.data.inferredTags?.forEach((tag) => tagSet.add(tag));
    });

    // Semantic order for layer types (top to bottom = raw to mart)
    const layerOrder: Record<string, number> = {
      'raw': 1,
      'source': 2,
      'staging': 3,
      'stg': 3,
      'intermediate': 4,
      'int': 4,
      'mart': 5,
      'marts': 5,
    };

    const tags = Array.from(tagSet);
    const knownLayers = tags.filter(t => t.toLowerCase() in layerOrder);
    const otherLayers = tags.filter(t => !(t.toLowerCase() in layerOrder)).sort();

    // Sort known layers by semantic order
    knownLayers.sort((a, b) => {
      const orderA = layerOrder[a.toLowerCase()] ?? 999;
      const orderB = layerOrder[b.toLowerCase()] ?? 999;
      return orderA - orderB;
    });

    return { knownLayers, otherLayers };
  }, [nodes]);

  const toggleDropdown = (dropdown: DropdownType) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-20">
      <div className="px-4 py-2" ref={dropdownRef}>
        <div className="flex items-center justify-between">
          {/* Left Zone: Stats + Actions */}
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Nodes: <span className="font-semibold text-slate-900">{nodeCount}</span>
              </span>
              <span>
                Edges: <span className="font-semibold text-slate-900">{edgeCount}</span>
              </span>
              <span>
                Zoom: <span className="font-semibold text-slate-900">{zoomLevel}%</span>
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onAddNode}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                title="Add a new node"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
              <button
                onClick={onOptimizeLayout}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                title="Optimize layout"
              >
                Optimize
              </button>
              {showFullGraphButton && (
                <button
                  onClick={onShowFullGraph}
                  className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded transition-colors"
                  title="Show full graph"
                >
                  Reset View
                </button>
              )}
            </div>
          </div>

          {/* Right Zone: Filters + Legend */}
          <div className="flex items-center gap-4">
            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
            {/* Inferred Layer Dropdown */}
            {(allInferredTags.knownLayers.length > 0 || allInferredTags.otherLayers.length > 0) && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('layer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    inferredTagFilters.size > 0
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Layer</span>
                  {inferredTagFilters.size > 0 && (
                    <span className="bg-amber-600 text-white text-xs px-1.5 rounded-full">
                      {inferredTagFilters.size}
                    </span>
                  )}
                  <svg
                    className={`w-3 h-3 transition-transform ${openDropdown === 'layer' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>

                {openDropdown === 'layer' && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px] max-h-[200px] overflow-y-auto">
                    {/* Known layers in semantic order */}
                    {allInferredTags.knownLayers.map((tag) => {
                      const color = inferredTagColors[tag.toLowerCase()] || inferredTagColors.default;
                      return (
                        <label
                          key={tag}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={inferredTagFilters.has(tag)}
                            onChange={() => toggleInferredTag(tag)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-slate-700">{tag}</span>
                        </label>
                      );
                    })}
                    {/* Separator if both known and other layers exist */}
                    {allInferredTags.knownLayers.length > 0 && allInferredTags.otherLayers.length > 0 && (
                      <hr className="my-1 border-slate-200" />
                    )}
                    {/* Other layers alphabetically */}
                    {allInferredTags.otherLayers.map((tag) => {
                      const color = inferredTagColors[tag.toLowerCase()] || inferredTagColors.default;
                      return (
                        <label
                          key={tag}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={inferredTagFilters.has(tag)}
                            onChange={() => toggleInferredTag(tag)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-slate-700 italic">{tag}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Resource Type Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('resource')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  resourceTypeFilters.size > 0 && resourceTypeFilters.size < RESOURCE_TYPES.length
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Resource</span>
                {resourceTypeFilters.size > 0 && resourceTypeFilters.size < RESOURCE_TYPES.length && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 rounded-full">
                    {resourceTypeFilters.size}
                  </span>
                )}
                <svg
                  className={`w-3 h-3 transition-transform ${openDropdown === 'resource' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>

              {openDropdown === 'resource' && (
                <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]">
                  {RESOURCE_TYPES.map(({ type, label, color }) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={resourceTypeFilters.has(type)}
                        onChange={() => toggleResourceType(type)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Tags Dropdown */}
            {allTags.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('tags')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tagFilters.size > 0
                      ? 'bg-slate-700 text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Tags</span>
                  {tagFilters.size > 0 && (
                    <span className="bg-white text-slate-700 text-xs px-1.5 rounded-full">
                      {tagFilters.size}
                    </span>
                  )}
                  <svg
                    className={`w-3 h-3 transition-transform ${openDropdown === 'tags' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>

                {openDropdown === 'tags' && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] max-h-[200px] overflow-y-auto">
                    {/* AND/OR Toggle */}
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1 bg-slate-100 rounded p-0.5">
                        <button
                          onClick={() => setTagFilterMode('OR')}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            tagFilterMode === 'OR'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          OR
                        </button>
                        <button
                          onClick={() => setTagFilterMode('AND')}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            tagFilterMode === 'AND'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          AND
                        </button>
                      </div>
                    </div>
                    {allTags.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={tagFilters.has(tag)}
                          onChange={() => toggleTag(tag)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-700">{tag}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Layer Legend */}
          {inferredTagFilters.size > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {Array.from(inferredTagFilters).map((tag) => {
                const color = inferredTagColors[tag.toLowerCase()] || inferredTagColors.default;
                return (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-slate-700"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span>{tag}</span>
                  </span>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
