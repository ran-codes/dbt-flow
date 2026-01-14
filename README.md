# dbt-planner

A browser-based tool for visualizing dbt project lineage and planning model changes. Explore your dbt DAG, propose new models, and understand data flow—all without leaving your browser.

## Features

- **Lineage Visualization** — Load any dbt project's `manifest.json` and explore the DAG interactively
- **Run Planning** — Filter by layer (raw, staging, mart), resource type, or tags to plan which models to run
- **Impact Analysis** — Focus on upstream or downstream dependencies to understand change impact
- **Interactive Modeling** — Add proposed models, draw connections, and plan changes before writing code
- **Metadata Inheritance** — View how composite keys and metadata propagate through your lineage
- **Local Storage** — Save and manage multiple projects in your browser (no backend required)

## Quick Start

### Try it Online

Visit the hosted version: **[dbt-planner](https://ranli.dev/dbt-planner/)**

### Run Locally

```bash
# Clone the repo
git clone https://github.com/yourusername/dbt-planner.git
cd dbt-planner

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Loading a Project

1. **From URL** — Enter a dbt docs site URL (fetches `manifest.json` automatically)
2. **Upload File** — Drag & drop or browse for a local `manifest.json`
3. **Sample Projects** — Try the included example projects

### Navigating the Graph

- **Pan** — Click and drag the canvas
- **Zoom** — Scroll or use the controls
- **Select Node** — Click to view details in the side panel
- **Right-Click** — Context menu with focus/navigation options

### Filtering

Use the bottom toolbar to filter nodes:

| Filter | Description |
|--------|-------------|
| **Layer** | Filter by inferred layer (raw, staging, intermediate, mart) |
| **Resource** | Filter by dbt resource type (model, source, seed, test) |
| **Tags** | Filter by dbt tags (AND/OR mode) |

### Focus Mode

Right-click any node to:
- **Focus: This + Downstream** — Show only this node and everything it feeds into
- **Focus: This + Upstream** — Show only this node and its dependencies
- **Focus on Node** — Center and highlight a specific node

### Adding Models

1. Click **Add** in the toolbar (or right-click canvas)
2. Enter model name and details
3. Connect to existing nodes by dragging from handles
4. Export your plan when ready

## Tech Stack

- **Next.js 15** — React framework with App Router
- **React Flow** — Interactive node-based graphs
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **LocalForage** — Browser storage

## Project Structure

```
src/
├── app/                  # Next.js pages
│   ├── page.tsx          # Home/project list
│   └── visualize/        # Graph visualization
├── components/
│   ├── LineageGraph.tsx  # Main graph component
│   ├── FilterBar.tsx     # Bottom filter toolbar
│   ├── CustomNode.tsx    # Node rendering
│   └── NodeDetailsPanel.tsx
├── lib/
│   ├── graphBuilder.ts   # DAG construction & traversal
│   ├── manifestParser.ts # dbt manifest parsing
│   └── storageService.ts # LocalForage wrapper
└── store/
    └── useGraphStore.ts  # Zustand store
```

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.
