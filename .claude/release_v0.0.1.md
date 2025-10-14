# Release 1: Visualization MVP - Sprint Plan

## Goal
Parse dbt manifest from https://salurbal-mort-datwarehouse-v0-0-3.netlify.app and render interactive DAG.

## Dependencies

**Core:**
- `next` - Next.js framework
- `react` - UI library
- `typescript` - Type safety

**Graph Visualization:**
- `reactflow` - Interactive node-based UI (https://reactflow.dev)
- `dagre` - Graph layout algorithm (auto-positions nodes hierarchically)
- `@types/dagre` - TypeScript types for dagre

**State Management:**
- `zustand` - Lightweight state management (simpler than Redux)

**Styling:**
- `tailwindcss` - Utility CSS framework

**Install:**
```bash
npm install reactflow dagre zustand
npm install -D @types/dagre
```

---

## Tasks

### **1. Project Setup** (2 hours)
```bash
npx create-next-app@latest dbt-flow --typescript --tailwind --app
cd dbt-flow
npm install reactflow dagre zustand
npm install -D @types/dagre
```

**Next.js config:**
```js
// next.config.js
module.exports = {
  output: 'export',
  basePath: '/dbt-flow',
  images: { unoptimized: true }
}
```

---

### **2. Landing Page** (3 hours)
**File:** `src/app/page.tsx`

**UI Components:**
- Header with logo/title
- Hero section with tagline
- URL input field
- "Parse & Visualize" button
- Loading spinner
- Error message display

**Design:**
- Center-aligned form
- Tailwind professional theme (slate/blue)
- Mobile responsive

---

### **3. Manifest Parser** (4 hours)
**File:** `src/lib/manifestParser.ts`

**Logic:**
```typescript
// Fetch manifest.json
const url = `${baseUrl}/manifest.json`;
const manifest = await fetch(url).then(r => r.json());

// Extract nodes
const models = manifest.nodes; // filter resource_type === 'model'
const sources = manifest.sources;

// Build dependency edges
const edges = models.map(node => 
  node.depends_on.nodes.map(dep => ({
    source: dep,
    target: node.unique_id
  }))
);
```

**Types:**
```typescript
type DbtNode = {
  unique_id: string;
  name: string;
  resource_type: string;
  depends_on: { nodes: string[] };
  description?: string;
  sql?: string;
};
```

---

### **4. Graph Builder** (5 hours)
**File:** `src/lib/graphBuilder.ts`

**Dagre Layout:**
```typescript
import dagre from 'dagre';

const getLayoutedElements = (nodes, edges) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR' });
  
  nodes.forEach(n => g.setNode(n.id, { width: 150, height: 50 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  
  dagre.layout(g);
  
  return nodes.map(n => ({
    ...n,
    position: { x: g.node(n.id).x, y: g.node(n.id).y }
  }));
};
```

**Node Styling:**
```typescript
const nodeColor = {
  model: '#3b82f6',
  source: '#10b981',
  test: '#f59e0b',
  seed: '#8b5cf6'
};
```

---

### **5. Visualization Component** (4 hours)
**File:** `src/components/LineageGraph.tsx`

```typescript
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

export default function LineageGraph({ nodes, edges }) {
  return (
    <div style={{ height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

---

### **6. State Management** (2 hours)
**File:** `src/store/useGraphStore.ts`

```typescript
import { create } from 'zustand';

type GraphStore = {
  nodes: Node[];
  edges: Edge[];
  setGraph: (nodes: Node[], edges: Edge[]) => void;
};

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  setGraph: (nodes, edges) => set({ nodes, edges })
}));
```

---

### **7. Routing** (2 hours)
**Pages:**
- `/` - Landing page
- `/visualize` - Graph view

**Flow:**
1. User enters URL → Parse button
2. Navigate to `/visualize` with manifest in state
3. Render graph

---

### **8. Error Handling** (2 hours)
**Scenarios:**
- Invalid URL
- CORS error (show message: "Upload manifest.json instead")
- Parse failure
- Empty manifest

---

### **9. Testing** (2 hours)
**Test with:**
```
https://salurbal-mort-datwarehouse-v0-0-3.netlify.app
```

**Verify:**
- Manifest loads
- Nodes render
- Edges connect
- Pan/zoom works
- Performance (100+ nodes)

---

### **10. Deploy** (1 hour)
```bash
npm run build
# Deploy /out folder to GitHub Pages
```

---

## File Structure
```
src/
├── app/
│   ├── page.tsx              # Landing
│   └── visualize/page.tsx    # Graph
├── components/
│   └── LineageGraph.tsx
├── lib/
│   ├── manifestParser.ts
│   └── graphBuilder.ts
└── store/
    └── useGraphStore.ts
```

---

## Timeline
**Total: ~27 hours (3-4 days)**

Day 1: Setup + Landing Page  
Day 2: Parser + Graph Builder  
Day 3: Visualization + State  
Day 4: Testing + Deploy

---

## Success Criteria
✅ Professional landing page  
✅ Parse SALURBAL manifest  
✅ Render 100+ nodes smoothly  
✅ Interactive pan/zoom  
✅ Deployed to GitHub Pages