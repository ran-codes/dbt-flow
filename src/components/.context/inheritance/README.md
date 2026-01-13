# Metadata Inheritance System

This document explains how metadata propagation works in dbt-planner, allowing downstream nodes to inherit metadata from their upstream sources.

## Overview

The inheritance system allows source nodes to define metadata (like composite keys, data sharing policies, source labels) that automatically propagates to all downstream nodes in the lineage graph.

## Data Structure

### Manifest Format (`to_propagate`)

Sources define propagatable metadata in their `meta.to_propagate` field as an array:

```json
{
  "meta": {
    "to_propagate": [
      {
        "composite_keys": {
          "iso2": "mx",
          "year": "2024"
        },
        "source_file_name": "mexico_mortality_2024.csv",
        "source_label": "Mexico Health Ministry",
        "source_data_sharing_policy": "internal"
      }
    ]
  }
}
```

**Key points:**
- `composite_keys`: Object with key-value pairs (not just key names)
- Arbitrary properties supported (not limited to predefined fields)
- Array format allows multiple entries per source

### Type Definitions

**`src/lib/manifestParser.ts`:**
```typescript
export type PropagatedMetadataEntry = {
  composite_keys: Record<string, string>;
  [key: string]: unknown;  // Arbitrary properties
};

export type DbtNodeMetaToPropagate = PropagatedMetadataEntry[];
```

**`src/lib/graphBuilder.ts`:**
```typescript
export type InheritedSource = {
  sourceNodeId: string;
  sourceNodeName: string;
  path: string[];  // Lineage path from source to current node
  compositeKeys: Record<string, string>;
  properties: Record<string, unknown>;
};

export type CompositeKeyGroup = {
  keyNames: string[];  // e.g., ["iso2", "year"]
  sources: InheritedSource[];
};

export type InheritedMetadata = {
  groups: CompositeKeyGroup[];
};
```

## Propagation Logic

### File: `src/lib/graphBuilder.ts`

---

## Complete Implementation Walkthrough

### Overview: What Happens When You Click a Node

```
User clicks on "int__harmonized_mortality"
                    ↓
NodeDetailsPanel.tsx calls getInheritedMetadata()
                    ↓
getInheritedMetadata() finds all upstream sources
                    ↓
Groups sources by composite key structure
                    ↓
Returns data for table rendering
```

---

### Step 1: Entry Point - NodeDetailsPanel.tsx

**File:** `src/components/NodeDetailsPanel.tsx` (lines 32-34)

When a user clicks on a node, the panel renders and computes inherited metadata:

```typescript
const inheritedMetadata: InheritedMetadata = useMemo(() => {
  return getInheritedMetadata(node.id, nodes, edges);
}, [node.id, nodes, edges]);
```

**What this does:**
- `node.id` = the ID of the clicked node (e.g., `"model.lineage_example.int__harmonized_mortality"`)
- `nodes` = all nodes in the graph (from Zustand store)
- `edges` = all edges in the graph (from Zustand store)
- `useMemo` = only recalculates when node/graph changes (performance optimization)

---

### Step 2: Find All Ancestors - getAncestors()

**File:** `src/lib/graphBuilder.ts` (lines 328-358)

First, we need to find ALL upstream nodes (not just direct parents).

```typescript
export function getAncestors(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): Set<string> {
  const ancestors = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find the starting node
  const startNode = nodeMap.get(nodeId);
  if (!startNode) return ancestors;

  // BFS queue - starts with the clicked node
  const queue: GraphNode[] = [startNode];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;  // Take first item (FIFO)

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // React Flow's getIncomers returns DIRECT upstream nodes only
    const incomers = getIncomers(current, nodes, edges);

    for (const incomer of incomers) {
      if (!ancestors.has(incomer.id)) {
        ancestors.add(incomer.id);
        queue.push(incomer as GraphNode);  // Add to queue to check ITS parents
      }
    }
  }

  return ancestors;
}
```

**Visual Example:**

```
Graph Structure:

  source__mexico ──→ base__mexico ──┐
                                    ├──→ int__harmonized (CLICKED)
  source__brazil ──→ base__brazil ──┘

When user clicks "int__harmonized":

Iteration 1: queue = [int__harmonized]
  - getIncomers(int__harmonized) returns [base__mexico, base__brazil]
  - ancestors = {base__mexico, base__brazil}
  - queue = [base__mexico, base__brazil]

Iteration 2: queue = [base__mexico, base__brazil]
  - Process base__mexico
  - getIncomers(base__mexico) returns [source__mexico]
  - ancestors = {base__mexico, base__brazil, source__mexico}
  - queue = [base__brazil, source__mexico]

Iteration 3: queue = [base__brazil, source__mexico]
  - Process base__brazil
  - getIncomers(base__brazil) returns [source__brazil]
  - ancestors = {base__mexico, base__brazil, source__mexico, source__brazil}
  - queue = [source__mexico, source__brazil]

Iteration 4-5: Process sources (no more incomers)
  - getIncomers(source__mexico) returns []
  - getIncomers(source__brazil) returns []

Final result: {base__mexico, base__brazil, source__mexico, source__brazil}
```

**Key Insight:** React Flow's `getIncomers()` only returns DIRECT parents. We use BFS to walk the full chain.

---

### Step 3: Collect Metadata - getInheritedMetadata()

**File:** `src/lib/graphBuilder.ts` (lines 544-601)

Now we iterate through all ancestors and collect their `to_propagate` metadata:

```typescript
export function getInheritedMetadata(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): InheritedMetadata {
  const sources: InheritedSource[] = [];

  // Step 3a: Get all ancestors
  const ancestorIds = getAncestors(nodeId, nodes, edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Step 3b: For each ancestor, check if it has to_propagate
  for (const ancestorId of ancestorIds) {
    const ancestorNode = nodeMap.get(ancestorId);
    if (!ancestorNode) continue;

    // Only source nodes typically have to_propagate defined
    const toPropagate = ancestorNode.data.meta?.to_propagate;
    if (!toPropagate) continue;

    // to_propagate must be an array
    const entries: PropagatedMetadataEntry[] = Array.isArray(toPropagate)
      ? toPropagate
      : [];

    // Step 3c: Calculate the lineage path for attribution
    const path = getPathBetweenNodes(ancestorId, nodeId, nodes, edges);

    // Step 3d: Create InheritedSource record for each entry
    for (const entry of entries) {
      const { composite_keys, ...properties } = entry;

      sources.push({
        sourceNodeId: ancestorId,
        sourceNodeName: ancestorNode.data.label,
        path,                              // e.g., ["source__mexico", "base__mexico", "int__harmonized"]
        compositeKeys: composite_keys || {}, // e.g., { iso2: "mx", year: "2024" }
        properties,                        // e.g., { source_file_name: "mexico.csv", source_label: "..." }
      });
    }
  }

  // ... grouping logic (Step 4)
}
```

**Visual Example - Data Collection:**

```
Ancestors: {base__mexico, base__brazil, source__mexico, source__brazil}

Check each ancestor:
  - base__mexico.data.meta?.to_propagate → undefined (skip)
  - base__brazil.data.meta?.to_propagate → undefined (skip)
  - source__mexico.data.meta?.to_propagate → HAS DATA!
  - source__brazil.data.meta?.to_propagate → HAS DATA!

source__mexico has:
  to_propagate: [{
    composite_keys: { iso2: "mx", year: "2024" },
    source_file_name: "mexico_mortality_2024.csv",
    source_label: "Mexico Health Ministry"
  }]

source__brazil has:
  to_propagate: [{
    composite_keys: { iso2: "br", year: "2024" },
    source_file_name: "brazil_mortality_2024.csv",
    source_label: "Brazil Health Ministry"
  }]

After collection, sources array contains:
[
  {
    sourceNodeId: "source.lineage_example.raw_data.source__mexico_mortality",
    sourceNodeName: "source__mexico_mortality",
    path: ["source__mexico_mortality", "base__mexico_mortality", "int__harmonized_mortality"],
    compositeKeys: { iso2: "mx", year: "2024" },
    properties: { source_file_name: "mexico_mortality_2024.csv", source_label: "Mexico Health Ministry" }
  },
  {
    sourceNodeId: "source.lineage_example.raw_data.source__brazil_mortality",
    sourceNodeName: "source__brazil_mortality",
    path: ["source__brazil_mortality", "base__brazil_mortality", "int__harmonized_mortality"],
    compositeKeys: { iso2: "br", year: "2024" },
    properties: { source_file_name: "brazil_mortality_2024.csv", source_label: "Brazil Health Ministry" }
  }
]
```

---

### Step 4: Group by Composite Key Structure

**File:** `src/lib/graphBuilder.ts` (lines 585-599)

Sources are grouped by their composite key STRUCTURE (not values) for table display:

```typescript
  // Group sources by composite key structure (sorted key names)
  const groupMap = new Map<string, CompositeKeyGroup>();

  for (const source of sources) {
    // Get sorted key names to create group identifier
    const keyNames = Object.keys(source.compositeKeys).sort();
    const groupKey = keyNames.join('|');  // e.g., "iso2|year"

    // Create group if doesn't exist
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { keyNames, sources: [] });
    }

    // Add source to its group
    groupMap.get(groupKey)!.sources.push(source);
  }

  return { groups: Array.from(groupMap.values()) };
```

**Visual Example - Grouping:**

```
sources array has 2 items:
  - Mexico: compositeKeys = { iso2: "mx", year: "2024" }
  - Brazil: compositeKeys = { iso2: "br", year: "2024" }

Processing Mexico:
  keyNames = Object.keys({ iso2: "mx", year: "2024" }).sort()
           = ["iso2", "year"]
  groupKey = "iso2|year"
  groupMap.set("iso2|year", { keyNames: ["iso2", "year"], sources: [Mexico] })

Processing Brazil:
  keyNames = ["iso2", "year"]
  groupKey = "iso2|year"
  groupMap.get("iso2|year").sources.push(Brazil)

Final result:
{
  groups: [
    {
      keyNames: ["iso2", "year"],
      sources: [Mexico, Brazil]  // Same key structure = same table
    }
  ]
}

If we had a third source with different keys:
  - GlobalStats: compositeKeys = { region: "worldwide" }
  - keyNames = ["region"]
  - groupKey = "region"
  - Creates SEPARATE group → SEPARATE table in UI
```

**Why Group?** Sources with the same composite key structure can share a table with identical columns. Different structures need separate tables.

---

### Step 5: Path Calculation - getPathBetweenNodes()

**File:** `src/lib/graphBuilder.ts` (lines 501-537)

For each source, we calculate the lineage path to show attribution:

```typescript
function getPathBetweenNodes(
  sourceId: string,
  targetId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // BFS from source to target, tracking the path
  const queue: { id: string; path: string[] }[] = [
    { id: sourceId, path: [nodeMap.get(sourceId)?.data.label || sourceId] }
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Found target - return the path
    if (current.id === targetId) {
      return current.path;
    }

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Find downstream edges (we're going FROM source TO target)
    const downstreamEdges = edges.filter(e => e.source === current.id);
    for (const edge of downstreamEdges) {
      const nextNode = nodeMap.get(edge.target);
      if (nextNode && !visited.has(edge.target)) {
        queue.push({
          id: edge.target,
          path: [...current.path, nextNode.data.label],  // Append to path
        });
      }
    }
  }

  return []; // No path found
}
```

**Example:**
```
getPathBetweenNodes("source__mexico", "int__harmonized", nodes, edges)

Returns: ["source__mexico_mortality", "base__mexico_mortality", "int__harmonized_mortality"]

This is displayed in the UI as:
"source__mexico_mortality → base__mexico_mortality → int__harmonized_mortality"
```

---

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER CLICKS NODE                                 │
│                    "int__harmonized_mortality"                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NodeDetailsPanel.tsx                                                    │
│  ─────────────────────                                                   │
│  const inheritedMetadata = useMemo(() => {                              │
│    return getInheritedMetadata(node.id, nodes, edges);                  │
│  }, [node.id, nodes, edges]);                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  getInheritedMetadata() - Step 1                                         │
│  ────────────────────────────────                                        │
│  const ancestorIds = getAncestors(nodeId, nodes, edges);                │
│                                                                          │
│  Uses React Flow's getIncomers() in BFS loop:                           │
│    int__harmonized                                                       │
│         ↑                                                                │
│    getIncomers() returns [base__mexico, base__brazil]                   │
│         ↑                                    ↑                           │
│    getIncomers() returns        getIncomers() returns                   │
│    [source__mexico]             [source__brazil]                        │
│                                                                          │
│  Result: {base__mexico, base__brazil, source__mexico, source__brazil}   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  getInheritedMetadata() - Step 2                                         │
│  ────────────────────────────────                                        │
│  For each ancestor, check meta.to_propagate:                            │
│                                                                          │
│    base__mexico    → no to_propagate (skip)                             │
│    base__brazil    → no to_propagate (skip)                             │
│    source__mexico  → HAS to_propagate array!                            │
│    source__brazil  → HAS to_propagate array!                            │
│                                                                          │
│  Collect into sources[] array with path calculation                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  getInheritedMetadata() - Step 3                                         │
│  ────────────────────────────────                                        │
│  Group sources by composite key structure:                              │
│                                                                          │
│    Mexico keys: {iso2, year} → groupKey = "iso2|year"                   │
│    Brazil keys: {iso2, year} → groupKey = "iso2|year"                   │
│                                                                          │
│  Same groupKey = same table!                                            │
│                                                                          │
│  Result: { groups: [{ keyNames: ["iso2","year"], sources: [...] }] }    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NodeDetailsPanel.tsx - Render Table                                     │
│  ───────────────────────────────────                                     │
│                                                                          │
│  Keys: iso2, year                                                        │
│  ┌────────────────────┬──────┬──────┬─────────────────┬───────────────┐ │
│  │ Source             │ iso2 │ year │ Source Label    │ File Name     │ │
│  ├────────────────────┼──────┼──────┼─────────────────┼───────────────┤ │
│  │ source__mexico     │ mx   │ 2024 │ Mexico Health   │ mexico.csv    │ │
│  │ source__brazil     │ br   │ 2024 │ Brazil Health   │ brazil.csv    │ │
│  └────────────────────┴──────┴──────┴─────────────────┴───────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Helper Function: `getAncestors(nodeId, nodes, edges)`

**File:** `src/lib/graphBuilder.ts` (lines 328-358)

Uses React Flow's `getIncomers()` in a BFS loop to find ALL upstream nodes.

### Helper Function: `getDescendants(nodeId, nodes, edges)`

**File:** `src/lib/graphBuilder.ts` (lines 364-394)

Same pattern but uses `getOutgoers()` to find downstream nodes.

### Helper Function: `getPathBetweenNodes(sourceId, targetId, nodes, edges)`

**File:** `src/lib/graphBuilder.ts` (lines 501-537)

Custom BFS to find the path between two nodes. React Flow doesn't provide this.

## UI Display

### File: `src/components/NodeDetailsPanel.tsx`

### When Propagation Runs

Propagation is **lazy** - calculated on-demand when a node is selected:

```typescript
const inheritedMetadata: InheritedMetadata = useMemo(() => {
  return getInheritedMetadata(node.id, nodes, edges);
}, [node.id, nodes, edges]);
```

### Table Rendering

Sources are displayed in tables grouped by composite key structure:

```
Group: Keys: iso2, year
┌────────────┬──────┬──────┬──────────────┬─────────────┐
│ Source     │ iso2 │ year │ Source Label │ File Name   │
├────────────┼──────┼──────┼──────────────┼─────────────┤
│ source_mx  │ mx   │ 2024 │ Mexico Min.  │ mexico.csv  │
│ source_br  │ br   │ 2024 │ Brazil Min.  │ brazil.csv  │
└────────────┴──────┴──────┴──────────────┴─────────────┘
```

If sources have different key structures, they appear in separate tables.

## Lifecycle Summary

| Event | Action |
|-------|--------|
| Page load | `parseManifest()` → `buildGraph()` → store (metadata preserved on nodes) |
| Click node | `getInheritedMetadata()` traverses upstream, returns grouped sources |
| Add edge | New connections automatically included in next propagation calculation |

## Key Files

| File | Responsibility |
|------|----------------|
| `src/lib/manifestParser.ts` | Type definitions for `PropagatedMetadataEntry` |
| `src/lib/graphBuilder.ts` | `getInheritedMetadata()`, `getAncestors()`, `getPathBetweenNodes()` |
| `src/components/NodeDetailsPanel.tsx` | UI rendering of inherited metadata tables |
| `src/components/LineageGraph.tsx` | Main graph visualization component using React Flow |
| `public/manifest_lineage_example.json` | Example manifest with `to_propagate` data |

## React Flow Dependencies

The graph visualization is built on [React Flow](https://reactflow.dev/). Here are the imports used in `src/components/LineageGraph.tsx`:

### Components

- **`ReactFlow`** - Main graph canvas component
  - Docs: https://reactflow.dev/api-reference/react-flow

- **`Background`** - Renders dot/line grid background
  - Docs: https://reactflow.dev/api-reference/components/background

- **`Controls`** - Zoom in/out and fit view buttons
  - Docs: https://reactflow.dev/api-reference/components/controls

- **`MiniMap`** - Small overview map of the entire graph
  - Docs: https://reactflow.dev/api-reference/components/minimap

- **`ReactFlowProvider`** - Context provider for React Flow state
  - Docs: https://reactflow.dev/api-reference/react-flow-provider

### Hooks

- **`useReactFlow`** - Access React Flow instance methods (`fitView`, `getZoom`, `screenToFlowPosition`, etc.)
  - Docs: https://reactflow.dev/api-reference/hooks/use-react-flow

### Helper Functions

- **`applyNodeChanges`** - Apply node change events (position, selection, etc.) to node array
  - Docs: https://reactflow.dev/api-reference/utils/apply-node-changes

- **`applyEdgeChanges`** - Apply edge change events to edge array
  - Docs: https://reactflow.dev/api-reference/utils/apply-edge-changes

### Types

- **`Node`** - Node data structure type
  - Docs: https://reactflow.dev/api-reference/types/node

- **`Edge`** - Edge data structure type
  - Docs: https://reactflow.dev/api-reference/types/edge

- **`NodeChange`** - Node change event type (position, selection, removal)
  - Docs: https://reactflow.dev/api-reference/types/node-change

- **`EdgeChange`** - Edge change event type
  - Docs: https://reactflow.dev/api-reference/types/edge-change

- **`Connection`** - New connection event type (when user draws edge)
  - Docs: https://reactflow.dev/api-reference/types/connection

- **`NodeMouseHandler`** - Type for node click/hover event handlers
  - Docs: https://reactflow.dev/api-reference/types/node-mouse-handler

### Constants

- **`MarkerType`** - Enum for edge arrow markers (`Arrow`, `ArrowClosed`)
  - Docs: https://reactflow.dev/api-reference/types/edge-marker

### Styles

```typescript
import 'reactflow/dist/style.css';  // Required base styles
```

### Usage in graphBuilder.ts

The `src/lib/graphBuilder.ts` file imports React Flow types and utilities:

```typescript
import type { Node, Edge } from 'reactflow';
import { MarkerType, getIncomers, getOutgoers } from 'reactflow';
```

- **Types** (`Node`, `Edge`): Used to define `GraphNode` and `GraphEdge` types
- **`MarkerType`**: Used for edge arrow markers
- **`getIncomers`**: Used in `getAncestors()` to find direct upstream nodes
- **`getOutgoers`**: Used in `getDescendants()` to find direct downstream nodes
