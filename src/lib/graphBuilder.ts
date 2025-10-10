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
  inferredTags?: string[];
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
 * Color scheme for inferred tags
 */
export const inferredTagColors: Record<string, string> = {
  int: '#8b5cf6',        // purple
  mart: '#ec4899',       // pink
  base: '#3b82f6',       // blue
  default: '#6b7280',    // gray
};

/**
 * Gets the color for a node based on its inferred tags (priority) or resource type
 */
export function getNodeColor(resourceType: string, inferredTags?: string[]): string {
  // If node has inferred tags, use the first one for color
  if (inferredTags && inferredTags.length > 0) {
    return inferredTagColors[inferredTags[0]] || inferredTagColors.default;
  }
  // Otherwise, use resource type color
  return nodeColors[resourceType] || nodeColors.default;
}

/**
 * Infer tags from model name based on prefix
 */
function inferTagsFromName(name: string): string[] {
  const lowerName = name.toLowerCase();
  if (lowerName.startsWith('int__')) {
    return ['int'];
  } else if (lowerName.startsWith('mart__')) {
    return ['mart'];
  } else {
    return ['base'];
  }
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
      inferredTags: inferTagsFromName(node.name),
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
    nodesep: 50,    // Horizontal spacing between nodes (dbt-docs: 50)
    ranksep: 200,   // Vertical spacing between ranks (dbt-docs: 200)
    edgesep: 30,    // Horizontal spacing between edges (dbt-docs: 30)
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
 * Finds all ancestor nodes (upstream dependencies) of a given node
 */
export function getAncestors(
  nodeId: string,
  edges: GraphEdge[],
  visited: Set<string> = new Set()
): Set<string> {
  if (visited.has(nodeId)) return visited;
  visited.add(nodeId);

  // Find all edges that point TO this node (sources)
  const parentEdges = edges.filter((edge) => edge.target === nodeId);

  parentEdges.forEach((edge) => {
    getAncestors(edge.source, edges, visited);
  });

  return visited;
}

/**
 * Finds all descendant nodes (downstream dependencies) of a given node
 */
export function getDescendants(
  nodeId: string,
  edges: GraphEdge[],
  visited: Set<string> = new Set()
): Set<string> {
  if (visited.has(nodeId)) return visited;
  visited.add(nodeId);

  // Find all edges that start FROM this node (targets)
  const childEdges = edges.filter((edge) => edge.source === nodeId);

  childEdges.forEach((edge) => {
    getDescendants(edge.target, edges, visited);
  });

  return visited;
}

/**
 * Filters nodes by search query, resource types, tags, and inferred tags
 */
export function filterNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  searchQuery: string,
  resourceTypeFilters?: Set<string>,
  tagFilters?: Set<string>,
  tagFilterMode?: 'AND' | 'OR',
  inferredTagFilters?: Set<string>,
  inferredTagFilterMode?: 'AND' | 'OR'
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

  // Filter by inferred tags - if no filters selected, show nothing; otherwise use OR logic
  if (inferredTagFilters) {
    if (inferredTagFilters.size === 0) {
      filteredNodes = [];
    } else {
      // OR: node must have at least one of the selected inferred tags
      filteredNodes = filteredNodes.filter((node) =>
        node.data.inferredTags?.some((tag) => inferredTagFilters.has(tag))
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
