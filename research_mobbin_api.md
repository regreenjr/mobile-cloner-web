# Mobbin (screensdesign.com) API Research Summary

_Generated: 2026-01-10 | Sources: 5_

## 🎯 Quick Reference

<key-points>
- Mobbin does NOT have an official public API for developers
- No official API documentation, authentication methods, or rate limits are publicly available
- Third-party unofficial Swift API exists (reverse-engineered)
- Mobbin is primarily a UI/UX design inspiration platform, not an API service
- To access programmatically, you would need to contact Mobbin directly or use reverse-engineered methods
</key-points>

## 📋 Overview

<summary>
Mobbin (mobbin.com, formerly screensdesign.com) is a UI & UX design inspiration library featuring over 1,000 iOS & Web apps and 200 sites with 577,400+ screens. It's a subscription-based platform designed for designers to explore design patterns, user flows, and UI elements from real-world applications.

**Important Discovery**: Despite extensive searching, Mobbin does NOT provide an official API for programmatic access to their screenshot database. All search results point to unofficial third-party solutions or show Mobbin hosting screenshots of OTHER companies' API documentation as design inspiration.
</summary>

## 🔧 Platform Features (Web UI Only)

### What Mobbin Offers Through Their Web Interface

1. **Design Pattern Search**
   - Search by screens, UI elements, flows, and text in screenshots
   - Categories: Profile, Wallet, Welcome, Account Setup, Home, Subscription, Login, Settings, Checkout, Collections
   - Advanced filtering by app, category, platform

2. **Content Library**
   - 1,150+ apps
   - 577,400+ screens
   - 306,000+ flows
   - Both iOS and Web platforms

3. **Features**
   - Video flows with transitions and animations
   - Prototype mode with interactive hotspots
   - Copy to Figma integration (Figma plugin available)
   - Save to collections
   - Comment functionality
   - Text search within screenshots

4. **Pricing**
   - Free tier available
   - Paid plans for full access (specific pricing not documented here)

## ⚠️ Official API Status

<warnings>
**NO OFFICIAL API EXISTS**

- Mobbin does not provide official API documentation
- No public developer portal or API keys available
- No official authentication methods documented
- No rate limits published (because no official API exists)
- Mobbin appears to be designed exclusively for human interaction through their web/mobile interface
</warnings>

## 🔓 Unofficial Third-Party Solution

### MobbinAPI (Swift Library)

A third-party developer created an unofficial open-source Swift API by reverse-engineering Mobbin's internal endpoints.

**Repository**: [GitHub - underthestars-zhy/MobbinAPI](https://github.com/underthestars-zhy/MobbinAPI)

**Status**:
- 27 stars, 2 forks
- Last updated: May 2, 2023 (Version 1.1.4)
- MIT License
- 100% Swift, 100% async

### Reverse-Engineered Authentication Method

```swift
// Create API instance
let mobbinAPI = MobbinAPI(email: "your@email.com")

// Step 1: Send verification email
try await mobbinAPI.sendEmail()

// Step 2: Verify with code from email
try await mobbinAPI.verify(code: "123456")

// Step 3: Tokens are generated automatically
// Access token expires after 1 day
```

### Token Management

**Token Composition**:
- `accessToken`: Used for authentication
- `refreshToken`: Used for refreshing access token
- `generatedTime`: When the access token was generated

**Important Limitation**:
- Tokens expire after 24 hours
- Must refresh daily: `try await mobbinAPI.refreshToken()`

### Available Endpoints (Unofficial)

#### iOS Apps
```swift
// Get total count (may be inaccurate)
let count = try await mobbinAPI.iOSAppsCount

// Fetch all apps
try await mobbinAPI.getAlliOSApps()

// Page query (24 apps per page)
try await mobbinAPI.queryNextPage(nil) // First page
try await mobbinAPI.queryNextPage(lastApp) // Next page
```

#### App Details
```swift
// Get screens
let screens = try await api.getiOSScreens(of: app)

// Get flows
let flows = try await api.getiOSFlows(of: app)

// Generate tree structure from flows
let tree = api.generateTreeSturctureFlow(from: flows)
```

#### Collections (Full CRUD)
```swift
// Query collections
let collections = try await api.queryCollections()

// Create collection
try await api.createCollection(in: workspace, name: "...", description: "...")

// Edit collection
try await api.edit(collection: collection, name: "...", description: "...")

// Delete collection
try await api.delete(collection: collection)

// Query items in collection
let apps = try await api.queryApps(in: collection)
let screens = try await api.queryScreens(in: collection)
let flows = try await api.queryFlows(in: collection)
```

#### Mobbin's Internal API (Advanced)
```swift
// Get Mobbin query token
let token = try await mobbinAPI.getMobbinQueryToken()

// Get App Store URL
let downloadURL = try await mobbinAPI.downloadURL(of: app)

// Get version history (paid feature)
let versions = try await mobbinAPI.versions(of: app)
```

### Data Structures

**App Object**:
- `id`: App ID
- `appName`: Name
- `appCategory`: Category
- `appStyle`: Style (future feature)
- `appLogoUrl`: Logo URL
- `appTagline`: Tagline
- `platform`: Platform (iOS/Android/Web)
- `appVersionId`: Version ID
- `previewScreenUrls`: Array of 3 preview image URLs

**Screen Object**:
- `id`: Screen ID
- `screenNumber`: Screen number
- `screenUrl`: Image URL
- `screenElements`: Array of UI elements
- `screenPatterns`: Array of design patterns
- `appVersionId`: App version ID

**Flow Object**:
- `id`: Flow ID
- `name`: Flow name
- `actions`: Array of actions
- `parentAppSectionId`: Parent flow ID (tree structure)
- `screens`: Array of screens with hotspot data

**Collection Object**:
- Workspace-based organization
- Supports apps, screens, and flows
- Platform counts available

## 🚫 Limitations & Risks

<warnings>
**Using Unofficial API Carries Risks**:

1. **No Support**: Unofficial API has no guarantee of continued functionality
2. **Breaking Changes**: Mobbin can change their internal endpoints at any time
3. **Terms of Service**: Using reverse-engineered APIs may violate Mobbin's ToS
4. **Legal Risk**: Potential copyright/IP concerns with automated access
5. **Account Termination**: Your Mobbin account could be banned
6. **Rate Limiting**: Unknown rate limits, may trigger abuse detection
7. **Incomplete Features**:
   - Android support: Not implemented
   - Web support: Not implemented
   - iOS Screens search: Not implemented
   - iOS Flows search: Not implemented
8. **Maintenance**: Last updated May 2023, may be outdated
</warnings>

## 🔗 Alternative Approaches

<alternatives>
### 1. Manual Web Scraping
- Use browser automation (Puppeteer, Playwright, Selenium)
- Respect robots.txt and rate limits
- High risk of detection and blocking

### 2. Contact Mobbin Directly
- Email: support@mobbin.com (assumed)
- Request official API access for your use case
- Propose partnership or enterprise integration

### 3. Use Mobbin's Figma Plugin
- Official Figma plugin available: [Mobbin Figma Plugin](https://www.figma.com/community/plugin/1332649462188834894/mobbin)
- Designed for designers to copy designs into Figma
- Not suitable for programmatic access

### 4. Subscribe and Use Web Interface
- Free tier available for exploration
- Paid plans for full access
- Manual workflow but fully supported

### 5. Alternative Design Inspiration APIs
Consider other platforms that DO offer APIs:
- Dribbble API (design inspiration)
- Behance API (Adobe)
- UI8 (design resources)
- Screenlane (may have API)
</alternatives>

## 📊 Platform Technology Stack

<tech-stack>
Based on available information:
- **Frontend**: Next.js (React framework)
- **Backend**: Supabase (confirmed from case study)
- **Database**: PostgreSQL (via Supabase)
- **Infrastructure**: Likely Vercel (Next.js hosting)
- **Authentication**: Email magic link (passwordless)

Mobbin migrated to Supabase and uses it for their backend infrastructure.
</tech-stack>

## 🎯 Recommendations

<recommendations>
### For Programmatic Access to Screenshots

**If you MUST access Mobbin programmatically:**

1. **Contact Mobbin First** (Recommended)
   - Explain your use case
   - Request official API access
   - Discuss partnership opportunities
   - Get written permission

2. **Use Unofficial API with Caution**
   - Only for personal/research projects
   - Do not commercialize
   - Respect rate limits (self-imposed)
   - Cache aggressively to minimize requests
   - Be prepared for it to break

3. **Consider Alternatives**
   - Build your own screenshot database
   - Use App Store Connect API (for your own apps)
   - Use publicly available app screenshot datasets
   - Partner with app developers directly

### For Design Inspiration (Intended Use)

**Best Practice:**
- Subscribe to Mobbin (support the creators)
- Use their web interface as designed
- Use Figma plugin for design work
- Save to collections for organization
- Respect their terms of service
</recommendations>

## 🔗 Resources

<references>
- [Mobbin Official Website](https://mobbin.com/) - Main platform
- [Mobbin Figma Plugin](https://www.figma.com/community/plugin/1332649462188834894/mobbin) - Official plugin
- [MobbinAPI GitHub](https://github.com/underthestars-zhy/MobbinAPI) - Unofficial Swift API
- [Mobbin + Supabase Case Study](https://supabase.com/customers/mobbin) - Backend architecture
- [Mobbin Status Page](https://status.mobbin.com/) - Service status monitoring
- [Mobbin Changelog](https://mobbin.com/changelog) - Platform updates
</references>

## 🏷️ Metadata

<meta>
research-date: 2026-01-10
confidence: high
api-status: none-official
unofficial-api-version: 1.1.4 (May 2023)
platform-focus: iOS (primary), Web (secondary), Android (not supported)
authentication-method: email-magic-link
token-expiry: 24-hours
last-verified: 2026-01-10
</meta>

---

## ⚖️ Legal & Ethical Considerations

**Important Disclaimer**: This research is for educational purposes only. Before using any unofficial API or scraping methods:

1. Read Mobbin's Terms of Service carefully
2. Obtain explicit permission for programmatic access
3. Respect intellectual property rights of app screenshots
4. Consider privacy implications of automated data collection
5. Consult with legal counsel for commercial use cases

Mobbin's content consists of screenshots from other companies' apps. Using these screenshots programmatically may have legal implications beyond just Mobbin's ToS.

---

## 📝 Summary

**Mobbin does not offer an official API.** The platform is designed for human interaction through their web interface and Figma plugin. Any programmatic access would require:

1. Reverse engineering (risky, may violate ToS)
2. Direct partnership/permission from Mobbin
3. Web scraping (high risk of blocking)

For legitimate use cases requiring programmatic access to app screenshots, the best approach is to **contact Mobbin directly** to discuss official API access or partnership opportunities.
</meta>
