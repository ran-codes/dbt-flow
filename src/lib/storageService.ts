/**
 * Storage service wrapping localForage for project persistence
 */

import localforage from 'localforage';
import type { ProjectMetadata, SavedProject } from './persistence';

// Configure localForage
const projectStore = localforage.createInstance({
  name: 'dbt-flow',
  storeName: 'projects',
  description: 'Saved dbt-flow planning projects',
});

const indexStore = localforage.createInstance({
  name: 'dbt-flow',
  storeName: 'index',
  description: 'Project metadata index',
});

const INDEX_KEY = 'project-index';

/**
 * Get all project metadata for listing
 */
export async function listProjects(): Promise<ProjectMetadata[]> {
  try {
    const index = await indexStore.getItem<ProjectMetadata[]>(INDEX_KEY);
    if (!index) return [];
    // Sort by updatedAt descending (most recent first)
    return index.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to list projects:', error);
    return [];
  }
}

/**
 * Load a full project by ID
 */
export async function loadProject(id: string): Promise<SavedProject | null> {
  try {
    const project = await projectStore.getItem<SavedProject>(id);
    return project;
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
}

/**
 * Save or update a project
 */
export async function saveProject(project: SavedProject): Promise<boolean> {
  try {
    // Save the full project data
    await projectStore.setItem(project.metadata.id, project);

    // Update the index
    const index = await indexStore.getItem<ProjectMetadata[]>(INDEX_KEY) || [];
    const existingIndex = index.findIndex(p => p.id === project.metadata.id);

    if (existingIndex >= 0) {
      // Update existing entry, preserve createdAt
      const existing = index[existingIndex];
      index[existingIndex] = {
        ...project.metadata,
        createdAt: existing.createdAt,
      };
    } else {
      // Add new entry
      index.push(project.metadata);
    }

    await indexStore.setItem(INDEX_KEY, index);
    return true;
  } catch (error) {
    console.error('Failed to save project:', error);
    return false;
  }
}

/**
 * Delete a project by ID
 */
export async function deleteProject(id: string): Promise<boolean> {
  try {
    // Remove from project store
    await projectStore.removeItem(id);

    // Update index
    const index = await indexStore.getItem<ProjectMetadata[]>(INDEX_KEY) || [];
    const filteredIndex = index.filter(p => p.id !== id);
    await indexStore.setItem(INDEX_KEY, filteredIndex);

    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
}

/**
 * Check if a project exists
 */
export async function projectExists(id: string): Promise<boolean> {
  try {
    const project = await projectStore.getItem(id);
    return project !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all stored data (for debugging/testing)
 */
export async function clearAllData(): Promise<void> {
  await projectStore.clear();
  await indexStore.clear();
}
