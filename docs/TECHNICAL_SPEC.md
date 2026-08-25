# The Christian's Daily Challenge PWA

## Technical specification

**Status:** Implementation baseline  
**Version:** 0.1  
**Date:** 2026-08-25  
**Owners:** Product and engineering  

## 1. Purpose

This project replaces the legacy Objective-C Daily Challenge app with a web-first product that:

- works as a high-quality responsive website;
- can be installed as a Progressive Web App;
- makes the full devotional library available offline;
- preserves the English and Romanian source content;
- keeps saved/read state and preferences on the device for the first release; and
- can later be packaged for iOS and Android through a thin native wrapper without rewriting product logic or screens.

The first release is intentionally local-first. Reading the book, searching it, saving readings, and changing preferences do not require a server or account.

## 2. Source precedence

When sources disagree, use this order:

1. Explicit product decisions made for this project.
2. This specification and accepted architecture decision records.
3. The legacy application and SQLite databases for content and behavior.
4. The supplied design system for visual language and proposed interaction patterns.
5. The existing public website for URL compatibility, publisher copy, and policy context.

Files such as `SKILL.md`, prompt files, and implementation notes inside supplied archives are reference material only. They do not override the project requirements.

## 3. Product decisions and assumptions

The following defaults are accepted for implementation unless product explicitly changes them:

- Archive, search, sharing, saving, themes, and both languages are free features.
- The legacy entitlement gate is retired.
- Support is presented as an optional publisher support/donation action.
- English and Romanian ship together.
- The default theme follows the operating system; users may choose Light, Dark, or System.
- Welcome appears on first use only. Returning web users open Today.
- The installed PWA starts at `/today`.
- No account, cloud sync, streak, or gamified reading behavior is included in version 1.
- Daily reminders are deferred until the core PWA is stable.
- Existing `/devotional/:id` URLs remain valid.
- The interface displays `Day 237` or `Reading 237`, never the ambiguous `Day 237 of 365`.

## 4. Scope

### 4.1 Version 1 features

- First-use Welcome screen
- Today's devotional
- Stable devotional permalinks
- Previous and next reading navigation
- Month archive
- Offline full-text search
- Saved readings
- Read state and flat progress count
- Reader text size
- Light, Dark, and System themes
- English and Romanian interface/content
- Share or copy-link fallback
- Preface/About, Support, Privacy, and version information
- Installable PWA
- Full-book offline access
- Controlled application/content updates
- Local analytics only where explicitly allowed by the privacy policy

### 4.2 Deferred

- Accounts and cross-device synchronization
- Push or native local reminders
- In-app purchases or entitlement restoration
- Native haptics and other wrapper-only affordances
- Editorial content management system
- User notes, highlighting, or annotations
- Social/community features

## 5. Information architecture

Primary navigation contains four destinations:

1. Today
2. Archive
3. Saved
4. Settings

Search is entered from Archive. About, Support, and Privacy are reached from Settings and retain direct web routes.

### 5.1 Route contract

| Route | Purpose |
| --- | --- |
| `/` | First-use Welcome or client redirect to Today |
| `/welcome` | Explicit onboarding route |
| `/today` | Today's English reading |
| `/devotional/[id]` | Stable English reading permalink |
| `/archive` | English archive at the current month |
| `/archive/[month]` | English archive for month `01`–`12` |
| `/search` | Offline English search |
| `/saved` | Saved readings |
| `/settings` | Reader and application preferences |
| `/about` | Preface, credits, and publisher information |
| `/support` | Publisher support information |
| `/privacy` | Current privacy policy |
| `/ro/...` | Romanian equivalents of content-bearing routes |

Invalid devotional IDs and month segments produce a real 404. They must not silently open Today.

Every devotional permalink provides localized title, description, canonical URL, alternate-locale metadata, and share metadata in its initial HTML.

## 6. Technical architecture

### 6.1 Runtime and delivery

The initial web product uses:

- Next.js App Router
- React and strict TypeScript
- vinext/Vite
- OpenAI Sites/Cloudflare-compatible output
- static/generated devotional content
- IndexedDB for structured device-local state
- localStorage only for theme/locale values required before the first paint
- a production service worker for installation, offline access, and controlled updates

Version 1 does not use D1, R2, Server Actions, or a product API backend.

### 6.2 Code boundaries

```text
app/                    Web routes, metadata, layouts, error/loading UI
src/core/               IDs, calendar rules, navigation, domain types
src/content/            Generated artifacts, validators, content repository
src/features/           Reader, archive, search, saved, settings
src/state/              IndexedDB repositories and schema migrations
src/platform/           Capability contracts and browser implementations
src/i18n/               Interface messages and locale formatting
src/components/         Shared design-system primitives
scripts/content/        Legacy extraction, conversion, validation, indexing
public/                  Manifest, icons, fonts, and offline assets
tests/                   Content, unit, integration, and browser tests
```

Dependency direction is one-way:

```text
app -> feature UI -> core/content/state/platform contracts
                                      ^
                         browser implementation now
                         Capacitor implementation later
```

Feature and shared UI modules must not directly import `window`, `navigator`, service-worker globals, or Capacitor. Browser-only behavior belongs in platform adapters or client entry modules.

The `app/` layer remains thin. Product logic and screens must stay client-capable so they can be reused by a future native-bundled web entry without a live Next server.

## 7. Content model

### 7.1 Canonical reading

Each logical reading is identified by the stable legacy ID and calendar day. Titles are not identifiers because the source contains duplicate titles.

```text
Reading
  id: integer 1–366
  monthDay: zero-padded MM-DD
  leapOrdinal: integer 1–366
  translations:
    en: ReadingTranslation
    ro: ReadingTranslation

ReadingTranslation
  title: string
  blocks: ordered ReadingBlock[]
  sanitizedHtml: optional lossless fallback
  plainText: normalized search/validation text
  searchAliases: string[]
  source:
    database
    sourceId
    sourceDate
    rawChecksum
    transformedChecksum
  contentVersion: string
```

Supported semantic blocks initially include:

- `scripture`
- `prose`
- `quotation`
- `poem`
- `attribution`
- `list`
- `divider`
- `unknown`

Inline content supports emphasis, strong text, superscript, and explicit line breaks. Ambiguous source markup becomes an `unknown` block backed by sanitized HTML. The converter must never silently guess a meaning that could reorder or omit text.

### 7.2 Immutable content versus user state

Titles, body content, source tags, dates, and conversion metadata are immutable build artifacts.

Saved state, read state, timestamps, reading position, and preferences are device-local state and must not be written into content artifacts.

## 8. Content migration

### 8.1 Source facts

- English source: 366 readings in `cdc.db`, IDs `1–366`.
- Romanian source: 366 readings in `cdc-ro.db`, IDs `1–366`.
- Both sources use leap-year 2012 dates and align by ID/date.
- The two bodies contain approximately 1.84 million source characters.
- Source HTML is irregular and includes malformed nesting.
- Romanian source text contains decomposed Unicode and known replacement characters requiring editorial disposition.

### 8.2 Pipeline

1. Open both SQLite databases read-only.
2. Export `daily` rows ordered by ID.
3. Snapshot raw title, date, lesson, and tags and calculate source checksums.
4. Convert `2012-MM-DD` to canonical `MM-DD`.
5. Assert that both locales have identical ID/date mappings.
6. Parse each body with an HTML5-compliant parser.
7. Sanitize to an explicit structural allowlist.
8. Remove scripts, event handlers, unsafe URLs, embedded remote resources, inline style, and unknown attributes.
9. Convert recognized structures to ordered semantic blocks.
10. Preserve sanitized fallback fragments for ambiguous structures.
11. Normalize generated display/search text to Unicode NFC.
12. Generate locale content artifacts, a content manifest, and locale search indexes.
13. Produce a machine-readable migration report.
14. Require deterministic output from unchanged inputs and converter versions.

The migration report includes:

- source row counts and ID/date coverage;
- source and transformed hashes;
- HTML parser repairs;
- unsupported elements, attributes, and legacy classes;
- fallback/unknown blocks;
- normalized visible-text differences;
- Unicode replacement characters and other encoding anomalies; and
- unapplied or rejected editorial corrections.

Editorial fixes live in a separately reviewed corrections manifest keyed by locale and reading ID. Source databases remain unchanged.

### 8.3 Content acceptance criteria

- Exactly 366 records per locale.
- IDs are the contiguous set `1–366`.
- Every locale has 366 unique `MM-DD` keys, including `02-29`.
- Both locales have the same ID-to-date mapping.
- No title or body is blank.
- Duplicate titles remain distinct records.
- No scripts, event handlers, unsafe URLs, or remote embedded resources survive.
- All parser repairs, fallback blocks, and source replacement characters appear in the report.
- Normalized visible text and inline emphasis order match the source unless an approved correction records the difference.
- Unexplained text loss, addition, or reordering fails the build.
- Re-running migration from unchanged sources produces byte-identical artifacts.

Known malformed English readings and Romanian encoding anomalies are release fixtures, not edge cases to skip.

## 9. Calendar behavior

- Resolve Today from the user's current local Gregorian calendar date.
- Look up Today by `MM-DD`; never mutate the source year or derive it from UTC.
- Re-evaluate Today at local midnight and when the page becomes visible after being backgrounded.
- Leap years expose all 366 readings.
- Non-leap years omit `02-29` from Today and the active archive sequence.
- Canonical IDs never shift after February 28.
- Previous/next navigation uses positions in the active sequence, not `id + 1` or `id - 1`.
- In a common year, February 28 advances directly to March 1.
- `/devotional/60` remains a valid direct link in non-leap years even though February 29 is absent from that year's archive.
- First/last-reading navigation is disabled at the boundary unless product later approves year wrapping.

## 10. Search

Generate a compact versioned search index for each locale at build time. Load the index when Search is entered rather than making it part of the smallest application shell.

Indexed fields:

- title, with highest weight;
- visible body text;
- approved aliases;
- localized month names and abbreviations; and
- stable ID/date metadata for result navigation.

Query handling:

- trim and collapse whitespace;
- Unicode normalize;
- locale-aware case fold;
- generate a secondary diacritic-folded form for Romanian;
- do not interpolate input into a query language;
- return no results for blank or punctuation-only input; and
- do not send search terms to a server or analytics provider.

Results contain stable ID, localized title, localized date, and a matched-text excerpt. Rank title matches above body matches and use calendar order as the deterministic tie-breaker.

Search and result navigation must work offline.

## 11. Local state

### 11.1 IndexedDB stores

```text
preferences (singleton)
  locale
  theme: system | light | dark
  textScale
  onboardingCompletedAt
  schemaVersion

readingState (key: MM-DD)
  saved
  firstReadAt
  lastReadAt
  readCount

readingPosition (key: locale:readingId)
  blockAnchor
  scrollRatio
  updatedAt

appState (singleton)
  lastRoute
  lastReadingId
  lastSeenContentVersion
  dismissedUpdateVersion
```

Saved/read state uses `MM-DD` so equivalent English and Romanian readings remain saved/read when the locale changes. Reading position is locale-specific because translation lengths differ.

### 11.2 State rules

- Migrations are versioned, idempotent, and transactional.
- The app degrades gracefully when IndexedDB is unavailable.
- Immutable book content is not duplicated into IndexedDB.
- A reading is marked read only after meaningful engagement, not immediately on route load.
- The exact engagement threshold is a documented product rule and has unit/browser tests.
- Analytics never contain devotional text, saved selections, reading position, or search terms.
- A later export/import feature may provide state recovery without requiring accounts.

## 12. Design implementation

### 12.1 Visual character

The product is warm, quiet, literary, and unhurried. Devotional text remains verbatim. Interface language is brief, current, sentence case, and free of streaks, guilt, emoji, or promotional pressure.

The design system's warm paper, apricot, rose, lilac, sage, typography, spacing, shape, and motion concepts are the baseline. Production semantic tokens may be adjusted where contrast fails.

### 12.2 Required screens and states

- Welcome
- Today/Reading
- Archive with all twelve months
- Search
- Saved, including empty state
- Settings
- About/Preface
- Support
- Privacy
- Reader settings sheet
- Save confirmation
- Install guidance
- Offline notice
- Controlled update prompt
- Loading, error, zero-result, and invalid-route states

### 12.3 Components

Productionize the supplied component concepts:

- Core: Button, IconButton, Icon, Badge, Card
- Reading: PhotoScrim, DayHeading, VerseBlock, DevotionalBody, Attribution
- Navigation: AppBar, TabBar, ListRow
- Forms: Input, Switch, SegmentedControl, SettingRow
- Feedback: Sheet, Toast, EmptyState

Add:

- responsive application shell/navigation rail;
- reading action bar;
- previous/next navigator;
- search result and excerpt;
- twelve-month picker;
- theme and language controls;
- install/offline/update banners; and
- confirmation dialog.

Use semantic buttons, links, radio groups, dialogs, and landmarks. Do not implement clickable generic containers.

### 12.4 Typography and layout

- Reading/display family: approved self-hosted Newsreader or final replacement.
- Interface family: approved self-hosted Work Sans or final replacement.
- Reading sizes: 17px, 19px, and 20px.
- Reading line height: 1.68.
- Maximum prose measure: 34rem.
- Mobile screen gutter: 20px.
- Mobile reading gutter: 24px.
- Minimum control target: 44x44px.
- Mobile reading hero: approximately 280–330px.
- Paper panel overlaps hero by 24px with 28px upper corners.

Text remains ragged right, is never justified, and is not automatically hyphenated.

### 12.5 Responsive behavior

- `320–599px`: single column and fixed safe-area-aware bottom navigation.
- `600–899px`: centered reading/list content with bounded widths.
- `900–1199px`: compact persistent navigation rail.
- `1200px+`: labeled navigation sidebar and centered content; prose remains at 34rem.
- Landscape reduces hero height rather than hiding content.
- Sticky chrome must not obscure focused controls, anchors, or scroll targets.

### 12.6 Theme and localization

Dark mode uses warm charcoal/brown semantic surfaces, not pure black or the legacy cool blue-grey. Every surface, text, border, glass, shadow, scrim, action, focus, and status token has explicit light/dark mappings.

Interface messages exist in English and Romanian catalogs. Dates/months use `Intl`. UI strings are not assembled from English fragments. Controls tolerate at least 30% text expansion. Romanian diacritics are verified in selected fonts. Locale changes preserve the same reading/date.

### 12.7 Asset approval gates

Before release, approve and document:

- scenic photography and license provenance;
- type-only wordmark versus commissioned logo;
- master/maskable/monochrome app icons and favicon;
- self-hosted font licenses and Romanian glyph support;
- self-hosted icon subset and license; and
- publisher, translation, preface, attribution, and sharing rights.

The legacy ocean image may be used only after provenance and art-direction approval.

## 13. Accessibility

Target WCAG 2.2 AA.

- All interactive targets are at least 44x44px.
- Keyboard focus is visible and not obscured by sticky chrome.
- Focus indicator contrast is at least 3:1 against adjacent colors.
- Each route has semantic landmarks and one logical `h1`.
- Reading order matches visual order.
- Icon-only controls have localized accessible names and state.
- Current navigation uses `aria-current="page"`.
- Save controls expose pressed state.
- Sheets are named modal dialogs with focus trap, inert background, Escape close, and focus restoration.
- Toasts and search status use polite announcements and do not steal focus.
- Selected, read, saved, and Today states do not rely on color alone.
- Content remains usable at 200% zoom and the largest reader text setting.
- Reduced-motion mode removes decorative movement.
- Hero contrast is validated for every approved image crop.

## 14. PWA and offline behavior

### 14.1 Install contract

- HTTPS in production
- `display: standalone`
- scope `/`
- start URL `/today`
- standard and maskable icons
- theme/background colors for both themes
- safe-area CSS
- locally hosted fonts and icons
- no core interface dependency on a CDN

### 14.2 Cache classes

```text
dc-shell-{buildId}
dc-content-{contentVersion}
dc-runtime
```

- Hashed JS/CSS/fonts/icons: cache-first and immutable.
- Versioned content/search indexes: cache-first.
- Navigations: network-first with a short timeout.
- Failed product navigation: offline app shell resolving the requested route from local content.
- External pages: never silently stored as product content.

Do not precache hundreds of duplicate devotional HTML pages. Precache the application shell and compact full-book artifacts while continuing to serve generated HTML online for search engines and sharing.

### 14.3 Update lifecycle

1. Download new worker/content into new cache names.
2. Leave the worker waiting while a reading is active.
3. Show a quiet Update available action.
4. Persist reading position before activation.
5. Activate after user confirmation or when no active client can be interrupted.
6. Remove obsolete caches after activation.
7. Preserve IndexedDB state through application/content updates.

Never force a mid-reading reload.

## 15. Platform capability boundary

Screens depend on capability contracts rather than detecting native/web mode throughout the codebase.

```text
ShareCapability
  shareOrCopy(title, text, url)

InstallCapability
  canPrompt
  prompt()
  getInstructions()

StorageCapability
  estimate()
  requestPersistence()

ExternalLinkCapability
  open(url)

NotificationCapability
  getPermission()
  requestPermission()
  scheduleDaily()
  cancel()

HapticsCapability
  selection()
  success()

AppInfoCapability
  version()
  build()
```

The browser adapter uses Web Share, Clipboard, storage, install-prompt events, and normal links with fallbacks. A later Capacitor adapter uses native plugins.

The native projects add only bootstrap/configuration, native capability implementations, links, icons/splash screens, safe areas, store permissions, and packaging.

## 16. Privacy, security, and analytics

- Sanitize all migrated HTML at build time and treat generated content as untrusted until validation passes.
- Apply a restrictive Content Security Policy suitable for self-hosted assets.
- No devotional text, selected passages, search queries, saved IDs, or reading position enters analytics.
- Do not collect location.
- Contact/support data handling must match the published privacy policy.
- Refresh the privacy policy before analytics, notifications, or a revised support form ships.
- Record an explicit analytics event allowlist and retention policy before enabling telemetry.
- Dependencies and generated artifacts are reviewed in continuous integration.

## 17. Quality requirements

### 17.1 Automated coverage

Content contracts:

- record and date coverage;
- locale alignment;
- source/output text fidelity;
- sanitizer allowlist;
- deterministic hashes;
- anomaly disposition; and
- search-index coverage.

Unit tests:

- Gregorian leap rules, including century exceptions;
- February and year boundaries;
- local Today calculation across timezone/DST changes;
- previous/next active sequence;
- locale/diacritic search normalization;
- local-state migrations;
- read engagement threshold;
- share/copy fallback; and
- platform-adapter contracts.

Browser tests in Chromium, WebKit, and Firefox:

- Welcome and returning-user Today;
- direct permalink refresh;
- archive/month navigation;
- bilingual search;
- saved/read persistence;
- preference persistence;
- offline startup/navigation;
- offline direct reading URL;
- controlled update and position retention;
- share fallback; and
- invalid-route 404.

### 17.2 Manual coverage

- VoiceOver and TalkBack
- keyboard only
- 200% zoom
- enlarged reader text
- installed iOS PWA
- installed Android PWA
- approved light/dark screenshots at 320x568, 390x844, 768x1024, 1024x768, and 1440x900

### 17.3 Performance targets

At the 75th percentile:

- LCP <= 2.5 seconds
- INP <= 200 milliseconds
- CLS <= 0.1

The core reading experience must remain responsive on representative lower-end mobile hardware.

## 18. Delivery stages and commit boundaries

1. **Architecture/spec baseline**  
   Technical spec, feature matrix, acceptance criteria.

2. **First visual slice**  
   Responsive Today reading with real content and semantic foundation.

3. **Content proof**  
   Converter/schema/report plus approximately ten structurally diverse readings in both languages.

4. **Full content migration**  
   Validated pipeline, all 732 translations, search indexes, checksums, anomaly report.

5. **Reader/routes**  
   Today, permalink, previous/next, metadata, and leap handling.

6. **Archive/Search/Saved**  
   Each feature in a focused commit.

7. **Settings/supporting pages**  
   Locale, theme, text size, Welcome, About, Support, Privacy.

8. **PWA hardening**  
   Manifest, offline shell, update UX, install/storage behavior.

9. **Release qualification**  
   Cross-browser, accessibility, content, offline-upgrade, and performance tests.

Every feature commit must pass formatting, type checking, relevant tests, and a production build. Generated bulk content is committed separately from converter tooling to keep review practical.

## 19. Open product decisions

These decisions do not block the first content/architecture work but must be resolved before release:

1. Final font and icon approvals.
2. Type-only wordmark versus final logo.
3. Photography set and licensing.
4. Publisher support destination and whether payments occur on the web.
5. Exact meaningful-engagement rule for marking a reading read.
6. Whether reading-state export/import belongs in version 1 or a later release.
7. Disposition of known Romanian replacement characters.
8. Final support/contact and privacy ownership.

## 20. Initial implementation checkpoint

The repository has been initialized with the Sites-compatible web scaffold. The first product slice is the August 24 reading, using the approved warm palette, overlapped paper reading surface, responsive reading measure, safe-area-aware navigation, semantic actions, and real legacy content.

The next implementation checkpoint is the bilingual content-migration proof. It is the highest-risk dependency and must be validated before bulk feature development.
