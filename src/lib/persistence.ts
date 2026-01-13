/**
 * Persistence types and serialization helpers for dbt-flow
 */

import type { GraphNode, GraphEdge } from './graphBuilder';

// Schema version for future migrations
export const SCHEMA_VERSION = 1;

/**
 * Project metadata stored in the index for quick listing
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  sourceProjectName: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  plannedNodeCount: number;
  schemaVersion: number;
}

/**
 * Filter state to persist
 */
export interface SavedFilterState {
  resourceTypeFilters: string[];
  tagFilters: string[];
  tagFilterMode: 'AND' | 'OR';
  inferredTagFilters: string[];
  inferredTagFilterMode: 'AND' | 'OR';
}

/**
 * Full project data for storage
 */
export interface SavedProject {
  metadata: ProjectMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  filters: SavedFilterState;
  manifestInfo: {
    projectName: string;
    generatedAt: string;
  };
}

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create metadata from project data
 */
export function createMetadata(
  id: string,
  name: string,
  sourceProjectName: string,
  nodes: GraphNode[],
  isNew: boolean = true
): ProjectMetadata {
  const now = new Date().toISOString();
  const plannedNodeCount = nodes.filter(n => n.data.isUserCreated).length;

  return {
    id,
    name,
    sourceProjectName,
    createdAt: isNew ? now : now, // Will be overwritten if updating
    updatedAt: now,
    nodeCount: nodes.length,
    plannedNodeCount,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Serialize filter state from Sets to arrays
 */
export function serializeFilters(
  resourceTypeFilters: Set<string>,
  tagFilters: Set<string>,
  tagFilterMode: 'AND' | 'OR',
  inferredTagFilters: Set<string>,
  inferredTagFilterMode: 'AND' | 'OR'
): SavedFilterState {
  return {
    resourceTypeFilters: Array.from(resourceTypeFilters),
    tagFilters: Array.from(tagFilters),
    tagFilterMode,
    inferredTagFilters: Array.from(inferredTagFilters),
    inferredTagFilterMode,
  };
}

/**
 * Deserialize filter state from arrays to Sets
 */
export function deserializeFilters(filters: SavedFilterState): {
  resourceTypeFilters: Set<string>;
  tagFilters: Set<string>;
  tagFilterMode: 'AND' | 'OR';
  inferredTagFilters: Set<string>;
  inferredTagFilterMode: 'AND' | 'OR';
} {
  return {
    resourceTypeFilters: new Set(filters.resourceTypeFilters),
    tagFilters: new Set(filters.tagFilters),
    tagFilterMode: filters.tagFilterMode,
    inferredTagFilters: new Set(filters.inferredTagFilters),
    inferredTagFilterMode: filters.inferredTagFilterMode,
  };
}
