<p align="center">
  <img src="public/logo.svg" alt="dbt-planner logo" width="120" height="120">
</p>

# dbt-planner

**Free, browser-based dbt lineage visualization and planning tool.**

Visualize your dbt project DAG, plan model changes, analyze upstream/downstream dependencies, and export work plans — all without leaving your browser. No backend required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why dbt-planner?

- **Instant Setup** — Just load your `manifest.json` and start exploring
- **Privacy First** — All data stays in your browser (no server uploads)
- **Plan Before You Build** — Add proposed models, visualize changes, export work plans
- **Impact Analysis** — Understand what breaks before you break it

## Features

| Feature | Description |
|---------|-------------|
| **Lineage Visualization** | Interactive DAG explorer for any dbt project |
| **Layer Filtering** | Filter by layer (source, staging, intermediate, mart) |
| **Impact Analysis** | Focus upstream/downstream to see dependencies |
| **Model Planning** | Add proposed models and connections visually |
| **Work Plan Export** | Export changes as Markdown or JSON for your team |
| **Local Storage** | Save multiple projects in your browser |

## Quick Start

### Try it Online

**[Launch dbt-planner](https://ranli.dev/dbt-planner/)** — No installation required

### Run Locally

```bash
git clone https://github.com/ran-codes/dbt-planner.git
cd dbt-planner
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Load Your Project

1. **URL** — Enter your dbt docs site URL (auto-fetches `manifest.json`)
2. **Upload** — Drag & drop your `manifest.json` file
3. **Sample** — Try included example projects

### Navigate the Graph

- **Pan**: Click + drag
- **Zoom**: Scroll wheel
- **Select**: Click any node
- **Context Menu**: Right-click for focus options

### Filter & Focus

- Filter by **layer** (raw, staging, intermediate, mart)
- Filter by **resource type** (model, source, seed)
- Filter by **tags** (AND/OR mode)
- **Focus upstream/downstream** from any node

### Plan Changes

1. Right-click to add new models
2. Connect to existing nodes
3. Edit metadata (description, tags, SQL)
4. Export work plan when ready

## Tech Stack

- **Next.js 15** — React framework
- **React Flow** — Graph visualization
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **LocalForage** — Browser storage

## Use Cases

- **Data Engineers**: Visualize lineage before refactoring
- **Analytics Engineers**: Plan new models with context
- **Data Teams**: Document and share pipeline changes
- **Code Review**: Export work plans for PR descriptions

## Keywords

dbt, dbt-core, data lineage, DAG visualization, manifest.json, data pipeline, analytics engineering, data modeling, impact analysis, dbt docs, lineage graph, dependency graph

## License

MIT

## Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

---

Built for the dbt community.
