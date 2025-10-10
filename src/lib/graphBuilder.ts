import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import type { DbtNode } from './manifestParser';

export type GraphNode = Node<{
  label: string;
  type: string;
  description?: string;
  sql?: string;
  database?: string;
  schema?: string;
  tags?: string[];
}>;

export type GraphEdge = Edge;

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

/**
 * Color scheme for different node types
 */
export const nodeColors: Record<string, string> = {
  model: '#3b82f6',      // blue
  source: '#10b981',     // green
  test: '#f59e0b',       // amber
  seed: '#8b5cf6',       // purple
  snapshot: '#ec4899',   // pink
  exposure: '#06b6d4',   // cyan
  metric: '#f97316',     // orange
  default: '#6b7280',    // gray
};

/**
 * Gets the color for a node based on its resource type
 */
export function getNodeColor(resourceType: string): string {
  return nodeColors[resourceType] || nodeColors.default;
}

/**
 * Converts DBT nodes to React Flow nodes and edges
 */
export function buildGraph(dbtNodes: DbtNode[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Create a map for quick node lookup
  const nodeMap = new Map(dbtNodes.map(node => [node.unique_id, node]));

  // Build nodes
  const nodes: GraphNode[] = dbtNodes.map(node => ({
    id: node.unique_id,
    type: 'default',
    position: { x: 0, y: 0 }, // Will be set by layout algorithm
    data: {
      label: node.name,
      type: node.resource_type,
      description: node.description,
      sql: node.compiled_code || node.raw_code,
      database: node.database,
      schema: node.schema,
      tags: node.tags,
    },
    style: {
      padding: 0,
      border: 'none',
      background: 'transparent',
    },
  }));

  // Build edges
  const edges: GraphEdge[] = [];
  for (const node of dbtNodes) {
    if (node.depends_on?.nodes) {
      for (const dependencyId of node.depends_on.nodes) {
        // Only add edge if the dependency exists in our node map
        if (nodeMap.has(dependencyId)) {
          edges.push({
            id: `${dependencyId}-${node.unique_id}`,
            source: dependencyId,
            target: node.unique_id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#64748b', strokeWidth: 2 },
          });
        }
      }
    }
  }

  // Apply layout
  const layoutedElements = getLayoutedElements(nodes, edges);

  return {
    nodes: layoutedElements.nodes,
    edges,
  };
}

/**
 * Applies Dagre layout algorithm to position nodes hierarchically
 */
export function getLayoutedElements(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',  // Left to right
    nodesep: 80,    // Horizontal spacing between nodes
    ranksep: 150,   // Vertical spacing between ranks
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(g);

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Filters nodes by search query, resource types, and tags
 */
export function filterNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  searchQuery: string,
  resourceTypeFilters?: Set<string>,
  tagFilters?: Set<string>,
  tagFilterMode?: 'AND' | 'OR'
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  let filteredNodes = nodes;

  // Filter by resource type - if no filters selected, show nothing
  if (resourceTypeFilters) {
    if (resourceTypeFilters.size === 0) {
      filteredNodes = [];
    } else {
      filteredNodes = filteredNodes.filter((node) =>
        resourceTypeFilters.has(node.data.type)
      );
    }
  }

  // Filter by tags - if tags are selected, apply AND or OR logic
  if (tagFilters && tagFilters.size > 0) {
    if (tagFilterMode === 'AND') {
      // AND: node must have ALL selected tags
      filteredNodes = filteredNodes.filter((node) => {
        if (!node.data.tags) return false;
        return Array.from(tagFilters).every((tag) => node.data.tags?.includes(tag));
      });
    } else {
      // OR: node must have at least one of the selected tags
      filteredNodes = filteredNodes.filter((node) =>
        node.data.tags?.some((tag) => tagFilters.has(tag))
      );
    }
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredNodes = filteredNodes.filter(
      (node) =>
        node.data.label.toLowerCase().includes(query) ||
        node.data.description?.toLowerCase().includes(query) ||
        node.data.type.toLowerCase().includes(query)
    );
  }

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}
