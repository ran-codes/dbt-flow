import { create } from 'zustand';
import { MarkerType } from 'reactflow';
import type { GraphNode, GraphEdge } from '@/lib/graphBuilder';
import type { ParsedManifest } from '@/lib/manifestParser';
import { filterNodes } from '@/lib/graphBuilder';

export interface ExportedNode {
  id: string;
  name: string;
  type: string;
  inferredLayer: string | null;
  database?: string;
  schema?: string;
  description?: string;
  tags: string[];
}

export type GraphStore = {
  // Graph data
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Metadata
  projectName: string;
  generatedAt: string;

  // UI state
  searchQuery: string;
  selectedNode: GraphNode | null;
  resourceTypeFilters: Set<string>;
  tagFilters: Set<string>;
  tagFilterMode: 'AND' | 'OR';
  inferredTagFilters: Set<string>;
  inferredTagFilterMode: 'AND' | 'OR';
  editingNodeId: string | null;

  // Actions
  setGraph: (nodes: GraphNode[], edges: GraphEdge[], manifest: ParsedManifest) => void;
  setSearchQuery: (query: string) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setResourceTypeFilters: (filters: Set<string>) => void;
  toggleResourceType: (type: string) => void;
  setTagFilters: (filters: Set<string>) => void;
  toggleTag: (tag: string) => void;
  setTagFilterMode: (mode: 'AND' | 'OR') => void;
  setInferredTagFilters: (filters: Set<string>) => void;
  toggleInferredTag: (tag: string) => void;
  setInferredTagFilterMode: (mode: 'AND' | 'OR') => void;
  clearGraph: () => void;
  exportNodesData: (nodesToExport?: GraphNode[]) => ExportedNode[];
  getFilteredNodes: () => GraphNode[];

  // Node editing actions
  setEditingNodeId: (nodeId: string | null) => void;
  addDownstreamNode: (parentNodeId: string, position: { x: number; y: number }) => string;
  updateNodeLabel: (nodeId: string, newLabel: string) => void;
  updateNodeMetadata: (nodeId: string, metadata: {
    label?: string;
    description?: string;
    type?: string;
    tags?: string[];
  }) => void;
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  projectName: '',
  generatedAt: '',
  searchQuery: '',
  selectedNode: null,
  resourceTypeFilters: new Set(['model', 'seed']), // Default: show models and seeds
  tagFilters: new Set(), // Default: no tag filters
  tagFilterMode: 'OR', // Default: OR logic
  inferredTagFilters: new Set(), // Default: no inferred tag filters
  inferredTagFilterMode: 'OR', // Default: OR logic
  editingNodeId: null, // No node being edited initially

  // Actions
  setGraph: (nodes, edges, manifest) => {
    // Extract all unique inferred tags from nodes, including 'base'
    const inferredTagSet = new Set<string>();
    nodes.forEach((node) => {
      node.data.inferredTags?.forEach((tag) => {
        inferredTagSet.add(tag);
      });
    });

    set({
      nodes,
      edges,
      projectName: manifest.projectName,
      generatedAt: manifest.generatedAt,
      inferredTagFilters: inferredTagSet, // Initialize with all inferred tags including 'base'
    });
  },

  setSearchQuery: (query) =>
    set({
      searchQuery: query,
    }),

  setSelectedNode: (node) =>
    set({
      selectedNode: node,
    }),

  setResourceTypeFilters: (filters) =>
    set({
      resourceTypeFilters: filters,
    }),

  toggleResourceType: (type) =>
    set((state) => {
      const newFilters = new Set(state.resourceTypeFilters);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return { resourceTypeFilters: newFilters };
    }),

  setTagFilters: (filters) =>
    set({
      tagFilters: filters,
    }),

  toggleTag: (tag) =>
    set((state) => {
      const newFilters = new Set(state.tagFilters);
      if (newFilters.has(tag)) {
        newFilters.delete(tag);
      } else {
        newFilters.add(tag);
      }
      return { tagFilters: newFilters };
    }),

  setTagFilterMode: (mode) =>
    set({
      tagFilterMode: mode,
    }),

  setInferredTagFilters: (filters) =>
    set({
      inferredTagFilters: filters,
    }),

  toggleInferredTag: (tag) =>
    set((state) => {
      const newFilters = new Set(state.inferredTagFilters);
      if (newFilters.has(tag)) {
        newFilters.delete(tag);
      } else {
        newFilters.add(tag);
      }
      return { inferredTagFilters: newFilters };
    }),

  setInferredTagFilterMode: (mode) =>
    set({
      inferredTagFilterMode: mode,
    }),

  clearGraph: () =>
    set({
      nodes: [],
      edges: [],
      projectName: '',
      generatedAt: '',
      searchQuery: '',
      selectedNode: null,
      resourceTypeFilters: new Set(['model', 'seed']),
      tagFilters: new Set(),
      tagFilterMode: 'OR',
      inferredTagFilters: new Set(),
      inferredTagFilterMode: 'OR',
    }),

  exportNodesData: (nodesToExport) => {
    const state = get();
    const nodes = nodesToExport || state.nodes;
    return nodes.map((node) => ({
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      inferredLayer: node.data.inferredTags?.[0] || null,
      database: node.data.database,
      schema: node.data.schema,
      description: node.data.description,
      tags: node.data.tags || [],
    }));
  },

  getFilteredNodes: () => {
    const state = get();
    const { nodes, edges, searchQuery, resourceTypeFilters, tagFilters, tagFilterMode, inferredTagFilters } = state;
    const filtered = filterNodes(
      nodes,
      edges,
      searchQuery,
      resourceTypeFilters,
      tagFilters,
      tagFilterMode,
      inferredTagFilters,
      'OR'
    );
    return filtered.nodes;
  },

  // Node editing actions
  setEditingNodeId: (nodeId) =>
    set({
      editingNodeId: nodeId,
    }),

  addDownstreamNode: (parentNodeId, position) => {
    const newNodeId = `user-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newNode: GraphNode = {
      id: newNodeId,
      type: 'default',
      position,
      data: {
        label: 'Untitled',
        type: 'model',
        isUserCreated: true,
        materialized: false,
        tags: ['planned'],
      },
      style: {
        padding: 0,
        border: 'none',
        background: 'transparent',
      },
    };

    const newEdge: GraphEdge = {
      id: `${parentNodeId}-${newNodeId}`,
      source: parentNodeId,
      target: newNodeId,
      type: 'smoothstep',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
      style: { stroke: '#64748b', strokeWidth: 2 },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: [...state.edges, newEdge],
      editingNodeId: newNodeId, // Immediately enter edit mode
    }));

    return newNodeId;
  },

  updateNodeLabel: (nodeId, newLabel) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newLabel } }
          : node
      ),
    })),

  updateNodeMetadata: (nodeId, metadata) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...(metadata.label !== undefined && { label: metadata.label }),
                ...(metadata.description !== undefined && { description: metadata.description }),
                ...(metadata.type !== undefined && { type: metadata.type }),
                ...(metadata.tags !== undefined && { tags: metadata.tags }),
              },
            }
          : node
      ),
    })),
}));
