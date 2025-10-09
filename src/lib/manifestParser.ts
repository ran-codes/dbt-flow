export type DbtNode = {
  unique_id: string;
  name: string;
  resource_type: string;
  depends_on: { nodes: string[] };
  description?: string;
  compiled_code?: string;
  raw_code?: string;
  database?: string;
  schema?: string;
  alias?: string;
  columns?: Record<string, any>;
  tags?: string[];
};

export type DbtManifest = {
  nodes: Record<string, DbtNode>;
  sources: Record<string, DbtNode>;
  metrics?: Record<string, any>;
  exposures?: Record<string, any>;
  metadata: {
    project_name?: string;
    generated_at?: string;
  };
};

export type ParsedManifest = {
  nodes: DbtNode[];
  projectName: string;
  generatedAt: string;
};

/**
 * Fetches and parses a dbt manifest.json file from a URL
 * @param baseUrl - The base URL of the dbt docs site (e.g., https://example.netlify.app)
 * @returns Parsed manifest data
 */
export async function fetchManifest(baseUrl: string): Promise<ParsedManifest> {
  // Remove trailing slash if present
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const manifestUrl = `${cleanUrl}/manifest.json`;

  // Try direct fetch first
  try {
    const response = await fetch(manifestUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }

    const manifest: DbtManifest = await response.json();
    return parseManifest(manifest);
  } catch (error) {
    // If CORS error, try with proxy
    if (error instanceof TypeError || (error instanceof Error && error.message.includes('CORS'))) {
      console.log('Direct fetch failed, attempting with CORS proxy...');

      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(manifestUrl)}`;
        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch via proxy: ${response.status} ${response.statusText}`);
        }

        const manifest: DbtManifest = await response.json();
        return parseManifest(manifest);
      } catch (proxyError) {
        throw new Error('Unable to fetch manifest. CORS is blocking direct access and proxy failed. Try uploading the file instead.');
      }
    }
    throw error;
  }
}

/**
 * Parses a dbt manifest object into a normalized format
 * @param manifest - Raw dbt manifest object
 * @returns Parsed manifest data with all nodes
 */
export function parseManifest(manifest: DbtManifest): ParsedManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid manifest: Expected an object');
  }

  if (!manifest.nodes) {
    throw new Error('Invalid manifest: Missing nodes property');
  }

  // Combine all node types (models, sources, seeds, snapshots, tests)
  const allNodes = [
    ...Object.values(manifest.nodes || {}),
    ...Object.values(manifest.sources || {}),
  ];

  if (allNodes.length === 0) {
    throw new Error('Empty manifest: No nodes found');
  }

  return {
    nodes: allNodes,
    projectName: manifest.metadata?.project_name || 'Unknown Project',
    generatedAt: manifest.metadata?.generated_at || new Date().toISOString(),
  };
}

/**
 * Parses an uploaded manifest.json file
 * @param file - The uploaded File object
 * @returns Parsed manifest data
 */
export async function parseManifestFile(file: File): Promise<ParsedManifest> {
  try {
    const text = await file.text();
    const manifest: DbtManifest = JSON.parse(text);
    return parseManifest(manifest);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON file');
    }
    throw error;
  }
}
