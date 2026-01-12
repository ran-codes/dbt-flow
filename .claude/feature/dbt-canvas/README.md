# dbt Canvas Feature Research

> Research from https://docs.getdbt.com/docs/cloud/canvas

## What is dbt Canvas?

dbt Canvas is dbt Cloud's visual, drag-and-drop data modeling tool that generates SQL. Enterprise-only feature launched May 2025.

**Key difference from our tool:** dbt Canvas generates SQL and requires a dbt Cloud connection. Our tool is for **requirements capture** - executives sketch models and write notes for engineers/agents to implement.

---

## dbt Canvas Features

### Operators (Transformation Nodes)

| Category | Operators | Applicable to Us? |
|----------|-----------|-------------------|
| **Input** | Model explorer, CSV upload | Yes - source selection |
| **Transform** | Join, Union, Formula, Aggregate, Pivot, Limit, Order, Filter, Rename | Partially - visual representation only |
| **Output** | Output model | Yes - final model designation |
| **AI** | Copilot (natural language → SQL) | Future - AI agent handoff |

### UI/UX Elements

| Feature | Description | Priority for Us |
|---------|-------------|-----------------|
| **Operator toolbar** | Top bar with draggable transformation tiles | HIGH - need similar for node types |
| **Canvas whiteboard** | Drag-and-drop workspace | HIGH - already have this |
| **Configuration panel** | Side panel with tabs (Configure, Input, Output, Code) | HIGH - our "Notion page" |
| **Connector lines** | Drag from "+" to connect nodes | HIGH - edge creation |
| **L/R join endpoints** | Left/Right indicators for joins | LOW - we're model-level only |
| **Data preview** | Preview output of each node | MEDIUM - nice to have |
| **Code view** | See generated SQL | LOW - we don't generate SQL |
| **Zoom controls** | Zoom in/out visualization | HIGH - already have this |

### Workflow Features

| Feature | Description | Priority for Us |
|---------|-------------|-----------------|
| **Git version control** | Models saved to Git | LOW - we use LocalForage + export |
| **CSV upload** | Upload source data directly | LOW - not our use case |
| **AI code generation** | Copilot generates SQL | FUTURE - agent handoff |
| **Model compilation** | Compiles to SQL | N/A - we don't generate SQL |

---

## High-Value Features to Build

### Must Have (Phase 1-2)

1. **Operator/Node toolbar** - Draggable tiles for creating new nodes
   - Node types: Source, Model, Concept, Draft Note
   - Visual distinction by type/layer

2. **Drag-to-connect edges** - Click and drag between nodes
   - Show "+" connector on hover
   - Visual feedback while dragging

3. **Configuration panel** - Right-side panel (like current detail view)
   - Tabs: Overview, Columns, Notes, Metadata
   - Inline editing capability

4. **Node status indicators** - Visual badges
   - Draft, Review, Approved, Deprecated
   - Owner assignment

### Should Have (Phase 3)

5. **Data preview placeholder** - Show sample data structure
   - Column names and types
   - No actual data (we don't connect to warehouses)

6. **Export as requirements doc** - Generate markdown/PDF
   - For handoff to engineers
   - Include all notes and column definitions

### Nice to Have (Future)

7. **AI agent integration** - Natural language notes → model specs
   - "Create a model that joins customers and orders"
   - Generate suggested structure for engineer review

8. **Template library** - Common patterns
   - Staging layer template
   - Fact/dimension templates
   - SCD Type 2 pattern

---

## UI Inspiration from dbt Canvas

### What to Borrow

- **Left-to-right flow** - Logical data flow visualization
- **Operator categories** - Grouped node types in toolbar
- **Connection interaction** - "+" hover to start edge
- **Side panel tabs** - Organized configuration views
- **Clean, minimal chrome** - Focus on the canvas

### What NOT to Copy

- SQL generation complexity
- Warehouse connection requirements
- Join L/R endpoint complexity
- Real data preview (requires connection)

---

## Sources

- [About dbt Canvas](https://docs.getdbt.com/docs/cloud/canvas)
- [Canvas Interface](https://docs.getdbt.com/docs/cloud/canvas-interface)
- [Edit and Create Models](https://docs.getdbt.com/docs/cloud/use-canvas)
- [dbt Canvas is GA Blog](https://www.getdbt.com/blog/dbt-canvas-is-ga)
