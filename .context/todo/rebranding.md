# Project Decisions

## Naming: dbt-planner

**Previous name:** dbt-flow

**Rationale for change:**
- "dbt-flow" was abstract and didn't communicate the tool's purpose
- "dbt-core-planner" considered but rejected due to potential confusion with dbt Core (the product)
- "dbt-planner" is clear, descriptive, and doesn't collide with existing dbt terminology

**Primary use cases (in priority order):**
1. Planning which models to run
2. Visualizing lineage/dependencies
3. Impact analysis

## GitHub Organization: Personal

**Decision:** Host under personal GitHub account, not university org.

**Rationale:**
- Maintains long-term ownership regardless of employment status
- Tool is personally maintained, even if team uses it
- Team can be added as collaborators for contribution access
- Permissive license (MIT/Apache 2.0) allows university/team to freely use and fork

**Mitigations:**
- Add team members as collaborators
- Acknowledge university context in README
- Use permissive open-source license
