# Proposal: Open Source Release of dbt-planner

## Summary

I am requesting approval to release **dbt-planner** (a dbt lineage visualization and run planning tool) as open source software under my personal GitHub account, using a permissive open source license (MIT or Apache 2.0).

## What is dbt-planner?

A web-based tool that helps data teams:
- Visualize dbt model dependencies and lineage
- Plan which models to run based on selection criteria
- Perform impact analysis when making changes
- Export work plans in GitHub and AI agent accessible formats (JSON, YAML, markdown) for integration with CI/CD pipelines and automated workflows

## The Gap This Fills

dbt is a powerful tool, but its native interface is command-line only. The existing options for visual planning are:

| Option | Limitation |
|--------|------------|
| **dbt Cloud** | Paid product; not accessible to all teams |
| **dbt docs** | View-only lineage; no interactive planning or selection |
| **CLI commands** | Requires memorizing selector syntax; no visual feedback |
| **Third-party tools** | Often expensive, complex, or overkill for planning tasks |

**dbt-planner fills this gap** by providing:
- A free, open source visual interface for dbt project planning
- Point-and-click model selection instead of memorizing CLI syntax
- Immediate visual feedback on what will run and why
- Accessible to team members who aren't CLI-comfortable (analysts, stakeholders)
- Lightweight and focused - does one thing well without bloat

This lowers the barrier to entry for teams adopting dbt and makes day-to-day operations more accessible to the whole data team, not just engineers.

## Proposed Approach

| Aspect | Detail |
|--------|--------|
| **License** | MIT or Apache 2.0 (permissive, no copyleft) |
| **Hosting** | Personal GitHub account |
| **Access** | Public repository, free for anyone to use |

## Why This Benefits the University

### 1. Perpetual, Unrestricted Access

Under a permissive open source license, the university:
- Can use, modify, and distribute the software forever
- Can fork the repository at any time to create an internal copy
- Has no vendor lock-in or dependency on any individual
- Pays no licensing fees, now or ever

### 2. Long-Term Maintainability

If I were to leave the university:
- The team can fork the repository and continue development independently
- All code, history, and documentation transfers with the fork
- No handover negotiations or access requests needed
- The team already has full read access to everything

### 3. Community Contributions

Open source projects benefit from:
- Bug reports and fixes from external users
- Feature contributions from the broader dbt community
- Security reviews from the community
- Reduced maintenance burden through shared effort

### 4. No Risk to the University

| Concern | Mitigation |
|---------|------------|
| Loss of access | Permissive license guarantees perpetual rights; team can fork anytime |
| Competitor advantage | Tool is dbt-specific utility, not core research or competitive IP |
| Support obligations | None - OSS is provided "as is" |
| Legal liability | Standard OSS license disclaimers apply |

## What I'm Asking For

1. **Approval** to release this project as open source under my personal GitHub account
2. **Acknowledgment** that the university retains full rights to use, fork, and modify the software under the open source license

## Proposed Acknowledgment

The README will include:

> *Originally developed while working as a Staff Data Scientist at [University Name]. Released as open source for the benefit of the dbt community.*

## Alternatives Considered

| Option | Drawback |
|--------|----------|
| University-owned repo | Adds bureaucratic overhead; limits my ability to maintain long-term; doesn't change the team's access rights |
| Keep private/internal | Team still depends on me; no community benefit; harder to share with collaborators |
| Transfer ownership later | Creates uncertainty; fork-on-exit achieves the same result with less friction |

## Next Steps

If approved:
1. Add MIT/Apache 2.0 LICENSE file to repository
2. Update README with acknowledgment and documentation
3. Add team members as collaborators
4. Make repository public

---

**Prepared by:** [Your Name]
**Date:** [Date]
**Role:** Staff Data Scientist
