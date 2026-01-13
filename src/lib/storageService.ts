/**
 * Storage service wrapping localForage for project persistence
 */

import localforage from 'localforage';
import type { ProjectMetadata, SavedProject } from './persistence';

// Configure localForage
const projectStore = localforage.createInstance({
  name: 'dbt-planner',
  storeName: 'projects',
  description: 'Saved dbt-planner projects',
});

const indexStore = localforage.createInstance({
  name: 'dbt-planner',
  storeName: 'index',
  description: 'Project metadata index',
});

const INDEX_KEY = 'project-index';

// Track pending saves to prevent race conditions
const pendingSaves = new Map<string, Promise<boolean>>();

/**
 * Wait for any pending save of a specific project to complete
 */
async function waitForPendingSave(id: string): Promise<void> {
  const pending = pendingSaves.get(id);
  if (pending) {
    await pending;
  }
}

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
 * Waits for any pending saves to complete first to prevent race conditions
 */
export async function loadProject(id: string): Promise<SavedProject | null> {
  try {
    // Wait for any in-flight save of this project to complete
    await waitForPendingSave(id);

    const project = await projectStore.getItem<SavedProject>(id);
    return project;
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
}

/**
 * Save or update a project
 * Tracks the save promise to prevent race conditions with loads
 */
export async function saveProject(project: SavedProject): Promise<boolean> {
  const id = project.metadata.id;

  // Create the save operation
  const saveOperation = (async () => {
    try {
      // Save the full project data
      await projectStore.setItem(id, project);

      // Update the index
      const index = await indexStore.getItem<ProjectMetadata[]>(INDEX_KEY) || [];
      const existingIndex = index.findIndex(p => p.id === id);

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
    } finally {
      // Clean up the pending save tracker
      pendingSaves.delete(id);
    }
  })();

  // Track this save so loads can wait for it
  pendingSaves.set(id, saveOperation);

  return saveOperation;
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

/**
 * Database backup format
 */
export interface DatabaseBackup {
  version: number;
  exportedAt: string;
  projects: SavedProject[];
}

/**
 * Export all projects as a backup
 */
export async function exportDatabase(): Promise<DatabaseBackup> {
  const index = await listProjects();
  const projects: SavedProject[] = [];

  for (const meta of index) {
    const project = await loadProject(meta.id);
    if (project) {
      projects.push(project);
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
  };
}

/**
 * Import a database backup, replacing all existing data
 */
export async function importDatabase(backup: DatabaseBackup): Promise<boolean> {
  try {
    // Validate backup structure
    if (!backup.projects || !Array.isArray(backup.projects)) {
      throw new Error('Invalid backup format');
    }

    // Clear existing data
    await projectStore.clear();
    await indexStore.clear();

    // Import all projects
    const index: ProjectMetadata[] = [];
    for (const project of backup.projects) {
      if (project.metadata && project.nodes && project.edges) {
        await projectStore.setItem(project.metadata.id, project);
        index.push(project.metadata);
      }
    }

    // Save the index
    await indexStore.setItem(INDEX_KEY, index);

    return true;
  } catch (error) {
    console.error('Failed to import database:', error);
    return false;
  }
}
