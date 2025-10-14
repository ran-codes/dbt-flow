<artifact identifier="dbt-flow-prd" type="text/markdown" title="dbt-flow PRD">
# dbt-flow: Interactive dbt Lineage & Modeling Tool

## Product Requirements Document (PRD)

### Vision
A lightweight, browser-based tool for visualizing dbt project lineage and collaboratively designing data models. Teams can explore existing dbt projects, propose new models, and export AI-ready context for agentic code generation.

---

## Core Features

### 1. **Lineage Visualization** (Release 1)
Parse and visualize existing dbt projects as interactive DAGs.

- use this docs site: https://salurbal-mort-datwarehouse-v0-0-3.netlify.app/#!/overview?g_v=1

**Capabilities:**
- URL input: Fetch `manifest.json` from dbt docs sites
- File upload: Fallback for CORS-blocked or local manifests
- Interactive graph: Pan, zoom, search nodes
- Node types: Models, sources, tests, seeds, snapshots
- Dependency visualization: Upstream/downstream relationships
- Node details panel: SQL preview, description, columns, tags
- Auto-layout: Dagre algorithm for hierarchical positioning

**Technical:**
- Client-side parsing (no backend required)
- React Flow for graph rendering
- Color-coded nodes by type
- Export as PNG/SVG

---

### 2. **Interactive Modeling** (Release 2)
Add new proposed models to existing DAGs.

**Capabilities:**
- Add node button: Create new model nodes
- Connect nodes: Draw edges to define dependencies
- Node properties:
  - Name (with dbt naming validation)
  - Type (model/source/seed)
  - Upstream dependencies (select from existing nodes)
  - Downstream consumers (auto-populate)
- Visual differentiation: Proposed nodes (dashed border) vs existing (solid)
- Validation: Prevent circular dependencies, duplicate names
- Undo/redo changes

**Use Cases:**
- Data engineers proposing new transformations
- Analytics teams mapping out reporting requirements
- Cross-team data modeling discussions

---

### 3. **Context Export** (Release 3)
Export modifications as AI-consumable JSON for agentic code generation.

**Export Format:**
```json
{
  "project": "my_dbt_project",
  "timestamp": "2025-10-09T12:00:00Z",
  "changes": {
    "new_nodes": [
      {
        "name": "stg_users_enriched",
        "type": "model",
        "depends_on": ["stg_users", "ref_countries"],
        "description": "User data enriched with country info"
      }
    ]
  }
}
```

**Capabilities:**
- Export as JSON/YAML
- Include lineage context (upstream/downstream 2 levels)
- Copy to clipboard for AI prompts
- Download as file
- Optional: Generate dbt model boilerplate SQL

**AI Integration Example:**
```
"Based on this dbt project context, generate SQL for stg_users_enriched 
that joins stg_users with ref_countries on country_code..."
```

---

### 4. **Enhanced Metadata** (Release 4)
Add rich annotations to nodes for collaborative planning.

**Node Metadata:**
- **Renaming:** Update node names (track original → proposed)
- **Notes:** Markdown-formatted implementation notes
- **Priority:** P0 (critical) to P3 (nice-to-have)
- **Owner:** Assign team/individual
- **Status:** Proposed → In Progress → Completed
- **Complexity:** T-shirt sizing (S/M/L/XL)
- **Dependencies:** External systems, data sources

**Capabilities:**
- Side panel editor for metadata
- Metadata visible on node hover
- Filter/sort by priority, status, owner
- Export includes all metadata
- Comment threads on nodes (future)

---

## Release Roadmap

### **Release 1: Visualization MVP** (Weeks 1-2)
- Parse manifest.json
- Render interactive DAG
- Node search/filter
- Details panel
- Export as image

**Success Criteria:**
- Load 500+ node DAGs smoothly
- Sub-second manifest parsing
- CORS fallback works

---

### **Release 2: Interactive Modeling** (Weeks 3-4)
- Add new nodes UI
- Draw connections
- Dependency validation
- Visual differentiation (proposed vs existing)
- Basic undo/redo

**Success Criteria:**
- Add 50+ nodes without performance degradation
- Zero invalid dependency graphs
- Intuitive UX for non-technical users

---

### **Release 3: Export Context** (Week 5)
- JSON/YAML export
- Lineage context inclusion
- Clipboard integration
- AI prompt templates

**Success Criteria:**
- Exported JSON valid for LLM consumption
- Include 100% of user-defined changes
- Copy-paste workflow < 3 clicks

---

### **Release 4: Enhanced Metadata** (Weeks 6-7)
- Rename nodes
- Add notes, priority, owner, status
- Metadata editor panel
- Filter/sort by metadata
- Export with full metadata

**Success Criteria:**
- All metadata persists in exports
- Metadata search/filter works
- Teams can track 20+ proposed changes

---

## Technical Architecture

**Frontend:**
- Next.js 14 (App Router, SSG)
- React Flow 11+
- Tailwind CSS
- TypeScript
- Zustand (state management)

**Data Flow:**
1. User provides URL/file → Parse manifest
2. Build graph (nodes/edges) → Store in Zustand
3. User adds nodes/metadata → Update state
4. Export → Serialize state to JSON

**Storage:**
- Browser-only (no backend)
- LocalStorage for session recovery
- No user data leaves browser

---

## Non-Goals (Future Consideration)
- Real-time collaboration
- Version control integration (Git)
- Reverse-engineer SQL to manifest
- Cost/performance analytics
- dbt Cloud API integration

---

## Success Metrics
- **Adoption:** 100 DAU within 3 months
- **Engagement:** Avg 10 mins per session
- **Export Rate:** 30% of sessions export JSON
- **Project Size:** Support 1000+ node DAGs

---

## Open Questions
1. Should proposed nodes be saveable as "draft projects"?
2. Export format: Custom JSON vs native dbt YAML?
3. Node positioning: Persist custom layouts?
4. Multi-manifest support (compare projects)?
</artifact>