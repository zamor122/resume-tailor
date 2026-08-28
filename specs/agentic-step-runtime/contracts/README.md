# contracts/

Preserved external contracts for the agentic step-runtime refactor. **These are frozen** — the refactor must not change them (spec.md @EARS-5, NF-5).

## Interface → artifact map

| Interface | EARS | Artifact | Notes |
| --- | --- | --- | --- |
| SSE resume tailoring | @EARS-3, @EARS-5 | `openapi.yaml` (`/api/humanize/stream`) | `status`/`complete`/`error` events preserved exactly |
| Recipe execution | @EARS-5 | `openapi.yaml` (`/api/pipeline`, `/api/tailor`) | Facades; payloads/JSON preserved |
| Runtime behavior (registry, cost guard, fallback, budget, parity, cleanup) | @EARS-1,2,4,6,7,8,9,10,11,12 | `runtime.feature` | One scenario per EARS id, tagged `@EARS-n` |

## Bucket-A / bucket-B / bucket-C route response shapes

The 17 routes keep their existing JSON contracts (which are already live endpoints). Their exact request/response schemas are enumerated as **contract tests** in `tasks.md` (post entrance-gate) rather than duplicated as OpenAPI here, to avoid drift from the running code.

## Entry-gate note

Per the SDD Authoring Contract, this folder is authored with `spec.md`, and both are approved together at the **entry gate**. Do not write `plan.md`/`tasks.md`/code until the human stamps `spec.md` §Sign-off.