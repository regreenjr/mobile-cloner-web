---
tags: [gotcha, mistake, edge-case, bug, warning]
summary: Mistakes and edge cases to avoid
relevantTo: [error, bug, fix, issue, problem]
importance: 0.9
relatedFiles: []
usageStats:
  loaded: 11
  referenced: 7
  successfulFeatures: 7
---
# Gotchas

Mistakes and edge cases to avoid. These are lessons learned from past issues.

---



#### [Gotcha] @ts-expect-error doesn't work for Supabase type errors - must use @ts-ignore and place it on the exact line before the .update() call (2026-01-10)
- **Situation:** Supabase v2.90+ type inference was failing on .update() operations with type errors like 'Argument of type X is not assignable to parameter of type never'. Initial attempts used @ts-expect-error above the const declaration.
- **Root cause:** @ts-expect-error only suppresses errors on the immediately following line. The actual type error occurs on the .update() line, not the const declaration line. @ts-ignore was needed because errors persisted across multiple lines in the type inference chain.
- **How to avoid:** @ts-ignore is less safe than @ts-expect-error (won't error if the issue is fixed), but was necessary for compilation. The interface-level types remain safe. Future Supabase updates may fix the underlying inference issues.

#### [Gotcha] TypeScript errors fixed by adding explicit undefined checks for array indexing and regex match results that could be undefined (2026-01-10)
- **Situation:** TypeScript strict mode caught potential undefined access in lib/claude.ts for screenshotsToAnalyze[i] and jsonMatch[1]
- **Root cause:** Array indexing in TypeScript doesn't guarantee element exists even in for loops with length checks. Regex match results return null or array where captured groups can be undefined. TypeScript strictNullChecks caught these
- **How to avoid:** Easier: Type-safe code that won't crash on undefined access, explicit error handling. Harder: More verbose with defensive checks, must handle edge cases explicitly