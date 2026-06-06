# Implementation Plan: CampaignHub (Promo Management)

## Overview

This plan implements CampaignHub in **TypeScript** following the design's strict separation of a pure, I/O-free domain core from infrastructure and a component-based React frontend.

The build order is deliberately domain-core-first: the state machines, calculation service, validation engine, access policy, notification derivation, ordering/filtering/aggregation, calendar overlap logic, and color registry are pure functions, so they can be exhaustively property-tested before any database, network, or UI exists. Each of the design's 45 correctness properties becomes a single property-based test (minimum 100 iterations, real PBT library `fast-check`, tagged `Feature: campaign-hub, Property N: ...`) placed next to the code it validates. Infrastructure (persistence, typed API + access-control middleware, auth/session/lockout, scheduler tick, broadcast delivery) is layered on top of the verified core, and the frontend modules are built last, one module per sidebar tab, consuming the same shared derivations and color registry.

Tasks marked `*` are optional test tasks. Core implementation tasks are never optional. There is no orphaned code: every module is wired into an API endpoint, scheduler job, or frontend module by the end of the plan.

## Tasks

- [x] 1. Set up project structure, tooling, and shared domain types
  - Initialize a TypeScript monorepo-style layout with `domain/` (pure core), `infra/` (persistence, auth, scheduler, delivery), `api/` (typed endpoints + middleware), and `web/` (React modules)
  - Configure strict TypeScript, a test runner (Vitest/Jest), and the `fast-check` property-based testing library
  - Define shared enums and literal types in `domain/types.ts`: `Role`, `CampaignStatus`, `CampaignStep`, `CampaignCategory`, `BannerStatus`, `IGStoryStatus`, `HostLiveStatus`, `AdsCPASStatus`, `TaskStatus`, and the core entity interfaces (Campaign, CampaignScheme, PromoOption, CampaignAudit, asset types, Store, ChatBroadcast, BroadcastDelivery, Notification, Task, MasterDataRecord, Session)
  - _Requirements: 9.1, 3.6, 23.1_

- [x] 2. Implement the presentation color registry (pure)
  - [x] 2.1 Implement the color registry module
    - Create `domain/colorRegistry.ts` mapping each of the five `CampaignStatus` values and each of the six `CampaignCategory` values to one distinct pastel color, with a pure `colorFor(kind, value)` lookup
    - Guarantee no two values within a set share a color
    - _Requirements: 23.3, 23.4, 15.4_
  - [x]* 2.2 Write property test for color injectivity
    - **Property 44: Status and category colors are injective within each set**
    - **Validates: Requirements 23.3**
  - [x]* 2.3 Write property test for color lookup purity
    - **Property 45: Color lookup is a pure function of the value**
    - **Validates: Requirements 23.4, 15.4**

- [x] 3. Implement the access policy (pure)
  - [x] 3.1 Implement `AccessPolicy` with `isPermitted` and `permittedModules`
    - Create `domain/accessPolicy.ts` encoding the SPV / Admin / null policy map and per-module permitted-action sets
    - Provide a pure `applyGuarded(state, role, action, op)` helper that returns the unchanged state when the action is not permitted (no partial effect)
    - _Requirements: 1.3, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x]* 3.2 Write property test for permission decisions
    - **Property 1: Permission decisions match the policy exactly**
    - **Validates: Requirements 1.3, 1.7, 2.1, 2.2, 2.4**
  - [x]* 3.3 Write property test for denied actions causing no state change
    - **Property 2: Denied actions cause no state change**
    - **Validates: Requirements 2.3**
  - [x]* 3.4 Write property test for permitted-scope projection (sidebar + dashboard)
    - **Property 3: Sidebar and dashboard data reflect only permitted scope**
    - **Validates: Requirements 2.5, 4.5**

- [x] 4. Implement the session and lockout domain (pure)
  - [x] 4.1 Implement session expiry and lockout decision functions
    - Create `domain/session.ts` with `isExpired(lastActivity, now)` (>= 30 min) and `lockoutState(attempts, now)` enforcing 5-consecutive-failure lockout for 15 minutes with reset on success
    - _Requirements: 1.5, 1.6_
  - [x]* 4.2 Write property test for inactivity expiry
    - **Property 4: Inactivity expiry is exact**
    - **Validates: Requirements 1.5**
  - [x]* 4.3 Write property test for lockout after five failures
    - **Property 5: Lockout after five consecutive failures**
    - **Validates: Requirements 1.6**

- [x] 5. Implement the Calculation_Service (pure)
  - [x] 5.1 Implement `calculate(inputs)` for cost, margin, and NPM
    - Create `domain/calculation.ts` computing `totalCost`, `margin = effectiveRevenue - totalCost`, `npm = margin / effectiveRevenue` (or `"undefined"` when revenue is zero), and the `warning` flag
    - _Requirements: 7.1, 7.2, 7.5_
  - [x]* 5.2 Write property test for the calculation formula
    - **Property 19: Calculation matches the cost/margin/NPM formula**
    - **Validates: Requirements 7.1**
  - [x]* 5.3 Write property test for deterministic recompute
    - **Property 20: Calculation is deterministic (idempotent recompute)**
    - **Validates: Requirements 7.2**
  - [x]* 5.4 Write property test for the warning flag
    - **Property 21: Warning flag iff NPM is negative or undefined**
    - **Validates: Requirements 7.5**

- [x] 6. Implement the Validation Engine (pure)
  - [x] 6.1 Implement the shared field-constraint evaluator
    - Create `domain/validation.ts` returning `{ field, violationReason }[]`, covering scheme fields (name 1..100, category, timeline order, >=1 store, >=1 promo), promo-option bounds (1..20, discount int 0..100), calculation input ranges, schedule date order, master-data required fields, and the accept-iff-all-satisfied contract that retains entered values
    - Implement `newCampaignFromScheme(scheme)` returning a campaign initialized to status `Menunggu` / step `BuatSkema`
    - Implement a pure `previewFor(formState)` derivation for the real-time scheme preview
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 7.6, 8.4, 18.6, 20.4, 20.5, 21.4, 22.1, 22.2, 22.3, 22.4_
  - [x]* 6.2 Write property test for acceptance/violation reporting
    - **Property 22: Acceptance iff all constraints satisfied, with complete violation reporting**
    - **Validates: Requirements 5.3, 5.4, 5.5, 7.6, 8.4, 18.6, 20.4, 20.5, 21.4, 22.1, 22.3, 22.4**
  - [x]* 6.3 Write property test for new-scheme initial state
    - **Property 23: New valid scheme starts at Menunggu / BuatSkema**
    - **Validates: Requirements 5.6**
  - [x]* 6.4 Write property test for promo-option bounds
    - **Property 24: Promo option count never exceeds twenty**
    - **Validates: Requirements 5.2, 5.7, 5.3**
  - [x]* 6.5 Write property test for preview purity
    - **Property 25: Real-time preview is a pure function of current values**
    - **Validates: Requirements 22.2**

- [x] 7. Implement the Campaign state machine (pure)
  - [x] 7.1 Implement `transition(state, event)` with audit and notification effects
    - Create `domain/campaignStateMachine.ts` encoding only the legal transitions (Submit, Approve-with-calc, Schedule, ReviewApprove, ReviewReject, TimerStart, TimerEnd), emitting an `AuditRecord` effect on every success and notification effects for submission and rejection
    - Reject any undefined transition with state unchanged; make `Selesai` terminal; gate Approve on completed calculation; gate Submit on a complete scheme
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8, 9.1, 9.2, 9.3, 9.4_
  - [x]* 7.2 Write property test for defined transitions
    - **Property 6: Defined transitions yield the specified target**
    - **Validates: Requirements 6.1, 8.1, 8.5, 8.6, 8.7, 8.8**
  - [x]* 7.3 Write property test for rejected undefined transitions
    - **Property 7: Undefined transitions are rejected with state unchanged**
    - **Validates: Requirements 6.4, 9.2**
  - [x]* 7.4 Write property test for legal status invariant
    - **Property 8: Status is always one of the five legal values**
    - **Validates: Requirements 9.1**
  - [x]* 7.5 Write property test for terminal Selesai
    - **Property 9: Selesai is terminal**
    - **Validates: Requirements 9.4**
  - [x]* 7.6 Write property test for audit on every successful transition
    - **Property 10: Every successful transition is audited**
    - **Validates: Requirements 9.3**
  - [x]* 7.7 Write property test for approval-requires-calculation
    - **Property 11: Approval requires completed calculation**
    - **Validates: Requirements 8.2**
  - [x]* 7.8 Write property test for submission-requires-complete-scheme
    - **Property 12: Submission requires a complete scheme**
    - **Validates: Requirements 6.3**

- [x] 8. Checkpoint - core economics and campaign lifecycle
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement the Asset state machines (pure)
  - [x] 9.1 Implement Banner, IG Story, Host Live, and Ads CPAS transition functions
    - Create `domain/assetStateMachines.ts` with one pure transition function per asset type over closed status sets, requiring an existing associated campaign at creation, routing SPV rejections back with an Admin notification, guarding schedule events on strictly-future times, and guarding Ads CPAS setup / IG Story upload on completeness
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  - [x]* 9.2 Write property test for asset creation requiring a campaign
    - **Property 13: Asset creation requires an existing associated campaign**
    - **Validates: Requirements 11.1, 11.8, 12.1, 12.6, 13.1, 14.1**
  - [x]* 9.3 Write property test for defined asset transitions
    - **Property 14: Defined asset transitions yield the specified next status**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.6, 12.2, 12.3, 13.2, 13.3, 13.4, 13.5, 14.2, 14.3, 14.4**
  - [x]* 9.4 Write property test for rejected undefined asset transitions
    - **Property 15: Undefined asset transitions are rejected within a closed status set**
    - **Validates: Requirements 11.10, 12.5, 13.8**
  - [x]* 9.5 Write property test for rejection routing and notification
    - **Property 16: Rejection routes back and notifies**
    - **Validates: Requirements 11.7, 12.4, 13.6, 14.6**
  - [x]* 9.6 Write property test for future-time scheduling guard
    - **Property 17: Future-time guard on scheduling**
    - **Validates: Requirements 11.9, 13.7**
  - [x]* 9.7 Write property test for setup/upload completeness guards
    - **Property 18: Setup and upload completeness guards**
    - **Validates: Requirements 14.5, 12.7**

- [x] 10. Implement Notification Derivation (pure)
  - [x] 10.1 Implement `notificationsFor(event, recipients)` and unread-count helpers
    - Create `domain/notifications.ts` producing exactly one notification per responsible recipient for approval/asset-status events, deadline reminders deduped by `(taskId, deadline)`, an `unreadCount` derivation, and an idempotent `markRead` operation
    - _Requirements: 6.2, 8.8, 17.1, 17.2, 17.3, 17.4, 17.6, 17.7_
  - [x]* 10.2 Write property test for one-notification-per-recipient
    - **Property 26: Triggering events create exactly one notification per recipient**
    - **Validates: Requirements 6.2, 8.8, 17.1, 17.4**
  - [x]* 10.3 Write property test for deduped deadline reminders
    - **Property 27: Deadline reminders fire once at 24h before, with dedup**
    - **Validates: Requirements 17.2, 17.3**
  - [x]* 10.4 Write property test for unread count
    - **Property 28: Unread count equals the number of unread notifications**
    - **Validates: Requirements 17.6**
  - [x]* 10.5 Write property test for mark-read decrement and idempotency
    - **Property 29: Marking read decrements by one and is idempotent**
    - **Validates: Requirements 17.7**

- [x] 11. Implement ordering, filtering, and aggregation (pure)
  - [x] 11.1 Implement sort, filter, grouping, and bounded-list derivations
    - Create `domain/collections.ts` with sort-by-key (deadline, status, calc columns, recency), filter-by-predicate (status, date-range overlap), inverted-range rejection, per-status/per-category/per-asset-type group counts, dashboard summary-card counts, and bounded upcoming/recent lists (max 10, start on/after today)
    - _Requirements: 4.1, 4.2, 7.3, 17.5, 18.1, 18.2, 19.1, 19.2, 19.3, 19.4, 19.5_
  - [x]* 11.2 Write property test for sorting
    - **Property 30: Ordering produces a correctly sorted sequence**
    - **Validates: Requirements 4.2, 7.3, 17.5, 18.1, 18.2, 19.3**
  - [x]* 11.3 Write property test for filtering
    - **Property 31: Filtering returns exactly the matching members**
    - **Validates: Requirements 7.3, 18.2, 19.2**
  - [x]* 11.4 Write property test for inverted-range rejection
    - **Property 32: Date-range filter rejects inverted ranges**
    - **Validates: Requirements 19.5**
  - [x]* 11.5 Write property test for group counts
    - **Property 33: Group counts are correct and exhaustive**
    - **Validates: Requirements 4.1, 19.1, 19.4**
  - [x]* 11.6 Write property test for bounded lists
    - **Property 34: Bounded lists respect their limits**
    - **Validates: Requirements 4.2**

- [x] 12. Implement workflow-visualization and navigation derivations (pure)
  - [x] 12.1 Implement step-classification and active-module derivations
    - Create `domain/workflowView.ts` classifying each campaign step (and banner stage) as completed/active/upcoming relative to the current step, and a `navigationState` derivation guaranteeing exactly one active module and one active sidebar entry
    - _Requirements: 3.3, 3.4, 10.2, 10.3, 10.5, 10.6_
  - [x]* 12.2 Write property test for step classification
    - **Property 35: Step classification matches the current step**
    - **Validates: Requirements 10.2, 10.3, 10.5, 10.6**
  - [x]* 12.3 Write property test for single active module/entry
    - **Property 36: Exactly one active module and one active sidebar entry**
    - **Validates: Requirements 3.3, 3.4**

- [x] 13. Implement calendar overlap logic (pure)
  - [x] 13.1 Implement day-overlap and selected-date-detail derivations
    - Create `domain/calendar.ts` with `occursOnDay(item, day)` (inclusive start/end overlap for month/week/day periods) and a `detailFor(date, items)` derivation returning name, category, status, and timeline per item
    - _Requirements: 8.3, 13.4, 15.1, 15.2, 15.3, 15.5, 15.6_
  - [x]* 13.2 Write property test for day overlap
    - **Property 37: An item appears on a day iff its schedule overlaps that day**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.6, 8.3, 13.4**
  - [x]* 13.3 Write property test for selected-date detail completeness
    - **Property 38: Selected-date detail completeness**
    - **Validates: Requirements 15.5**

- [x] 14. Implement store-management domain (pure)
  - [x] 14.1 Implement store grouping, assignment guard, and broadcast result derivation
    - Create `domain/stores.ts` partitioning stores into active/non-active/attention-needed, a dedup-guarded campaign assignment, and a `buildBroadcastResult(request, deliveryOutcomes)` producing exactly one delivery record per selected store and surfacing the failed set, rejecting empty selections while retaining the message
    - _Requirements: 16.1, 16.2, 16.4, 16.5, 16.7, 16.8_
  - [x]* 14.2 Write property test for store-group partition
    - **Property 39: Store status groups partition the store set**
    - **Validates: Requirements 16.1**
  - [x]* 14.3 Write property test for dedup-guarded assignment
    - **Property 40: Campaign assignment is dedup-guarded**
    - **Validates: Requirements 16.2, 16.7**
  - [x]* 14.4 Write property test for broadcast delivery records
    - **Property 41: Broadcast produces exactly one delivery record per selected store**
    - **Validates: Requirements 16.4, 16.5, 16.8**

- [x] 15. Implement master-data domain rules (pure)
  - [x] 15.1 Implement deletion-reference guard and unique-identifier guard
    - Create `domain/masterData.ts` rejecting deletion of referenced records (identifying referencing items) while allowing unreferenced deletion, and rejecting create/edit that duplicates an existing unique identifier
    - _Requirements: 20.3, 20.4, 20.6_
  - [x]* 15.2 Write property test for reference-guarded deletion
    - **Property 42: Referenced records cannot be deleted; unreferenced can**
    - **Validates: Requirements 20.3, 20.6**
  - [x]* 15.3 Write property test for unique-identifier guard
    - **Property 43: Unique identifiers stay unique**
    - **Validates: Requirements 20.4**

- [x] 16. Checkpoint - full pure domain core verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Implement the persistence layer
  - [x] 17.1 Define the relational schema and repositories
    - Create `infra/db/schema.ts` and migrations for campaigns, promo options, assets, audit logs, stores, store categories, broadcasts/deliveries, notifications, tasks, master data, sessions; implement typed repositories with relational-integrity reference checks backing Requirement 20
    - _Requirements: 5.6, 7.4, 8.3, 9.3, 16.2, 18.3, 20.1, 20.2, 20.3, 20.6_
  - [x]* 17.2 Write integration tests for repository persistence and reference checks
    - Cover create/edit/delete round trips and referenced-record deletion rejection
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 18. Implement authentication, session, and lockout infrastructure
  - [x] 18.1 Implement the session store and Authentication_Service
    - Create `infra/auth/` wiring the pure session/lockout decisions into a session store: credential verification, session establish/terminate, 30-minute inactivity expiry, and 5-failure/15-minute lockout
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_
  - [x]* 18.2 Write integration tests for sign-in/sign-out and lockout
    - Verify session establishment/termination within the timing budget and lockout enforcement
    - _Requirements: 1.1, 1.4, 1.6_

- [x] 19. Implement the typed API with access-control middleware
  - [x] 19.1 Implement access-control middleware
    - Create `api/middleware/accessControl.ts` invoking the pure `AccessPolicy` server-side, denying unauthorized/unauthenticated requests with no data change and an insufficient-permissions error
    - _Requirements: 1.7, 2.1, 2.2, 2.3, 2.4_
  - [x] 19.2 Implement Campaign and calculation endpoints
    - Wire `api/campaign.ts` to the campaign state machine and calculation service: create scheme, submit, calculate, inline status update, approve, schedule, review approve/reject; persist new state, audit records, and derived notifications
    - _Requirements: 5.6, 6.1, 6.2, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 8.5, 8.8, 9.3_
  - [x] 19.3 Implement Asset endpoints
    - Wire `api/assets.ts` to the four asset state machines for request/upload/review/approve/reject/schedule/setup, persisting state, audit, and notifications
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 13.6, 14.1, 14.2, 14.3, 14.4, 14.6_
  - [x] 19.4 Implement Store, Notification, Task, Report, and Master Data endpoints
    - Wire `api/stores.ts`, `api/notifications.ts`, `api/tasks.ts`, `api/reports.ts`, `api/masterData.ts` to the corresponding pure domain modules (grouping/assignment/broadcast, ordering/unread/mark-read, task status update, aggregation/date-range filter, reference/unique guards)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 17.5, 17.6, 17.7, 18.1, 18.3, 19.1, 19.2, 19.4, 20.1, 20.2, 20.3, 20.6_
  - [x]* 19.5 Write integration tests for access-control denial and inline persistence
    - Verify denied actions change no data and inline calculation/task status persists
    - _Requirements: 2.3, 7.4, 18.3_

- [x] 20. Implement the scheduler tick and broadcast delivery
  - [x] 20.1 Implement the scheduler tick job
    - Create `infra/scheduler/tick.ts` running at a ≤30s interval, evaluating due campaign go-live/end, banner go-live, host-live session start, and 24h deadline reminders through the same pure state machines and notification derivation, recording the actor as "System" and guarding with dedup keys against overlapping ticks
    - _Requirements: 8.6, 8.7, 11.6, 13.5, 17.2, 17.3, 9.3_
  - [x] 20.2 Implement broadcast delivery
    - Create `infra/delivery/broadcast.ts` delivering a Chat_Broadcast to each selected store and recording per-store delivered/failed status, surfacing failures via the pure store result builder
    - _Requirements: 16.4, 16.8_
  - [x]* 20.3 Write integration test for scheduled transitions within 60 seconds
    - Drive a controllable clock to verify due campaigns/assets advance and reminders fire within the SLA without double-application
    - _Requirements: 8.6, 8.7, 11.6, 13.5, 17.2_

- [x] 21. Checkpoint - backend wired end to end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Implement frontend shared shell
  - [x] 22.1 Implement the app shell, sidebar navigation, and theme
    - Create `web/shell/` with role-filtered fixed-left `Sidebar_Navigation` in the fixed module order, single active highlight, single-module main content area, light-mode pastel theme consuming `colorRegistry`, Bahasa Indonesia strings, and module-load error handling
    - Consume the pure `navigationState` and access `permittedModules` derivations
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 23.1, 23.2, 23.4_
  - [x] 22.2 Implement the shared validation/preview form layer
    - Create `web/forms/` invoking the pure validation engine for ≤500ms validation, error retention, and real-time scheme preview
    - _Requirements: 22.1, 22.2, 22.3, 22.4_
  - [x]* 22.3 Write component tests for sidebar order, role filtering, and single-active behavior
    - _Requirements: 3.1, 3.2, 3.4, 2.5_

- [x] 23. Implement campaign-related frontend modules
  - [x] 23.1 Implement the Campaign module
    - Create `web/modules/Campaign/` with the scheme creation form, drag-and-drop promo-option sliders (max 20, 0..100 step 1), real-time preview, calculation table with sort/filter and inline status edit, approval/scheduling, and review approve/reject actions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.8_
  - [x] 23.2 Implement the Workflow module
    - Create `web/modules/Workflow/` rendering the five-step campaign diagram and per-banner stage progress using the `workflowView` derivation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 23.3 Implement the Dashboard module
    - Create `web/modules/Dashboard/` with role-scoped summary cards, calendar widget, bounded upcoming-campaigns and recent-notifications lists, today's summary, workflow visualization, empty states, and data-load error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 23.4 Implement the Calendar module
    - Create `web/modules/Calendar/` with month (default)/week/day views, category color-coding, multi-day spanning via `occursOnDay`, selected-date detail, and empty-period state
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  - [x]* 23.5 Write component tests for slider bounds, calendar rendering, and workflow diagram
    - _Requirements: 5.2, 10.2, 15.1, 15.6_

- [x] 24. Implement asset and operational frontend modules
  - [x] 24.1 Implement the Banner, IG Story, Host Live, and Ads CPAS modules
    - Create `web/modules/Banner/`, `web/modules/IGStory/`, `web/modules/HostLive/`, `web/modules/AdsCPAS/` driving each asset workflow with upload/review/approve/reject/schedule/setup actions and validation messages
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7, 11.8, 11.9, 12.1, 12.2, 12.3, 12.4, 12.6, 12.7, 13.1, 13.2, 13.3, 13.4, 13.6, 13.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  - [x] 24.2 Implement the Toko (Store) module
    - Create `web/modules/Toko/` with status-grouped stores, campaign assignment, category assignment, chat-broadcast composer (1..1000 chars, 1..500 stores), per-store delivery status, and empty-group states
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
  - [x] 24.3 Implement the Tugas Saya, Notifikasi, Laporan, Master Data, and Pengaturan modules
    - Create the remaining modules: task table (sort/filter, status update, empty state, persist-failure handling, linked-item navigation); notification list (recency order, unread count, mark-read); reports (status/category and asset counts, date-range filter with inverted-range rejection, empty state); master-data CRUD (required-field, unique, and reference guards); settings (account info, preference update, session application, invalid/backend-unavailable handling)
    - _Requirements: 17.5, 17.6, 17.7, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 21.1, 21.2, 21.3, 21.4, 21.5_
  - [x]* 24.4 Write component tests for asset workflow actions and operational module empty states
    - _Requirements: 12.7, 14.5, 16.6, 18.5, 19.6_

- [x] 25. Final checkpoint - full integration
  - [x] 25.1 Wire all modules into the shell and verify end-to-end flows with automated tests
    - Connect every module to its API endpoints, confirm role-based sidebar/data scoping, and confirm no orphaned modules remain
    - _Requirements: 2.5, 3.3, 4.5_
  - [x] 25.2 Final checkpoint - ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- The pure domain core (tasks 2–16) is built and property-tested before any infrastructure or UI, so all 45 correctness properties are verified against I/O-free functions.
- Each of the 45 design properties maps to exactly one property-based test sub-task, annotated with its property number and the requirements it validates. Every PBT uses `fast-check`, runs a minimum of 100 iterations, and is tagged `Feature: campaign-hub, Property N: ...`.
- Generators must cover the edge cases called out in the design: empty collections, promo counts 0/1/20/21, zero revenue, negative margins, whitespace/empty strings, inverted date ranges, past/future schedule times, 500-store / 1000-char maxima, and all enum values.
- Infrastructure (tasks 17–20) reuses the same pure functions for both user-initiated and scheduler-initiated transitions, recording "System" as the actor for timer-driven changes.
- Frontend modules (tasks 22–24) consume the shared color registry and pure derivations so presentation matches verified domain logic.
- Checkpoints ensure incremental validation at each major boundary.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "4.1", "5.1", "6.1", "13.1", "14.1", "15.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.2", "4.3", "5.2", "5.3", "5.4", "6.2", "6.3", "6.4", "6.5", "7.1", "13.2", "13.3", "14.2", "14.3", "14.4", "15.2", "15.3"] },
    { "id": 2, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "9.1", "10.1", "11.1", "12.1"] },
    { "id": 3, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "10.2", "10.3", "10.4", "10.5", "11.2", "11.3", "11.4", "11.5", "11.6", "12.2", "12.3"] },
    { "id": 4, "tasks": ["17.1", "18.1"] },
    { "id": 5, "tasks": ["17.2", "18.2", "19.1"] },
    { "id": 6, "tasks": ["19.2", "19.3", "19.4"] },
    { "id": 7, "tasks": ["19.5", "20.1", "20.2"] },
    { "id": 8, "tasks": ["20.3", "22.1", "22.2"] },
    { "id": 9, "tasks": ["22.3", "23.1", "23.2", "23.3", "23.4", "24.1", "24.2", "24.3"] },
    { "id": 10, "tasks": ["23.5", "24.4", "25.1"] }
  ]
}
```
