# ADR-3: Scope decisions (blog cron, skills-market-value, sessions)

## Context

Four edge-case scope items were resolved during finalization of the effort-level DESIGN (§9). These don't warrant individual full ADRs — they are simple decisions the DESIGN already made and which the runtime executes.

## Decisions

### Blog cron stays outside the runtime
`cron/generate-blog-post` is an admin-only route with no user-facing contract. Migrating it adds risk without payoff. It stays a standalone route, unaffected by the refactor. The runtime docs explicitly call it out as excluded.

### skills-market-value is deterministic by default
A curated salary/market data lookup answers by default. A bounded LLM read fires only if the lookup misses AND the run opts into `costPolicy:'paid'` with a user-supplied key. No free path ever spends tokens to answer a market-value question.

### Sessions stay in the `sessions` table
The existing `sessions` Supabase table (managed by `api/mcp/session-manager`) remains the canonical session store. The runtime reads persisted state through declared `context.ts` selectors — no new state store, no migration needed. This keeps principle #8 (backward compatible) and avoids a risky schema change.

## Consequences

- The runtime's `context.ts` selectors must know how to pull `Session` data from the existing API (or directly from the `sessions` table in future optimizations).
- `skills-market-value` route retains its current endpoint shape — the response schema doesn't change; only the implementation path bifurcates into deterministic-lookup-first.