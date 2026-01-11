---
tags: [database]
summary: database implementation decisions and patterns
relevantTo: [database]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 2
  referenced: 2
  successfulFeatures: 2
---
# database

#### [Pattern] Database operations module (db.ts) wraps Supabase client with domain-specific namespaces (referenceApps, appFeatures, etc.) instead of exposing raw client (2026-01-10)
- **Problem solved:** Application has multiple tables with complex relationships. Direct Supabase client usage spreads query logic across components. Type safety at table level is insufficient for business logic.
- **Why this works:** Encapsulates query logic in one place. Enforces consistent error handling via result pattern. Enables easier testing (mock db module not Supabase). Provides semantic API (vote(), select()) instead of generic update().
- **Trade-offs:** Easier: Centralized queries, testable, semantic operations, consistent errors. Harder: Extra abstraction layer, must update db.ts when adding operations, slightly more verbose than raw client.

### Database type structure includes Relationships and CompositeTypes as empty objects to satisfy Supabase v2.90+ type requirements (2026-01-10)
- **Context:** Supabase client's createClient() generic expects Database type with specific shape including Relationships and CompositeTypes. Without these, type inference breaks completely.
- **Why:** Supabase v2.90+ changed type inference to require these properties even if unused. Empty objects satisfy the type checker while preserving existing table types. Future-proofs if relationships are added later.
- **Rejected:** Using 'any' for Database type was rejected (loses all type safety). Omitting these properties caused createClient<Database> to fail compilation. Downgrading Supabase version rejected to get latest features.
- **Trade-offs:** Easier: Type inference works, can upgrade Supabase safely, room for future relationships. Harder: Type structure more verbose, empty objects feel unnecessary but are required by framework.
- **Breaking if changed:** Removing Relationships or CompositeTypes would break type inference for all Supabase operations, causing 'never' type errors on queries. These are structural requirements not optional fields.