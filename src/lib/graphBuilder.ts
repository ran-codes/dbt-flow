import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
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
  isUserCreated?: boolean;
  materialized?: boolean;
}>;

export type GraphEdge = Edge;

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80; // Increased height to add padding around nodes for edge clearance

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
 * Color scheme for inferred tags (data layers)
 */
export const inferredTagColors: Record<string, string> = {
  raw: '#f59e0b',              // amber - raw seed data
  staging: '#10b981',          // green - staging transformations
  base: '#3b82f6',             // blue - base layer with date patterns
  intermediate: '#8b5cf6',     // purple - intermediate transformations
  core: '#a855f7',             // purple-500 - core business logic
  'mart-internal': '#ec4899',  // pink - internal marts
  'mart-public': '#f43f5e',    // rose-500 - public marts
  mart: '#ec4899',             // pink - general marts
  default: '#6b7280',          // gray - fallback
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
 * Infer tags from model name based on common dbt naming conventions
 * Supports multiple naming patterns:
 * - Base layer: base__, stage__, or contains 8 consecutive digits (########)
 * - Staging layer: stg_, staging_, raw_
 * - Intermediate layer: int_, int__, intermediate_
 * - Core layer: core__
 * - Mart layers: internal__, public__, mart_, mart__, fct_, dim_
 * - Default: mart (everything else)
 */
function inferTagsFromName(name: string): string[] {
  const lowerName = name.toLowerCase();

  // Base layer - has base__, stage__ prefix, or contains 8 consecutive digits
  const hasEightDigits = /\d{8}/.test(name);
  if (lowerName.startsWith('base__') ||
      lowerName.startsWith('stage__') ||
      hasEightDigits) {
    return ['base'];
  }

  // Raw layer (seeds, raw data sources)
  if (lowerName.startsWith('raw_')) {
    return ['raw'];
  }

  // Staging layer (initial transformations from raw)
  if (lowerName.startsWith('stg_') ||
      lowerName.startsWith('staging_')) {
    return ['staging'];
  }

  // Intermediate layer (business logic transformations)
  if (lowerName.startsWith('int_') ||
      lowerName.startsWith('int__') ||
      lowerName.startsWith('intermediate_')) {
    return ['intermediate'];
  }

  // Core layer (core business logic)
  if (lowerName.startsWith('core__')) {
    return ['core'];
  }

  // Mart layer - Internal (internal consumption)
  if (lowerName.startsWith('internal__')) {
    return ['mart-internal'];
  }

  // Mart layer - Public (external consumption)
  if (lowerName.startsWith('public__')) {
    return ['mart-public'];
  }

  // Mart layer - General marts
  if (lowerName.startsWith('mart_') ||
      lowerName.startsWith('mart__') ||
      lowerName.startsWith('fct_') ||
      lowerName.startsWith('dim_')) {
    return ['mart'];
  }

  // Default: Everything else is mart
  return ['mart'];
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
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b',
            },
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
 * Find all disconnected components in the graph
 */
function findConnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphNode[][] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const adjacencyMap = new Map<string, Set<string>>();

  // Build adjacency map (undirected for component detection)
  nodeIds.forEach(id => adjacencyMap.set(id, new Set()));
  edges.forEach(edge => {
    adjacencyMap.get(edge.source)?.add(edge.target);
    adjacencyMap.get(edge.target)?.add(edge.source);
  });

  const visited = new Set<string>();
  const components: GraphNode[][] = [];

  // DFS to find components
  function dfs(nodeId: string, component: Set<string>) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    component.add(nodeId);

    adjacencyMap.get(nodeId)?.forEach(neighbor => {
      dfs(neighbor, component);
    });
  }

  // Find all components
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = new Set<string>();
      dfs(node.id, component);
      components.push(nodes.filter(n => component.has(n.id)));
    }
  });

  return components;
}

/**
 * Applies Dagre layout algorithm to position nodes hierarchically
 * Handles disconnected components by laying them out separately with spacing
 */
export function getLayoutedElements(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges };
  }

  // Find disconnected components
  const components = findConnectedComponents(nodes, edges);

  // Layout each component separately
  let currentYOffset = 0;
  const COMPONENT_VERTICAL_SPACING = 50; // Space between disconnected components

  const allLayoutedNodes: GraphNode[] = [];

  components.forEach((componentNodes) => {
    const componentNodeIds = new Set(componentNodes.map(n => n.id));
    const componentEdges = edges.filter(
      e => componentNodeIds.has(e.source) && componentNodeIds.has(e.target)
    );

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: 'LR',  // Left to right
      nodesep: 40,    // Vertical spacing between nodes
      ranksep: 150,   // Horizontal spacing between ranks
      edgesep: 10,    // Spacing between edges
      marginx: 50,
      marginy: 50,
      ranker: 'network-simplex',
    });

    // Add nodes to graph
    componentNodes.forEach((node) => {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Add edges to graph
    componentEdges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Apply positions to nodes with Y offset for this component
    const layoutedComponentNodes = componentNodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2 + currentYOffset,
        },
      };
    });

    allLayoutedNodes.push(...layoutedComponentNodes);

    // Calculate height of this component for next offset
    const componentHeight = Math.max(...layoutedComponentNodes.map(n => n.position.y + NODE_HEIGHT));
    currentYOffset = componentHeight + COMPONENT_VERTICAL_SPACING;
  });

  return {
    nodes: allLayoutedNodes,
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
  // User-created nodes bypass this filter (they have no inferred layer)
  if (inferredTagFilters) {
    if (inferredTagFilters.size === 0) {
      filteredNodes = filteredNodes.filter((node) => node.data.isUserCreated);
    } else {
      filteredNodes = filteredNodes.filter((node) =>
        node.data.isUserCreated || node.data.inferredTags?.some((tag) => inferredTagFilters.has(tag))
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
