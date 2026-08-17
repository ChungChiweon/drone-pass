# Autonomous Promotion Development Freeze

## Status

The autonomous-promotion canary, batch plan, policy gate, remediation, targeted verification, and batch apply planner are frozen as historical engine-validation experiments.

They are not production service features. Their domain code and regression tests remain in the repository, but the Canary and Batch Plan administrator routes are available only when `NODE_ENV === "development"`. Production requests resolve through `notFound()` and no production navigation exposes these routes.

## Why development is frozen

The experiments proved that controlled status transitions, snapshots, rollback, graph-aware compilation, and safety checks can work. They did not prove that the current two-source dataset represents the national drone written-exam scope. Optimizing approval or question count before source coverage would amplify a narrow aviation-law sample.

## Current historical result

- Pack: `kr-drone-license:mrm0omvd`
- AtomicFact: 433
- Approved Fact: 30
- Active graph relations: 11
- The former 40-question target was an initial engine-validation experiment only.

## Restart conditions

Development may resume only after:

1. the official exam scope is identified and versioned;
2. current official sources cover aviation law, aviation weather, and flight theory/operation;
3. source files, revisions, locators, extraction quality, and conflicts are auditable;
4. source batches reach their coverage completion conditions;
5. human review policy is re-approved for the broader corpus.

No existing Fact, Pack, Graph, Question DB, or Supabase data was changed by this freeze.
