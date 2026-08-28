@runtime
Feature: Agentic step-runtime behavior (backward-compatible refactor)
  As the resume-tailoring engine
  I want a deterministic, sandboxed, free-first step-runtime
  So that quality is preserved (or improved) while the default path costs $0.

  Scenario Outline: Executor fails closed on an undeclared input or function
    Given a running step-runtime with the registry
    When a step references function or input "<ref>" not declared in the registry
    Then the executor SHALL raise without executing anything
    Examples:
      | ref            |
      | unregisteredFn |
      | undeclaredInput |
  @EARS-1

  Scenario: Refuse-to-pay without opt-in
    Given no user key and costPolicy not "paid" for this run
    When a step would invoke a paid provider
    Then the runtime SHALL raise AND SHALL NOT call the paid provider
  @EARS-2

  Scenario: apply_to_job recipe emits the preserved SSE contract
    Given a valid resume and job description
    When the apply_to_job recipe runs
    Then SSE "status" stages and a "complete" event match the legacy humanize/stream schema
  @EARS-3

  Scenario: Free-model fallback chain, never paid escalation
    Given the primary free model is rate-limited (429)
    When the step needs a model
    Then the runtime tries cerebras:gpt-oss-120b, then gemini:gemini-2.5-flash-lite, then groq:llama-3.3-70b-versatile
    And SHALL NOT escalate to a paid provider
  @EARS-4

  Scenario: Bucket-A routes answer without LLM
    Given a bucket-A route is invoked (ats-simulator, format-validator, resume-versions, validate-resume, keyword-analyzer)
    When the route responds
    Then the response comes from pure deterministic functions with the unchanged JSON shape
    And no LLM-service call is made
  @EARS-6

  Scenario: LLM confined to the read/generation nodes
    Given the migrated codebase
    When CI runs the LLM-import boundary grep
    Then zero LLM-service imports exist outside the runtime read/generation nodes
  @EARS-7

  Scenario: Token budget caps an automatic run
    Given a recipe with a declared per-run token budget
    When estimated tokens would exceed the budget
    Then the executor SHALL hard-stop the run at the budget
  @EARS-8

  Scenario: Free-only defaults when no opt-in
    Given no paid opt-in
    When the effective model config is resolved
    Then default/fallback contains only the free chain and DEFAULT_MODEL_KEY is free-tier
  @EARS-9

  Scenario: Legacy rollback path while the flag is off
    Given STEP_RUNTIME is disabled
    When a feature route runs
    Then execution uses the legacy path unchanged
  @EARS-10

  Scenario: Deterministic score within parity tolerance
    Given an identical resume + job description
    When the deterministic score is computed
    Then it matches legacy scoring within +/-2 points on >=95% of inputs and never regresses
  @EARS-11

  Scenario: No legacy debug or monolith shipped
    Given the feature flag default is enabled
    When the shipped runtime is inspected
    Then it contains no 127.0.0.1:7244 debug ingest calls and no legacy monolith path
  @EARS-12