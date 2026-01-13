import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import { MarkerType, getIncomers, getOutgoers } from 'reactflow';
import type { DbtNode, DbtNodeMeta, DbtNodeMetaToPropagate, PropagatedMetadataEntry } from './manifestParser';

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
  rawManifest?: Record<string, unknown>;
  meta?: DbtNodeMeta;
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
  source: '#10b981',           // green - source data
  raw: '#f59e0b',              // amber - raw seed data
  staging: '#22c55e',          // green-500 - staging transformations
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
 * - Source layer: source__
 * - Base layer: base__, stage__, or contains 8 consecutive digits (########)
 * - Staging layer: stg_, staging_, raw_
 * - Intermediate layer: int_, int__, intermediate_
 * - Core layer: core__
 * - Mart layers: internal__, public__, mart_, mart__, fct_, dim_
 * - Default: mart (everything else)
 */
function inferTagsFromName(name: string): string[] {
  const lowerName = name.toLowerCase();

  // Source layer - raw source data
  if (lowerName.startsWith('source__')) {
    return ['source'];
  }

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
      rawManifest: node as unknown as Record<string, unknown>, // Store full manifest node for debugging
      meta: node.meta, // Pass through metadata for inheritance
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
 * Uses React Flow's getIncomers() utility for direct parents, then traverses recursively
 */
export function getAncestors(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): Set<string> {
  const ancestors = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const startNode = nodeMap.get(nodeId);
  if (!startNode) return ancestors;

  const queue: GraphNode[] = [startNode];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Use React Flow's getIncomers to find direct upstream nodes
    const incomers = getIncomers(current, nodes, edges);
    for (const incomer of incomers) {
      if (!ancestors.has(incomer.id)) {
        ancestors.add(incomer.id);
        queue.push(incomer as GraphNode);
      }
    }
  }

  return ancestors;
}

/**
 * Finds all descendant nodes (downstream dependencies) of a given node
 * Uses React Flow's getOutgoers() utility for direct children, then traverses recursively
 */
export function getDescendants(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): Set<string> {
  const descendants = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const startNode = nodeMap.get(nodeId);
  if (!startNode) return descendants;

  const queue: GraphNode[] = [startNode];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Use React Flow's getOutgoers to find direct downstream nodes
    const outgoers = getOutgoers(current, nodes, edges);
    for (const outgoer of outgoers) {
      if (!descendants.has(outgoer.id)) {
        descendants.add(outgoer.id);
        queue.push(outgoer as GraphNode);
      }
    }
  }

  return descendants;
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

/**
 * Represents a single source's contribution to inherited metadata
 */
export type InheritedSource = {
  sourceNodeId: string;
  sourceNodeName: string;
  path: string[];  // Lineage path from source to current node
  compositeKeys: Record<string, string>;  // Key-value pairs
  properties: Record<string, unknown>;  // All other properties
};

/**
 * Groups sources by their composite key structure
 */
export type CompositeKeyGroup = {
  keyNames: string[];  // Sorted list of key names, e.g., ["iso2", "year"]
  sources: InheritedSource[];  // All sources with this key structure
};

/**
 * Represents all inherited metadata for a node, grouped by composite key structure
 */
export type InheritedMetadata = {
  groups: CompositeKeyGroup[];  // Sources grouped by composite key structure
};

/**
 * Gets the path from a source node to a target node
 */
function getPathBetweenNodes(
  sourceId: string,
  targetId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // BFS to find path
  const queue: { id: string; path: string[] }[] = [{ id: sourceId, path: [nodeMap.get(sourceId)?.data.label || sourceId] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.id === targetId) {
      return current.path;
    }

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Find downstream edges (edges where current node is source)
    const downstreamEdges = edges.filter(e => e.source === current.id);
    for (const edge of downstreamEdges) {
      const nextNode = nodeMap.get(edge.target);
      if (nextNode && !visited.has(edge.target)) {
        queue.push({
          id: edge.target,
          path: [...current.path, nextNode.data.label],
        });
      }
    }
  }

  return []; // No path found
}

/**
 * Gets inherited metadata for a node by traversing upstream
 * Collects metadata from all ancestor nodes that have meta.to_propagate defined
 * Groups sources by their composite key structure for table display
 */
export function getInheritedMetadata(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): InheritedMetadata {
  const sources: InheritedSource[] = [];

  // Get all ancestors (upstream nodes) using React Flow's getIncomers
  const ancestorIds = getAncestors(nodeId, nodes, edges);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Collect metadata from ancestors that have meta.to_propagate defined
  for (const ancestorId of ancestorIds) {
    const ancestorNode = nodeMap.get(ancestorId);
    if (!ancestorNode) continue;

    const toPropagate = ancestorNode.data.meta?.to_propagate;
    if (!toPropagate) continue;

    // Handle to_propagate as array (new format)
    const entries: PropagatedMetadataEntry[] = Array.isArray(toPropagate)
      ? toPropagate
      : [];

    // Get path from source to current node
    const path = getPathBetweenNodes(ancestorId, nodeId, nodes, edges);

    for (const entry of entries) {
      const { composite_keys, ...properties } = entry;

      sources.push({
        sourceNodeId: ancestorId,
        sourceNodeName: ancestorNode.data.label,
        path,
        compositeKeys: composite_keys || {},
        properties,
      });
    }
  }

  // Group sources by composite key structure (sorted key names)
  const groupMap = new Map<string, CompositeKeyGroup>();

  for (const source of sources) {
    const keyNames = Object.keys(source.compositeKeys).sort();
    const groupKey = keyNames.join('|');

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { keyNames, sources: [] });
    }
    groupMap.get(groupKey)!.sources.push(source);
  }

  return {
    groups: Array.from(groupMap.values()),
  };
}
