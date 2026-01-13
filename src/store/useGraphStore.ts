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

export interface PlannedNodeExport {
  id: string;
  name: string;
  type: string;
  description: string;
  tags: string[];
  pseudoCode: string;
  dependsOn: string[];
}

export interface UpstreamContextExport {
  id: string;
  name: string;
  type: string;
  description: string;
  inferredLayer: string | null;
}

export interface WorkPlanExport {
  projectName: string;
  generatedAt: string;
  plannedNodes: PlannedNodeExport[];
  upstreamContext: UpstreamContextExport[];
}

export type GraphStore = {
  // Graph data
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Metadata
  projectName: string;
  generatedAt: string;

  // Persistence state
  currentProjectId: string | null;
  savedProjectName: string;
  hasUnsavedChanges: boolean;
  isBlankProject: boolean;

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
  exportWorkPlan: () => WorkPlanExport;
  exportWorkPlanMarkdown: () => string;

  // Node editing actions
  setEditingNodeId: (nodeId: string | null) => void;
  addDownstreamNode: (parentNodeId: string, position: { x: number; y: number }) => string;
  addStandaloneNode: (position: { x: number; y: number }) => string;
  addEdge: (sourceId: string, targetId: string) => void;
  updateNodeLabel: (nodeId: string, newLabel: string) => void;
  updateNodeMetadata: (nodeId: string, metadata: {
    label?: string;
    description?: string;
    type?: string;
    tags?: string[];
    sql?: string;
  }) => void;

  // Persistence actions
  setCurrentProjectId: (id: string | null) => void;
  setSavedProjectName: (name: string) => void;
  setIsBlankProject: (isBlank: boolean) => void;
  markSaved: () => void;
  markUnsaved: () => void;
  startBlankProject: () => void;
  loadSavedProject: (
    nodes: GraphNode[],
    edges: GraphEdge[],
    projectId: string,
    projectName: string,
    sourceProjectName: string,
    generatedAt: string,
    filters: {
      resourceTypeFilters: Set<string>;
      tagFilters: Set<string>;
      tagFilterMode: 'AND' | 'OR';
      inferredTagFilters: Set<string>;
      inferredTagFilterMode: 'AND' | 'OR';
    }
  ) => void;
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  projectName: '',
  generatedAt: '',
  currentProjectId: null,
  savedProjectName: '',
  hasUnsavedChanges: false,
  isBlankProject: false,
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

  exportWorkPlan: () => {
    const state = get();
    const { nodes, edges, projectName } = state;

    // Get planned nodes (user-created)
    const plannedNodes = nodes.filter((n) => n.data.isUserCreated);

    // Get upstream dependencies for planned nodes
    const plannedNodeIds = new Set(plannedNodes.map((n) => n.id));
    const upstreamIds = new Set<string>();

    edges.forEach((edge) => {
      if (plannedNodeIds.has(edge.target) && !plannedNodeIds.has(edge.source)) {
        upstreamIds.add(edge.source);
      }
    });

    const upstreamNodes = nodes.filter((n) => upstreamIds.has(n.id));

    // Build planned nodes export
    const plannedNodesExport: PlannedNodeExport[] = plannedNodes.map((node) => {
      const dependsOn = edges
        .filter((e) => e.target === node.id)
        .map((e) => e.source);

      return {
        id: node.id,
        name: node.data.label,
        type: node.data.type,
        description: node.data.description || '',
        tags: node.data.tags || [],
        pseudoCode: node.data.sql || '',
        dependsOn,
      };
    });

    // Build upstream context export
    const upstreamContextExport: UpstreamContextExport[] = upstreamNodes.map((node) => ({
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      description: node.data.description || '',
      inferredLayer: node.data.inferredTags?.[0] || null,
    }));

    return {
      projectName,
      generatedAt: new Date().toISOString(),
      plannedNodes: plannedNodesExport,
      upstreamContext: upstreamContextExport,
    };
  },

  exportWorkPlanMarkdown: () => {
    const state = get();
    const workPlan = state.exportWorkPlan();

    const lines: string[] = [];

    // Header
    lines.push(`# Work Plan: ${workPlan.projectName || 'Untitled Project'}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push(`- **${workPlan.plannedNodes.length}** planned model(s) to build`);
    lines.push(`- Depends on **${workPlan.upstreamContext.length}** existing model(s)`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Planned Work
    lines.push('## Planned Work');
    lines.push('');

    workPlan.plannedNodes.forEach((node, index) => {
      lines.push(`### ${index + 1}. ${node.name}`);
      lines.push(`**ID:** \`${node.id}\``);
      lines.push(`**Type:** ${node.type}`);
      if (node.tags.length > 0) {
        lines.push(`**Tags:** ${node.tags.join(', ')}`);
      }
      if (node.dependsOn.length > 0) {
        const depRefs = node.dependsOn.map((id) => {
          // Check both planned nodes and upstream context for the name
          const planned = workPlan.plannedNodes.find((p) => p.id === id);
          if (planned) return `${planned.name} (\`${id}\`)`;
          const upstream = workPlan.upstreamContext.find((u) => u.id === id);
          if (upstream) return `${upstream.name} (\`${id}\`)`;
          return `\`${id}\``;
        });
        lines.push(`**Depends on:** ${depRefs.join(', ')}`);
      }
      lines.push('');
      if (node.description) {
        lines.push('**Description:**');
        lines.push(node.description);
        lines.push('');
      }
      if (node.pseudoCode) {
        lines.push('**Pseudo Code:**');
        lines.push('```');
        lines.push(node.pseudoCode);
        lines.push('```');
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    });

    // Upstream Dependencies
    if (workPlan.upstreamContext.length > 0) {
      lines.push('## Reference: Upstream Dependencies');
      lines.push('');
      lines.push('| Model | Type | Layer | Description |');
      lines.push('|-------|------|-------|-------------|');
      workPlan.upstreamContext.forEach((node) => {
        const desc = node.description ? node.description.slice(0, 50) + (node.description.length > 50 ? '...' : '') : '-';
        lines.push(`| ${node.name} | ${node.type} | ${node.inferredLayer || '-'} | ${desc} |`);
      });
    }

    return lines.join('\n');
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
      hasUnsavedChanges: true,
    }));

    return newNodeId;
  },

  addStandaloneNode: (position) => {
    const newNodeId = `planned-${Date.now()}`;

    const newNode: GraphNode = {
      id: newNodeId,
      type: 'default',
      position,
      data: {
        label: 'New Node',
        type: 'model',
        tags: [],
        description: '',
        isUserCreated: true,
        sql: '',
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      editingNodeId: newNodeId, // Immediately enter edit mode
      hasUnsavedChanges: true,
    }));

    return newNodeId;
  },

  addEdge: (sourceId, targetId) => {
    const edgeId = `${sourceId}-${targetId}`;
    const newEdge: GraphEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
      style: { stroke: '#64748b', strokeWidth: 2 },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
      hasUnsavedChanges: true,
    }));
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
                ...(metadata.sql !== undefined && { sql: metadata.sql }),
              },
            }
          : node
      ),
      hasUnsavedChanges: true,
    })),

  // Persistence actions
  setCurrentProjectId: (id) =>
    set({ currentProjectId: id }),

  setSavedProjectName: (name) =>
    set({ savedProjectName: name }),

  setIsBlankProject: (isBlank) =>
    set({ isBlankProject: isBlank }),

  markSaved: () =>
    set({ hasUnsavedChanges: false }),

  markUnsaved: () =>
    set({ hasUnsavedChanges: true }),

  startBlankProject: () =>
    set({
      nodes: [],
      edges: [],
      projectName: 'Untitled Project',
      generatedAt: new Date().toISOString(),
      currentProjectId: null,
      savedProjectName: '',
      hasUnsavedChanges: false,
      isBlankProject: true,
      searchQuery: '',
      selectedNode: null,
      resourceTypeFilters: new Set(['model', 'seed']),
      tagFilters: new Set(),
      tagFilterMode: 'OR',
      inferredTagFilters: new Set(),
      inferredTagFilterMode: 'OR',
      editingNodeId: null,
    }),

  loadSavedProject: (nodes, edges, projectId, projectName, sourceProjectName, generatedAt, filters) =>
    set({
      nodes,
      edges,
      currentProjectId: projectId,
      savedProjectName: projectName,
      projectName: sourceProjectName,
      generatedAt,
      hasUnsavedChanges: false,
      resourceTypeFilters: filters.resourceTypeFilters,
      tagFilters: filters.tagFilters,
      tagFilterMode: filters.tagFilterMode,
      inferredTagFilters: filters.inferredTagFilters,
      inferredTagFilterMode: filters.inferredTagFilterMode,
    }),
}));
