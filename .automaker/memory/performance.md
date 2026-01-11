---
tags: [performance]
summary: performance implementation decisions and patterns
relevantTo: [performance]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 2
  referenced: 2
  successfulFeatures: 2
---
# performance

#### [Pattern] Rate limit status returned in 429 responses with Retry-After header calculated from getRateLimitStatus remaining time (2026-01-10)
- **Problem solved:** Claude API has rate limits that can cause analysis requests to fail temporarily
- **Why this works:** Standard HTTP 429 + Retry-After header allows HTTP clients and middleware to automatically handle backoff without custom logic. Calculating seconds from lib/claude.ts getRateLimitStatus ensures accurate wait times based on actual rate limit tracking state
- **Trade-offs:** Easier: Standards-compliant rate limiting, automatic client retry support, accurate backoff timing. Harder: Must maintain rate limit state correctly in lib/claude.ts, header calculation adds complexity