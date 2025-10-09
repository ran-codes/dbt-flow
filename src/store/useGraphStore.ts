import { create } from 'zustand';
import type { GraphNode, GraphEdge } from '@/lib/graphBuilder';
import type { ParsedManifest } from '@/lib/manifestParser';

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

  // Actions
  setGraph: (nodes: GraphNode[], edges: GraphEdge[], manifest: ParsedManifest) => void;
  setSearchQuery: (query: string) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  clearGraph: () => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
  // Initial state
  nodes: [],
  edges: [],
  projectName: '',
  generatedAt: '',
  searchQuery: '',
  selectedNode: null,

  // Actions
  setGraph: (nodes, edges, manifest) =>
    set({
      nodes,
      edges,
      projectName: manifest.projectName,
      generatedAt: manifest.generatedAt,
    }),

  setSearchQuery: (query) =>
    set({
      searchQuery: query,
    }),

  setSelectedNode: (node) =>
    set({
      selectedNode: node,
    }),

  clearGraph: () =>
    set({
      nodes: [],
      edges: [],
      projectName: '',
      generatedAt: '',
      searchQuery: '',
      selectedNode: null,
    }),
}));
