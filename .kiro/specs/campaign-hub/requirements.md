# Requirements Document

## Introduction

CampaignHub (Promo Management) is a marketplace campaign management web application that coordinates the creation, calculation, approval, scheduling, and execution of promotional campaigns and their supporting assets (banners, Instagram stories, host live sessions, and CPAS ads). The application serves two primary roles: Supervisors (SPV), who create campaign schemes, submit campaigns, review execution, and approve; and Admins, who calculate campaign economics, set marketplace strategies, prepare assets, execute tasks in the marketplace, and update progress.

The application is organized into modular tabs accessed through a left sidebar: Dashboard, Calendar (Kalender), Campaign, Workflow, Banner, Toko (Store), IG Story, Host Live, Ads CPAS, Tugas Saya (My Tasks), Notifikasi (Notifications), Laporan (Reports), Master Data, and Pengaturan (Settings). The user interface is presented in Bahasa Indonesia using a light-mode, pastel, minimalistic professional design. Access to features and actions is governed by role-based access control between the SPV and Admin roles.

This document defines the functional and quality requirements for CampaignHub using EARS patterns and INCOSE quality rules.

## Glossary

- **System**: The CampaignHub web application as a whole, including its frontend and backend components.
- **Authentication_Service**: The component responsible for verifying user identity and establishing authenticated sessions.
- **Access_Control_Service**: The component that enforces role-based permissions for SPV and Admin roles.
- **SPV**: Supervisor user role responsible for creating campaign schemes, submitting campaigns, reviewing execution, and approving campaigns.
- **Admin**: Administrator user role responsible for setting marketplace strategies, calculating campaign economics, preparing assets, executing marketplace tasks, and updating progress.
- **Campaign**: A promotional initiative defined by a scheme, schedule, target stores, and one or more promo options, progressing through defined status stages.
- **Campaign_Scheme**: The configurable definition of a campaign, including promo options, discounts, target stores, and timeline, created by an SPV.
- **Promo_Option**: An individual promotional configuration within a Campaign_Scheme (for example a discount percentage, bundle, or voucher) that can be added dynamically.
- **Campaign_Status**: The lifecycle stage of a Campaign, one of Menunggu (Waiting), Proses (Process), Review, Live, or Selesai (Done).
- **Campaign_Step**: One of the five ordered stages in the campaign flow: 1. Buat Skema (Create Scheme), 2. Submit, 3. Eksekusi (Execute), 4. Review, 5. Live.
- **Calculation_Service**: The component that computes campaign costs, margins, and Net Profit Margin (NPM) from scheme inputs.
- **NPM**: Net Profit Margin, a calculated percentage representing net profit relative to revenue for a Campaign.
- **Campaign_Category**: A classification used to color-code campaigns, one of Flash Sale, Brand Day, Payday, Mega Bonus, Weekend, or Lokal.
- **Asset**: A supporting deliverable for a campaign, namely a Banner, IG Story, Host Live session, or Ads CPAS advertisement.
- **Banner**: A visual marketing asset progressing through request, design, review, approval, schedule, and go-live stages.
- **IG_Story**: An Instagram story asset progressing through request, design, and approval stages.
- **Host_Live**: A live streaming session asset progressing through request, design, approval, scheduling, and hosting stages.
- **Ads_CPAS**: A Collaborative Performance Advertising Solution advertisement progressing through request, design, approval, and ad setup stages.
- **Asset_Status**: The lifecycle stage of an Asset within its respective workflow.
- **Store**: A marketplace storefront (Toko) that can be active or non-active and to which campaigns and assets are assigned.
- **Store_Category**: A classification assigned to a Store for organization and targeting.
- **Chat_Broadcast**: A message sent by an Admin to one or more Stores simultaneously.
- **Workflow_Visualization**: A graphical step-progress representation of a Campaign's or Asset's progression through its stages.
- **Dashboard**: The overview screen presenting summary cards, a calendar widget, upcoming campaigns, today's summary, a workflow diagram, and notifications.
- **Calendar**: The Kalender module presenting campaigns in month, week, and day views, color-coded by Campaign_Category and Campaign_Status.
- **Notification**: A system-generated message alerting a user to an approval request, task deadline, or asset status change.
- **Task**: A unit of work assigned to a user, displayed in the Tugas Saya module.
- **Report**: A generated summary of campaign and asset performance presented in the Laporan module.
- **Master_Data**: The set of reference data used across the application, including stores, categories, and configurable options.
- **Settings**: The Pengaturan module where users configure account and application preferences.
- **Sidebar_Navigation**: The persistent left-side navigation menu providing access to all modules.

## Requirements

### Requirement 1: Authentication and Session Management

**User Story:** As a user, I want to securely sign in to CampaignHub, so that I can access features appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits credentials that match a registered account, THE Authentication_Service SHALL, within 3 seconds, establish an authenticated session and grant access to the modules and actions permitted for the user's assigned role.
2. IF a user submits credentials that do not match a registered account, THEN THE Authentication_Service SHALL deny access, retain the user on the sign-in screen, and display an error message indicating the credentials are invalid.
3. WHILE a user has no active authenticated session, THE System SHALL restrict access to all modules except the sign-in screen.
4. WHEN an authenticated user requests to sign out, THE Authentication_Service SHALL, within 3 seconds, terminate the session and return the user to the sign-in screen.
5. WHEN an authenticated session remains inactive for 30 minutes, THE Authentication_Service SHALL terminate the session and require re-authentication.
6. IF a user submits invalid credentials for the same account on 5 consecutive attempts, THEN THE Authentication_Service SHALL lock the account for 15 minutes and deny further sign-in attempts for that account during the lockout period.
7. WHEN an authenticated user attempts to access a module or action not permitted for the user's assigned role, THE Access_Control_Service SHALL deny access and display an error message indicating the user has insufficient permissions.

### Requirement 2: Role-Based Access Control

**User Story:** As a system owner, I want access governed by role, so that SPV and Admin users can only perform actions permitted to their role.

#### Acceptance Criteria

1. WHEN an authenticated user assigned the SPV role requests to create Campaign_Schemes, submit Campaigns, review execution, or approve Campaigns, THE Access_Control_Service SHALL permit the requested action.
2. WHEN an authenticated user assigned the Admin role requests to set marketplace strategies, calculate Campaign economics, prepare Assets, execute marketplace tasks, or update progress, THE Access_Control_Service SHALL permit the requested action.
3. IF an authenticated user requests an action not permitted for the user's assigned role, THEN THE Access_Control_Service SHALL deny the action, perform no part of the requested action, leave all affected data unchanged, and display an error message indicating the user is not authorized to perform the action.
4. IF a request for a role-restricted action originates from a user who is not authenticated or who has no assigned role, THEN THE Access_Control_Service SHALL deny the action and display an error message indicating the user is not authorized to perform the action.
5. WHEN an authenticated user loads the application interface, THE Sidebar_Navigation SHALL display only the modules and actions permitted for the user's assigned role and SHALL omit all modules and actions not permitted for that role.

### Requirement 3: Sidebar Navigation and Module Layout

**User Story:** As a user, I want consistent left-sidebar navigation, so that I can move between modules efficiently.

#### Acceptance Criteria

1. THE Sidebar_Navigation SHALL display entries, subject to the permissions defined in Requirement 2, in the following top-to-bottom order: Dashboard, Calendar, Campaign, Workflow, Banner, Toko, IG Story, Host Live, Ads CPAS, Tugas Saya, Notifikasi, Laporan, Master Data, Pengaturan.
2. WHILE any module is displayed, THE Sidebar_Navigation SHALL remain displayed in a fixed position on the left side of the application.
3. WHEN a user selects a Sidebar_Navigation entry, THE System SHALL display the corresponding module in the main content area within 2 seconds, displaying exactly one module at a time.
4. WHILE a module is displayed, THE Sidebar_Navigation SHALL present the entry of the active module in a visual style distinct from all inactive entries, with exactly one entry indicated as active at a time.
5. IF a selected module fails to load, THEN THE System SHALL display an error message indicating the module could not be loaded and SHALL retain the previously displayed module.
6. THE System SHALL present all user-facing text in Bahasa Indonesia.

### Requirement 4: Dashboard Overview

**User Story:** As a user, I want a dashboard overview, so that I can see key metrics and upcoming activity at a glance.

#### Acceptance Criteria

1. WHEN a user opens the Dashboard, THE Dashboard SHALL display summary cards showing the count of active Campaigns (Campaigns with Campaign_Status Live), the count of pending Tasks assigned to the authenticated user, the count of approvals awaiting the authenticated user, and the count of Campaign and Asset deadlines scheduled for the current date.
2. WHEN a user opens the Dashboard, THE Dashboard SHALL display a calendar widget showing the current month, a list of up to 10 upcoming Campaigns (Campaigns whose scheduled start date is on or after the current date) ordered by start date ascending, a today's summary section listing Campaigns and Assets scheduled for the current date, a Campaign Workflow_Visualization, and up to 10 most recent Notifications for the authenticated user ordered from most recent to least recent.
3. WHEN a user loads or refreshes the Dashboard after underlying Campaign, Task, or Notification data has changed, THE Dashboard SHALL display the updated values within 3 seconds of the load or refresh.
4. WHEN a user selects an upcoming Campaign on the Dashboard, THE System SHALL display the corresponding Campaign details.
5. WHERE the authenticated user is assigned the SPV or Admin role, THE Dashboard SHALL display only the Campaigns, Tasks, approvals, and Notifications permitted for that role as defined in Requirement 2.
6. IF the Dashboard fails to retrieve Campaign, Task, or Notification data, THEN THE Dashboard SHALL display an error message indicating the data could not be loaded and SHALL retain any previously displayed values.
7. WHEN a user opens the Dashboard and a summary card or list has no corresponding records, THE Dashboard SHALL display that card with a count of zero or that list with an empty-state message indicating no items are available.

### Requirement 5: Campaign Scheme Creation

**User Story:** As an SPV, I want to create campaign schemes with manual input and drag-and-drop sliders, so that I can define promotional strategies flexibly.

#### Acceptance Criteria

1. WHEN an SPV opens the Campaign creation form, THE System SHALL provide required fields for Campaign name (1 to 100 characters), Campaign_Category, timeline start date, timeline end date, at least one target Store, and at least one Promo_Option.
2. WHEN an SPV adds a Promo_Option using the drag-and-drop slider control, THE System SHALL add the Promo_Option to the Campaign_Scheme, up to a maximum of 20 Promo_Options, and include it in the real-time preview within 1 second.
3. WHEN an SPV adjusts a Promo_Option slider value within the range 0 to 100 percent in increments of 1, THE System SHALL update the real-time preview to reflect the adjusted value within 1 second.
4. IF an SPV submits a Campaign_Scheme with one or more of the required fields defined in criterion 1 missing or empty, THEN THE System SHALL reject the submission, retain the entered values, and display a validation message identifying each missing field.
5. IF an SPV enters a timeline end date earlier than the timeline start date, THEN THE System SHALL reject the submission, retain the entered values, and display a validation message indicating the date order is invalid.
6. WHEN an SPV saves a Campaign_Scheme that satisfies all field constraints in criteria 1, 3, and 5, THE System SHALL persist the Campaign with Campaign_Status set to Menunggu.
7. IF an SPV attempts to add a Promo_Option when the Campaign_Scheme already contains 20 Promo_Options, THEN THE System SHALL reject the addition and display a message indicating the maximum of 20 Promo_Options has been reached.

### Requirement 6: Campaign Submission

**User Story:** As an SPV, I want to submit a campaign scheme to Admin, so that the campaign can be calculated and executed.

#### Acceptance Criteria

1. WHILE a Campaign is in Campaign_Status Menunggu and Campaign_Step Buat Skema, WHEN an SPV submits the Campaign, THE System SHALL advance the Campaign to Campaign_Step Submit and set Campaign_Status to Proses.
2. WHEN the System sets a Campaign's Campaign_Status to Proses upon submission, THE System SHALL create a Notification for the Admin role indicating the Campaign requires calculation.
3. IF an SPV attempts to submit a Campaign whose Campaign_Scheme is missing any required field (Campaign name, Campaign_Category, timeline start date, timeline end date, at least one target Store, or at least one Promo_Option), THEN THE System SHALL reject the submission, retain the Campaign at Campaign_Status Menunggu, and display a validation message identifying each missing field.
4. IF an SPV attempts to submit a Campaign that is not in Campaign_Status Menunggu, THEN THE System SHALL reject the submission, retain the current Campaign_Status, and display an error message indicating the Campaign cannot be submitted in its current status.

### Requirement 7: Campaign Calculation

**User Story:** As an Admin, I want to calculate campaign costs, margins, and NPM, so that I can assess campaign profitability before approval.

#### Acceptance Criteria

1. WHEN an Admin opens a submitted Campaign, THE Calculation_Service SHALL compute total cost, margin, and NPM from the Campaign_Scheme inputs within 3 seconds.
2. WHEN an Admin edits a calculation input value, THE Calculation_Service SHALL recompute total cost, margin, and NPM within 1 second.
3. THE System SHALL present Campaign calculations in a table supporting sorting and filtering by each displayed column, including total cost, margin, and NPM.
4. WHEN an Admin updates a status value inline within the calculation table, THE System SHALL persist the updated status within 3 seconds.
5. IF a calculation input produces a negative NPM or an NPM that is undefined because the revenue denominator is zero, THEN THE System SHALL display a warning indicator on the affected Campaign row.
6. IF an Admin enters a calculation input value that is non-numeric or outside the permitted range, THEN THE System SHALL reject the input, retain the previous value, and display a validation message identifying the invalid input.

### Requirement 8: Campaign Approval and Scheduling

**User Story:** As an Admin and SPV, I want to approve and schedule campaigns, so that approved campaigns run on the intended timeline.

#### Acceptance Criteria

1. WHEN an Admin approves a Campaign for which the Calculation_Service has computed total cost, margin, and NPM, THE System SHALL advance the Campaign to Campaign_Step Eksekusi and retain Campaign_Status Proses.
2. IF an Admin attempts to approve a Campaign for which total cost, margin, and NPM have not been computed, THEN THE System SHALL reject the approval and display a message indicating the Campaign must be calculated before approval.
3. WHEN an Admin schedules a Campaign in Campaign_Step Eksekusi with a start date and time and an end date and time, THE System SHALL record the schedule and display the Campaign on the Calendar.
4. IF an Admin schedules a Campaign with an end date and time earlier than or equal to the start date and time, THEN THE System SHALL reject the scheduling and display a validation message indicating the date order is invalid.
5. WHEN an SPV reviews an executed Campaign and approves the execution, THE System SHALL advance the Campaign to Campaign_Step Review and set Campaign_Status to Review.
6. WHEN the scheduled start date and time of a Campaign in Campaign_Step Review is reached, THE System SHALL, within 60 seconds, advance the Campaign to Campaign_Step Live and set Campaign_Status to Live.
7. WHEN the scheduled end date and time of a Live Campaign is reached, THE System SHALL, within 60 seconds, set Campaign_Status to Selesai.
8. IF an SPV rejects an executed Campaign, THEN THE System SHALL return the Campaign to Campaign_Step Eksekusi, set Campaign_Status to Proses, and create a Notification for the Admin role describing the rejection.

### Requirement 9: Campaign Status Lifecycle Integrity

**User Story:** As a system owner, I want campaign status transitions to be valid, so that campaigns progress through a consistent lifecycle.

#### Acceptance Criteria

1. THE System SHALL restrict Campaign_Status to exactly one of the following five values: Menunggu, Proses, Review, Live, or Selesai.
2. IF a Campaign_Status transition that is not defined in Requirements 6 and 8 is requested, THEN THE System SHALL reject the transition, retain the current Campaign_Status unchanged, and display an error message to the requester indicating the transition is not permitted.
3. WHEN a Campaign_Status transition defined in Requirements 6 and 8 completes, THE System SHALL record the date and time of the transition, the previous Campaign_Status, the resulting Campaign_Status, and either the identity of the acting user or, for a transition triggered automatically by a scheduled date and time, an indication that the System initiated the transition.
4. IF a transition out of Campaign_Status Selesai is requested, THEN THE System SHALL reject the transition and retain Campaign_Status as Selesai.

### Requirement 10: Campaign Workflow Visualization

**User Story:** As a user, I want to see campaign progress as a step diagram, so that I can understand where each campaign stands.

#### Acceptance Criteria

1. WHEN a user opens the Workflow module, THE Workflow_Visualization SHALL display the five Campaign_Steps in left-to-right order: Buat Skema, Submit, Eksekusi, Review, Live.
2. WHEN a user selects a Campaign, THE Workflow_Visualization SHALL indicate that Campaign's current Campaign_Step as the active step using a visual presentation distinct from all other steps.
3. WHEN a user selects a Campaign, THE Workflow_Visualization SHALL present each Campaign_Step ordered before the active step as completed, using a visual presentation distinct from both the active step and the steps ordered after the active step.
4. IF no Campaign is selected, THEN THE Workflow_Visualization SHALL display all five Campaign_Steps with none indicated as active or completed.
5. WHEN a Campaign advances to a new Campaign_Step, THE Workflow_Visualization SHALL display the updated active step upon the next load or refresh of the Workflow module.
6. WHEN a user selects a Campaign, THE Workflow_Visualization SHALL display the step progress of each Banner associated with that Campaign across its Banner stages in order: Request, Design, Review, Approve, Schedule, Live, with the Banner's current Asset_Status indicated as the active stage.

### Requirement 11: Banner Asset Workflow

**User Story:** As an Admin, I want to manage banners through a request-to-go-live workflow, so that campaign banners are produced and published in order.

#### Acceptance Criteria

1. WHEN a user requests a Banner for an existing Campaign, THE System SHALL create a Banner with Asset_Status set to Request and associate the Banner with that Campaign.
2. WHEN an Admin uploads a design for a Banner in Request status, THE System SHALL advance the Banner Asset_Status to Design.
3. WHEN an SPV reviews a Banner in Design status, THE System SHALL advance the Banner Asset_Status to Review.
4. WHEN an SPV approves a Banner in Review status, THE System SHALL advance the Banner Asset_Status to Approve.
5. WHEN an Admin schedules a Banner in Approve status with a go-live date and time later than the current date and time, THE System SHALL advance the Banner Asset_Status to Schedule.
6. WHEN the scheduled go-live date and time of a Banner in Schedule status is reached, THE System SHALL set the Banner Asset_Status to Live within 60 seconds.
7. IF an SPV rejects a Banner in Review status, THEN THE System SHALL return the Banner Asset_Status to Design and create a Notification for the Admin role describing the rejection.
8. IF a user requests a Banner without an associated existing Campaign, THEN THE System SHALL reject the request and display a validation message indicating an associated Campaign is required.
9. IF an Admin schedules a Banner with a go-live date and time earlier than or equal to the current date and time, THEN THE System SHALL reject the scheduling, retain the Banner in Approve status, and display a validation message indicating the go-live time must be in the future.
10. IF a Banner Asset_Status transition other than those defined in criteria 1 through 9 is requested, THEN THE System SHALL reject the transition and retain the current Banner Asset_Status, where valid Banner Asset_Status values are restricted to Request, Design, Review, Approve, Schedule, and Live.

### Requirement 12: IG Story Asset Workflow

**User Story:** As an Admin, I want to manage Instagram stories through a request-to-approval workflow, so that story assets are produced and approved.

#### Acceptance Criteria

1. WHEN a user requests an IG_Story for a specified Campaign, THE System SHALL create an IG_Story with Asset_Status set to Request and associate the IG_Story with the specified Campaign.
2. WHEN an Admin uploads a design for an IG_Story in Request status, THE System SHALL advance the IG_Story Asset_Status to Design.
3. WHEN an SPV approves an IG_Story in Design status, THE System SHALL advance the IG_Story Asset_Status to Approve.
4. IF an SPV rejects an IG_Story in Design status, THEN THE System SHALL retain the IG_Story Asset_Status as Design and create a Notification for the Admin role indicating the rejection.
5. THE System SHALL restrict IG_Story Asset_Status values to Request, Design, and Approve.
6. IF a user requests an IG_Story without a specified associated Campaign, THEN THE System SHALL reject the request and display a validation message indicating an associated Campaign is required.
7. IF an Admin uploads a design for an IG_Story without providing a design file, THEN THE System SHALL reject the upload, retain the current IG_Story Asset_Status, and display a validation message indicating a design file is required.

### Requirement 13: Host Live Asset Workflow

**User Story:** As an Admin, I want to manage host live sessions through a request-to-host workflow, so that live sessions are prepared, approved, scheduled, and hosted.

#### Acceptance Criteria

1. WHEN a user requests a Host_Live session, THE System SHALL create a Host_Live with Asset_Status set to Request and associate the Host_Live with exactly one Campaign.
2. WHEN an Admin uploads a design for a Host_Live in Request status, THE System SHALL advance the Host_Live Asset_Status to Design.
3. WHEN an SPV approves a Host_Live in Design status, THE System SHALL advance the Host_Live Asset_Status to Approve.
4. WHEN an Admin schedules a Host_Live in Approve status with a session date and time, THE System SHALL advance the Host_Live Asset_Status to Schedule and display the Host_Live on the Calendar.
5. WHEN the scheduled session date and time of a Host_Live in Schedule status is reached, THE System SHALL set the Host_Live Asset_Status to Live.
6. IF an SPV rejects a Host_Live in Design status, THEN THE System SHALL retain the Host_Live Asset_Status as Design and create a Notification for the Admin role describing the rejection.
7. IF an Admin schedules a Host_Live with a session date and time earlier than the current date and time, THEN THE System SHALL reject the schedule, retain the Host_Live Asset_Status as Approve, and display a validation message indicating the session date and time is invalid.
8. IF a Host_Live Asset_Status transition other than those defined in criteria 1 through 7 is requested, THEN THE System SHALL reject the transition and retain the current Host_Live Asset_Status.

### Requirement 14: Ads CPAS Asset Workflow

**User Story:** As an Admin, I want to manage CPAS ads through a request-to-setup workflow, so that advertisements are approved and configured.

#### Acceptance Criteria

1. WHEN a user requests an Ads_CPAS advertisement for a specified Campaign, THE System SHALL create an Ads_CPAS with Asset_Status set to Request and associate the Ads_CPAS with the specified Campaign.
2. WHEN an Admin uploads a design for an Ads_CPAS in Request status, THE System SHALL advance the Ads_CPAS Asset_Status to Design.
3. WHEN an SPV approves an Ads_CPAS in Design status, THE System SHALL advance the Ads_CPAS Asset_Status to Approve.
4. WHEN an Admin completes ad setup for an Ads_CPAS in Approve status by providing all required ad configuration fields, THE System SHALL set the Ads_CPAS Asset_Status to Setup_Complete.
5. IF an Admin submits ad setup with one or more required configuration fields missing, THEN THE System SHALL reject the setup, retain the Ads_CPAS Asset_Status as Approve, and display a validation message identifying each missing field.
6. IF an SPV rejects an Ads_CPAS in Design status, THEN THE System SHALL retain the Ads_CPAS Asset_Status as Design and create a Notification for the Admin role describing the rejection.

### Requirement 15: Calendar Views

**User Story:** As a user, I want month, week, and day calendar views, so that I can see campaigns and assets across time.

#### Acceptance Criteria

1. WHEN a user opens the Calendar, THE Calendar SHALL display Campaigns and scheduled Assets in a month view showing the calendar month that contains the current date by default.
2. WHEN a user selects the week view, THE Calendar SHALL display Campaigns and scheduled Assets scheduled within the selected seven-day period.
3. WHEN a user selects the day view, THE Calendar SHALL display Campaigns and scheduled Assets scheduled within the selected single day.
4. THE Calendar SHALL color-code each Campaign according to its Campaign_Category.
5. WHEN a user selects a date on the Calendar, THE System SHALL display, for each Campaign and scheduled Asset occurring on that date, its name, Campaign_Category, current status, and scheduled timeline.
6. WHERE a Campaign spans multiple days, THE Calendar SHALL display the Campaign on each day from its timeline start date through its timeline end date inclusive.
7. IF no Campaigns or scheduled Assets occur within the currently displayed period, THEN THE Calendar SHALL display an indication that no items are scheduled for that period.

### Requirement 16: Store Management

**User Story:** As an Admin, I want to manage stores, so that I can assign campaigns, configure categories, and communicate with stores.

#### Acceptance Criteria

1. WHEN an Admin opens the Toko module, THE System SHALL display, within 3 seconds, Stores grouped by their current status into mutually exclusive groups: active, non-active, and attention-needed.
2. WHEN an Admin assigns a Campaign to a Store not already assigned that Campaign, THE System SHALL record the assignment, associate the Store with the Campaign, and display a confirmation that the assignment succeeded.
3. WHEN an Admin assigns a Store_Category to a Store, THE System SHALL persist the Store_Category assignment and display a confirmation that the assignment succeeded.
4. WHEN an Admin sends a Chat_Broadcast containing a message of 1 to 1000 characters to a selected set of 1 to 500 Stores, THE System SHALL deliver the Chat_Broadcast to each selected Store and record the delivery status for each Store.
5. IF an Admin sends a Chat_Broadcast with no Store selected, THEN THE System SHALL reject the action, retain the composed message content, and display a validation message indicating at least one Store is required.
6. WHERE a Store status group contains no Stores, THE System SHALL display that group with an empty-state message indicating no Stores are in that group.
7. IF an Admin attempts to assign a Campaign to a Store already assigned that Campaign, THEN THE System SHALL reject the assignment and display a message indicating the Store is already assigned that Campaign.
8. IF the System fails to deliver a Chat_Broadcast to one or more selected Stores, THEN THE System SHALL record a failed delivery status for each affected Store and display an indication of which Stores did not receive the Chat_Broadcast.

### Requirement 17: Notifications

**User Story:** As a user, I want notifications for approvals, deadlines, and asset status changes, so that I act on time-sensitive items.

#### Acceptance Criteria

1. WHEN a Campaign or Asset enters a state requiring the authenticated user's approval, THE System SHALL create exactly one Notification for that user identifying the item and the required approval action.
2. WHEN the current time reaches the point exactly 24 hours before the deadline of a Task assigned to the authenticated user, THE System SHALL create exactly one reminder Notification for that user identifying the Task and its deadline.
3. IF a reminder Notification has already been created for a Task deadline, THEN THE System SHALL NOT create an additional reminder Notification for that same Task deadline.
4. WHEN an Asset_Status changes, THE System SHALL create a Notification identifying the Asset and the new Asset_Status for the users assigned to the SPV or Admin role responsible for that Asset.
5. WHEN a user opens the Notifikasi module, THE System SHALL display Notifications ordered by creation timestamp from most recent to least recent.
6. WHILE a user has unread Notifications, THE System SHALL present the unread count as the number of the user's Notifications that are in the unread state.
7. WHEN a user marks a Notification as read, THE System SHALL set the Notification state to read and decrement the unread count accordingly.

### Requirement 18: My Tasks

**User Story:** As a user, I want a list of my tasks, so that I can track and act on my assigned work.

#### Acceptance Criteria

1. WHEN a user opens the Tugas Saya module, THE System SHALL display the Tasks assigned to the authenticated user, ordered by deadline from earliest to latest.
2. THE System SHALL present Tasks in a table supporting sorting by status and by deadline, and filtering by status and by deadline.
3. WHEN a user updates the status of a Task to a permitted Task status value, THE System SHALL persist the updated Task status and display the updated status in the table.
4. WHEN a user selects a Task linked to a Campaign or Asset, THE System SHALL display the corresponding Campaign or Asset details.
5. IF the authenticated user has no assigned Tasks, THEN THE System SHALL display an empty-state message indicating that no Tasks are assigned.
6. IF a user submits a Task status update with a value outside the permitted Task status values, THEN THE System SHALL reject the update, retain the current Task status, and display a validation message indicating the status value is invalid.
7. IF a Task status update fails to persist, THEN THE System SHALL retain the previous Task status and display an error message indicating the update was not saved.

### Requirement 19: Reports

**User Story:** As a user, I want reports on campaigns and assets, so that I can review performance and outcomes.

#### Acceptance Criteria

1. WHEN a user opens the Laporan module, THE System SHALL display a Report showing the count of Campaigns grouped by each Campaign_Status value (Menunggu, Proses, Review, Live, Selesai) and by each Campaign_Category value (Flash Sale, Brand Day, Payday, Mega Bonus, Weekend, Lokal).
2. WHEN a user applies a date range filter defined by a start date and an end date to a Report, THE System SHALL display only Campaigns and Assets whose scheduled timeline overlaps the selected date range.
3. THE System SHALL present Report data in tables supporting sorting and filtering.
4. WHEN a user opens the Laporan module, THE System SHALL display a Report showing the count of Assets grouped by Asset type (Banner, IG_Story, Host_Live, Ads_CPAS) and by Asset_Status.
5. IF a user applies a date range filter with an end date earlier than the start date, THEN THE System SHALL reject the filter, retain the previously displayed Report, and display a validation message indicating the date order is invalid.
6. WHEN an applied date range filter matches no Campaigns or Assets, THE System SHALL display the Report with an empty-state message indicating that no records match the selected date range.

### Requirement 20: Master Data Management

**User Story:** As an Admin, I want to manage reference data, so that stores, categories, and configurable options stay accurate.

#### Acceptance Criteria

1. WHEN an Admin creates a Master_Data record with all required fields provided, THE System SHALL persist the record within 2 seconds and make it available for selection in dependent forms.
2. WHEN an Admin edits a Master_Data record with all required fields provided, THE System SHALL persist the updated values within 2 seconds.
3. IF an Admin deletes a Master_Data record referenced by an active Campaign or Asset, THEN THE System SHALL reject the deletion, retain the record unchanged, and display a message identifying the referencing items.
4. IF an Admin creates or edits a Master_Data record so that its unique identifier duplicates the unique identifier of another existing Master_Data record, THEN THE System SHALL reject the operation, retain the existing data unchanged, and display a validation message indicating the identifier already exists.
5. IF an Admin creates or edits a Master_Data record with one or more required fields missing, THEN THE System SHALL reject the operation, retain the existing data unchanged, and display a validation message identifying each missing field.
6. WHEN an Admin deletes a Master_Data record that is not referenced by any active Campaign or Asset, THE System SHALL remove the record and make it unavailable for selection in dependent forms.

### Requirement 21: Settings

**User Story:** As a user, I want to configure my account and preferences, so that the application fits my needs.

#### Acceptance Criteria

1. WHEN a user opens the Pengaturan module, THE System SHALL display, within 3 seconds, the user's account information and the list of configurable preferences with each preference's current value.
2. WHEN a user submits a preference change with a valid value, THE System SHALL persist the updated preference within 3 seconds and display a confirmation indication that the change was saved.
3. WHEN a preference change has been persisted, THE System SHALL apply the updated preference to the user's active session without requiring re-authentication.
4. IF a user submits a preference change with an invalid value, THEN THE System SHALL reject the change, retain the previously persisted value for that preference, and display a validation message identifying the invalid field.
5. IF the System cannot persist a valid preference change because a storage or backend dependency is unavailable, THEN THE System SHALL reject the change, retain the previously persisted value, and display an error message indicating the change could not be saved.

### Requirement 22: Form Validation and Real-Time Preview

**User Story:** As a user, I want forms to validate input and preview results, so that I can correct errors before saving.

#### Acceptance Criteria

1. WHEN a user enters or changes a value in a form field that has defined constraints, THE System SHALL validate the value against the field constraints within 500 milliseconds of the change and, for any violated constraint, display a validation message that identifies the affected field and the reason for the violation.
2. WHILE a user edits a Campaign_Scheme form, THE System SHALL update the real-time preview to reflect the current field values within 500 milliseconds of each value change.
3. IF a user attempts to save a form containing one or more validation errors, THEN THE System SHALL reject the save, retain all values the user entered, and display a validation message identifying each field that has a validation error.
4. WHEN a user attempts to save a form in which all fields with defined constraints satisfy their constraints, THE System SHALL accept the save and display a confirmation that the save succeeded.

### Requirement 23: Visual Design and Presentation

**User Story:** As a user, I want a clean light-mode pastel interface, so that the application is pleasant and professional to use.

#### Acceptance Criteria

1. THE System SHALL present all modules using a light-mode color scheme in which pastel colors are the predominant surface and accent colors, and SHALL render text in a color distinct from its background so that text remains legible.
2. THE System SHALL present the main content area of each module using only the presentation components defined for that module, drawn from cards, tables, checklists, charts, and calendar views.
3. THE System SHALL assign a distinct color to each of the five Campaign_Status values (Menunggu, Proses, Review, Live, Selesai) and to each of the six Campaign_Category values (Flash Sale, Brand Day, Payday, Mega Bonus, Weekend, Lokal), such that no two values within the same set share a color.
4. THE System SHALL render the same Campaign_Status value and the same Campaign_Category value using its single assigned color identically across the Dashboard, Calendar, and module views.
