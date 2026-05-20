# Project Mandates: Verification & Integrity

To ensure the technical integrity of the HAWorks platform and prevent regressions during large-scale UI/Infrastructure refactors, the following mandates are strictly enforced:

## 1. Zero-Regression Policy
The platform is a live production-active dashboard. Any change that results in a build failure, runtime exception (TypeError, ReferenceError), or corrupted JSX is a critical failure.

## 2. Mandatory Pre-Flight Verification
Before finishing any task involving changes to `.tsx`, `.astro`, `.mjs`, or `.ts` files, you **MUST** run the following command to verify the project's build integrity:

```bash
npm run build
```

**Task Completion Criteria:**
*   `npm run build` must exit with code 0.
*   No "Unterminated regular expression" or similar syntax errors in the build log.
*   All imported symbols must be defined and used correctly.

## 3. Tool Usage Integrity
*   **Sequential Edits:** Never make multiple `replace` calls to the same file in a single turn. This causes race conditions and file corruption.
*   **Full-File Rewrites:** For complex refactors, prefer `write_file` with the complete content over multiple surgical `replace` calls to ensure block-level integrity.
*   **Validation is Finality:** A task is NOT complete until the build has been verified. Never assume success based on tool output alone.

## 4. Operational Efficiency
*   **Direct Action:** For well-defined tasks (content updates, style tweaks), execute surgical changes immediately. Do not perform exhaustive audits or multi-turn research unless explicitly complex.
*   **No Over-Thinking:** Prioritize momentum and delivery. If a task is clear, act on it in the first turn.
*   **Concise Communication:** Keep text output minimal and focused on technical rationale.

## 5. Industrial UX Standards
Adhere strictly to the **Industrial Systems Console** aesthetic:
*   Sharp corners (`rounded-none`).
*   Pure black surfaces (`#000`).
*   Monospace dominance (JetBrains Mono).
*   High data density (minimal padding).
*   Monochromatic status indicators (Color = State, not decoration).
