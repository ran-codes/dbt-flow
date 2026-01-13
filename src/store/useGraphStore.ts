import { create } from 'zustand';
import { temporal } from 'zundo';
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

// Types for tracking modifications
export interface ModifiedNode {
  id: string;
  originalLabel: string;
  newLabel: string;
  originalDescription: string;
  newDescription: string;
  originalType: string;
  newType: string;
  originalTags: string[];
  newTags: string[];
  originalSql: string;
  newSql: string;
}

export interface DeletedNode {
  id: string;
  label: string;
  type: string;
}

export interface DeletedEdge {
  id: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
}

export interface ModificationsExport {
  modifiedNodes: ModifiedNode[];
  deletedNodes: DeletedNode[];
  deletedEdges: DeletedEdge[];
}

export interface WorkPlanExport {
  projectName: string;
  generatedAt: string;
  plannedNodes: PlannedNodeExport[];
  upstreamContext: UpstreamContextExport[];
  modifications: ModificationsExport;
}

export type GraphStore = {
  // Graph data
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Modification tracking
  deletedNodes: DeletedNode[];
  deletedEdges: DeletedEdge[];

  // Metadata
  projectName: string;
  generatedAt: string;

  // Project instance - changes on every project load for clean resets
  projectInstanceId: string;

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
  deleteNode: (nodeId: string) => { success: boolean; error?: string };
  deleteEdge: (edgeId: string) => void;
  canDeleteNode: (nodeId: string) => { canDelete: boolean; reason?: string };

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

export const useGraphStore = create<GraphStore>()(
  temporal(
    (set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  deletedNodes: [],
  deletedEdges: [],
  projectName: '',
  generatedAt: '',
  projectInstanceId: '',
  currentProjectId: null,
  savedProjectName: '',
  hasUnsavedChanges: false,
  isBlankProject: false,
  searchQuery: '',
  selectedNode: null,
  resourceTypeFilters: new Set(['model', 'seed', 'source']), // Default: show models, seeds, and sources
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

    // Full reset - clear all state and set new graph
    set({
      // New instance ID triggers component resets
      projectInstanceId: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nodes,
      edges,
      projectName: manifest.projectName,
      generatedAt: manifest.generatedAt,
      inferredTagFilters: inferredTagSet,
      // Reset modification tracking
      deletedNodes: [],
      deletedEdges: [],
      // Reset UI state
      selectedNode: null,
      searchQuery: '',
      editingNodeId: null,
      // Reset persistence state
      currentProjectId: null,
      savedProjectName: '',
      hasUnsavedChanges: false,
      isBlankProject: false,
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
      deletedNodes: [],
      deletedEdges: [],
      projectName: '',
      generatedAt: '',
      searchQuery: '',
      selectedNode: null,
      resourceTypeFilters: new Set(['model', 'seed', 'source']),
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
    const { nodes, edges, projectName, deletedNodes, deletedEdges } = state;

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

    // Build modifications export - find modified manifest nodes
    const modifiedNodes: ModifiedNode[] = nodes
      .filter((n) => n.data.isModified && n.data.originalData)
      .map((n) => ({
        id: n.id,
        originalLabel: n.data.originalData!.label,
        newLabel: n.data.label,
        originalDescription: n.data.originalData!.description,
        newDescription: n.data.description || '',
        originalType: n.data.originalData!.type,
        newType: n.data.type,
        originalTags: n.data.originalData!.tags || [],
        newTags: n.data.tags || [],
        originalSql: n.data.originalData!.sql || '',
        newSql: n.data.sql || '',
      }));

    return {
      projectName,
      generatedAt: new Date().toISOString(),
      plannedNodes: plannedNodesExport,
      upstreamContext: upstreamContextExport,
      modifications: {
        modifiedNodes,
        deletedNodes,
        deletedEdges,
      },
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
      lines.push('');
    }

    // Modifications Section
    const { modifiedNodes, deletedNodes, deletedEdges } = workPlan.modifications;
    const hasModifications = modifiedNodes.length > 0 || deletedNodes.length > 0 || deletedEdges.length > 0;

    if (hasModifications) {
      lines.push('---');
      lines.push('');
      lines.push('## Modifications to Existing Models');
      lines.push('');

      // Modified/Renamed Nodes - as actionable checklists
      if (modifiedNodes.length > 0) {
        lines.push('### Node Updates');
        lines.push('');
        modifiedNodes.forEach((mod) => {
          lines.push(`- [ ] **${mod.originalLabel}** — \`${mod.id}\``);

          // Rename task
          if (mod.originalLabel !== mod.newLabel) {
            lines.push(`  - [ ] Rename to \`${mod.newLabel}\``);
          }

          // Type change task
          if (mod.originalType !== mod.newType) {
            lines.push(`  - [ ] Change type from \`${mod.originalType}\` to \`${mod.newType}\``);
          }

          // Description update task
          if (mod.originalDescription !== mod.newDescription) {
            if (mod.newDescription) {
              lines.push(`  - [ ] Update description to: "${mod.newDescription.slice(0, 100)}${mod.newDescription.length > 100 ? '...' : ''}"`);
            } else {
              lines.push(`  - [ ] Remove description`);
            }
          }

          // Tags update task
          const tagsChanged = JSON.stringify([...mod.originalTags].sort()) !== JSON.stringify([...mod.newTags].sort());
          if (tagsChanged) {
            const addedTags = mod.newTags.filter((t) => !mod.originalTags.includes(t));
            const removedTags = mod.originalTags.filter((t) => !mod.newTags.includes(t));
            if (addedTags.length > 0) {
              lines.push(`  - [ ] Add tags: ${addedTags.map(t => `\`${t}\``).join(', ')}`);
            }
            if (removedTags.length > 0) {
              lines.push(`  - [ ] Remove tags: ${removedTags.map(t => `\`${t}\``).join(', ')}`);
            }
          }

          // SQL/Pseudo code update task
          if (mod.originalSql !== mod.newSql) {
            if (mod.newSql) {
              lines.push(`  - [ ] Update SQL/logic`);
            } else {
              lines.push(`  - [ ] Remove SQL/logic`);
            }
          }
        });
        lines.push('');
      }

      // Deleted Nodes - as actionable checklists
      if (deletedNodes.length > 0) {
        lines.push('### Nodes to Remove');
        lines.push('');
        deletedNodes.forEach((node) => {
          lines.push(`- [ ] **${node.label}** (${node.type})`);
          lines.push(`  - [ ] Delete the ${node.type} file`);
          lines.push(`  - [ ] Remove from schema.yml if present`);
          lines.push(`  - [ ] Update any downstream refs`);
        });
        lines.push('');
      }

      // Deleted Edges - as actionable checklists
      if (deletedEdges.length > 0) {
        lines.push('### Dependencies to Remove');
        lines.push('');
        deletedEdges.forEach((edge) => {
          lines.push(`- [ ] **${edge.targetLabel}** → remove dependency on \`${edge.sourceLabel}\``);
          lines.push(`  - [ ] Open \`${edge.targetLabel}\` model file`);
          lines.push(`  - [ ] Remove \`ref('${edge.sourceLabel}')\` or \`source()\` call`);
          lines.push(`  - [ ] Test the model compiles`);
        });
        lines.push('');
      }
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
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;

        // For manifest nodes (not user-created), track original values on first edit
        const isManifestNode = !node.data.isUserCreated;
        const needsOriginalTracking = isManifestNode && !node.data.originalData;

        return {
          ...node,
          data: {
            ...node.data,
            ...(metadata.label !== undefined && { label: metadata.label }),
            ...(metadata.description !== undefined && { description: metadata.description }),
            ...(metadata.type !== undefined && { type: metadata.type }),
            ...(metadata.tags !== undefined && { tags: metadata.tags }),
            ...(metadata.sql !== undefined && { sql: metadata.sql }),
            // Track original values for manifest nodes
            ...(needsOriginalTracking && {
              originalData: {
                label: node.data.label,
                description: node.data.description || '',
                type: node.data.type,
                tags: node.data.tags || [],
                sql: node.data.sql || '',
              },
            }),
            // Mark as modified if it's a manifest node
            ...(isManifestNode && { isModified: true }),
          },
        };
      }),
      hasUnsavedChanges: true,
    })),

  canDeleteNode: (nodeId) => {
    const state = get();
    // Check if node has any downstream dependencies (outgoing edges)
    const hasDownstream = state.edges.some((edge) => edge.source === nodeId);
    if (hasDownstream) {
      return { canDelete: false, reason: 'Cannot delete: this node has downstream dependencies' };
    }
    return { canDelete: true };
  },

  deleteNode: (nodeId) => {
    const state = get();
    const { canDelete, reason } = state.canDeleteNode(nodeId);

    if (!canDelete) {
      return { success: false, error: reason };
    }

    const nodeToDelete = state.nodes.find((n) => n.id === nodeId);
    if (!nodeToDelete) {
      return { success: false, error: 'Node not found' };
    }

    // Track the deletion if it's a manifest node
    const isManifestNode = !nodeToDelete.data.isUserCreated;

    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      deletedNodes: isManifestNode
        ? [...s.deletedNodes, { id: nodeId, label: nodeToDelete.data.label, type: nodeToDelete.data.type }]
        : s.deletedNodes,
      hasUnsavedChanges: true,
      selectedNode: s.selectedNode?.id === nodeId ? null : s.selectedNode,
    }));

    return { success: true };
  },

  deleteEdge: (edgeId) => {
    const state = get();
    const edgeToDelete = state.edges.find((e) => e.id === edgeId);

    if (!edgeToDelete) return;

    // Get node labels for tracking
    const sourceNode = state.nodes.find((n) => n.id === edgeToDelete.source);
    const targetNode = state.nodes.find((n) => n.id === edgeToDelete.target);

    // Only track deletion if this involves at least one manifest node
    const involvesManifestNode =
      (sourceNode && !sourceNode.data.isUserCreated) ||
      (targetNode && !targetNode.data.isUserCreated);

    set((s) => ({
      edges: s.edges.filter((e) => e.id !== edgeId),
      deletedEdges: involvesManifestNode
        ? [
            ...s.deletedEdges,
            {
              id: edgeId,
              sourceId: edgeToDelete.source,
              sourceLabel: sourceNode?.data.label || edgeToDelete.source,
              targetId: edgeToDelete.target,
              targetLabel: targetNode?.data.label || edgeToDelete.target,
            },
          ]
        : s.deletedEdges,
      hasUnsavedChanges: true,
    }));
  },

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
      // New instance ID triggers component resets
      projectInstanceId: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nodes: [],
      edges: [],
      deletedNodes: [],
      deletedEdges: [],
      projectName: 'Untitled Project',
      generatedAt: new Date().toISOString(),
      currentProjectId: null,
      savedProjectName: '',
      hasUnsavedChanges: false,
      isBlankProject: true,
      searchQuery: '',
      selectedNode: null,
      resourceTypeFilters: new Set(['model', 'seed', 'source']),
      tagFilters: new Set(),
      tagFilterMode: 'OR',
      inferredTagFilters: new Set(),
      inferredTagFilterMode: 'OR',
      editingNodeId: null,
    }),

  loadSavedProject: (nodes, edges, projectId, projectName, sourceProjectName, generatedAt, filters) =>
    set({
      // New instance ID triggers component resets
      projectInstanceId: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nodes,
      edges,
      currentProjectId: projectId,
      savedProjectName: projectName,
      projectName: sourceProjectName,
      generatedAt,
      hasUnsavedChanges: false,
      // Reset modification tracking (don't carry over from previous project)
      deletedNodes: [],
      deletedEdges: [],
      // Reset UI state
      selectedNode: null,
      searchQuery: '',
      editingNodeId: null,
      isBlankProject: false,
      // Apply saved filters
      resourceTypeFilters: filters.resourceTypeFilters,
      tagFilters: filters.tagFilters,
      tagFilterMode: filters.tagFilterMode,
      inferredTagFilters: filters.inferredTagFilters,
      inferredTagFilterMode: filters.inferredTagFilterMode,
    }),
}),
    {
      // Temporal options
      limit: 50, // Maximum history length
      // Only track state relevant to graph editing, not UI state
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        deletedNodes: state.deletedNodes,
        deletedEdges: state.deletedEdges,
      }),
    }
  )
);
