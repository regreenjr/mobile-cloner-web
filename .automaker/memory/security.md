---
tags: [security]
summary: security implementation decisions and patterns
relevantTo: [security]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 1
  referenced: 1
  successfulFeatures: 1
---
# security

### Server-side API key prioritization: ANTHROPIC_API_KEY (server-only) takes precedence over NEXT_PUBLIC_ANTHROPIC_API_KEY (2026-01-10)
- **Context:** Need to keep Anthropic API key secure while supporting both server and client-side usage patterns in a Next.js application
- **Why:** Next.js API routes run server-side where environment variables without NEXT_PUBLIC_ prefix are not exposed to browser. This prevents API key leakage to client bundles while maintaining backward compatibility with public keys for client-side usage
- **Rejected:** Using only NEXT_PUBLIC_ANTHROPIC_API_KEY would expose the key in client bundle. Using only ANTHROPIC_API_KEY would break existing client-side integrations
- **Trade-offs:** Easier: Secure server-side API calls without key exposure. Harder: Must maintain two possible key names and understand the security implications of each prefix
- **Breaking if changed:** If changed back to only public keys, the server-side API endpoint would expose credentials to client. If changed to only private keys, any existing client-side Claude integrations would break