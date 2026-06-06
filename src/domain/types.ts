/**
 * Shared domain types for CampaignHub (Promo Management).
 *
 * These are the framework-independent, I/O-free types that the entire pure
 * domain core is built on. They are consumed by the state machines, the
 * calculation service, the validation engine, the access policy, notification
 * derivation, and the presentation layer.
 *
 * _Requirements: 9.1, 3.6, 23.1_
 */

// ---------------------------------------------------------------------------
// Roles & access
// ---------------------------------------------------------------------------

export type Role = "SPV" | "Admin";

/** A principal may be a known role or unauthenticated/no-role (null). */
export type Principal = Role | null;

export type ModuleId =
  | "Dashboard"
  | "Calendar"
  | "Campaign"
  | "Workflow"
  | "Banner"
  | "Toko"
  | "IGStory"
  | "HostLive"
  | "AdsCPAS"
  | "TugasSaya"
  | "Notifikasi"
  | "Laporan"
  | "MasterData"
  | "Pengaturan";

/** Fixed top-to-bottom sidebar order (Requirement 3.1). */
export const MODULE_ORDER: readonly ModuleId[] = [
  "Dashboard",
  "Calendar",
  "Campaign",
  "Workflow",
  "Banner",
  "Toko",
  "IGStory",
  "HostLive",
  "AdsCPAS",
  "TugasSaya",
  "Notifikasi",
  "Laporan",
  "MasterData",
  "Pengaturan",
] as const;

export type Action =
  // SPV actions
  | "CreateScheme"
  | "SubmitCampaign"
  | "ReviewExecution"
  | "ApproveCampaign"
  // Admin actions
  | "SetStrategy"
  | "CalculateCampaign"
  | "PrepareAsset"
  | "ExecuteTask"
  | "UpdateProgress";

// ---------------------------------------------------------------------------
// Campaign lifecycle (Requirement 9.1)
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | "Menunggu"
  | "Proses"
  | "Review"
  | "Live"
  | "Selesai";

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  "Menunggu",
  "Proses",
  "Review",
  "Live",
  "Selesai",
] as const;

export type CampaignStep =
  | "BuatSkema"
  | "Submit"
  | "Eksekusi"
  | "Review"
  | "Live";

export const CAMPAIGN_STEPS: readonly CampaignStep[] = [
  "BuatSkema",
  "Submit",
  "Eksekusi",
  "Review",
  "Live",
] as const;

export type CampaignCategory =
  | "FlashSale"
  | "BrandDay"
  | "Payday"
  | "MegaBonus"
  | "Weekend"
  | "Lokal";

export const CAMPAIGN_CATEGORIES: readonly CampaignCategory[] = [
  "FlashSale",
  "BrandDay",
  "Payday",
  "MegaBonus",
  "Weekend",
  "Lokal",
] as const;

// ---------------------------------------------------------------------------
// Asset statuses (closed value sets per asset type)
// ---------------------------------------------------------------------------

export type BannerStatus =
  | "Request"
  | "Design"
  | "Review"
  | "Approve"
  | "Schedule"
  | "Live";

export const BANNER_STATUSES: readonly BannerStatus[] = [
  "Request",
  "Design",
  "Review",
  "Approve",
  "Schedule",
  "Live",
] as const;

export type IGStoryStatus = "Request" | "Design" | "Approve";

export const IG_STORY_STATUSES: readonly IGStoryStatus[] = [
  "Request",
  "Design",
  "Approve",
] as const;

export type HostLiveStatus =
  | "Request"
  | "Design"
  | "Approve"
  | "Schedule"
  | "Live";

export const HOST_LIVE_STATUSES: readonly HostLiveStatus[] = [
  "Request",
  "Design",
  "Approve",
  "Schedule",
  "Live",
] as const;

export type AdsCPASStatus = "Request" | "Design" | "Approve" | "Setup_Complete";

export const ADS_CPAS_STATUSES: readonly AdsCPASStatus[] = [
  "Request",
  "Design",
  "Approve",
  "Setup_Complete",
] as const;

export type TaskStatus = "Open" | "InProgress" | "Done";

export const TASK_STATUSES: readonly TaskStatus[] = [
  "Open",
  "InProgress",
  "Done",
] as const;

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type UserId = string;
export type CampaignId = string;
export type StoreId = string;
export type StoreCategoryId = string;
export type NotificationId = string;
export type TaskId = string;
export type AssetId = string;
export type BroadcastId = string;
export type MasterDataId = string;

/** Epoch milliseconds. Used everywhere a timestamp is required. */
export type EpochMillis = number;

// ---------------------------------------------------------------------------
// Promo options & campaign scheme (Requirement 5)
// ---------------------------------------------------------------------------

export const MAX_PROMO_OPTIONS = 20;
export const MIN_PROMO_OPTIONS = 1;
export const MIN_DISCOUNT_PCT = 0;
export const MAX_DISCOUNT_PCT = 100;

export interface PromoOption {
  id: string;
  label: string;
  /** Integer 0..100, increments of 1 (Requirement 5.3). */
  discountPct: number;
}

export interface CampaignScheme {
  name: string; // 1..100 chars (Requirement 5.1)
  category: CampaignCategory | null;
  timelineStart: EpochMillis | null;
  timelineEnd: EpochMillis | null;
  targetStoreIds: StoreId[]; // >= 1 (Requirement 5.1)
  promoOptions: PromoOption[]; // 1..20 (Requirement 5.2)
  /** Economic inputs used by the Calculation_Service. */
  baseRevenue: number;
  baseCost: number;
  additionalCosts: number;
}

// ---------------------------------------------------------------------------
// Calculation (Requirement 7)
// ---------------------------------------------------------------------------

export type NpmValue = number | "undefined";

export interface CalculationResult {
  totalCost: number;
  margin: number;
  npm: NpmValue;
  warning: boolean;
}

// ---------------------------------------------------------------------------
// Campaign entity & audit
// ---------------------------------------------------------------------------

export interface CampaignSchedule {
  start: EpochMillis;
  end: EpochMillis;
}

export interface Campaign {
  id: CampaignId;
  name: string;
  category: CampaignCategory;
  status: CampaignStatus;
  step: CampaignStep;
  timelineStart: EpochMillis;
  timelineEnd: EpochMillis;
  scheduledStart?: EpochMillis;
  scheduledEnd?: EpochMillis;
  scheme: CampaignScheme;
  calculation?: CalculationResult;
  targetStoreIds: StoreId[];
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
}

export interface CampaignAudit {
  id: string;
  campaignId: CampaignId;
  timestamp: EpochMillis;
  fromStatus: CampaignStatus;
  toStatus: CampaignStatus;
  fromStep: CampaignStep;
  toStep: CampaignStep;
  /** Acting user id, or "System" for timer-driven transitions (Requirement 9.3). */
  actor: UserId | "System";
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export type AssetType = "Banner" | "IGStory" | "HostLive" | "AdsCPAS";

export interface Banner {
  id: AssetId;
  campaignId: CampaignId;
  status: BannerStatus;
  design?: string;
  goLiveAt?: EpochMillis;
}

export interface IGStory {
  id: AssetId;
  campaignId: CampaignId;
  status: IGStoryStatus;
  design?: string;
}

export interface HostLive {
  id: AssetId;
  campaignId: CampaignId;
  status: HostLiveStatus;
  design?: string;
  sessionAt?: EpochMillis;
}

export interface AdsCPAS {
  id: AssetId;
  campaignId: CampaignId;
  status: AdsCPASStatus;
  design?: string;
  adConfig?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Stores & broadcast
// ---------------------------------------------------------------------------

export type StoreStatus = "active" | "non-active" | "attention-needed";

export interface Store {
  id: StoreId;
  name: string;
  status: StoreStatus;
  categoryIds: StoreCategoryId[];
  assignedCampaignIds: CampaignId[];
}

export const MIN_BROADCAST_STORES = 1;
export const MAX_BROADCAST_STORES = 500;
export const MIN_BROADCAST_MESSAGE = 1;
export const MAX_BROADCAST_MESSAGE = 1000;

export type DeliveryStatus = "delivered" | "failed";

export interface BroadcastDelivery {
  broadcastId: BroadcastId;
  storeId: StoreId;
  status: DeliveryStatus;
}

export interface ChatBroadcast {
  id: BroadcastId;
  message: string; // 1..1000 chars
  createdAt: EpochMillis;
  senderId: UserId;
}

// ---------------------------------------------------------------------------
// Notifications & tasks
// ---------------------------------------------------------------------------

export type NotificationKind = "approval" | "deadline" | "assetStatus";
export type NotificationState = "unread" | "read";

export interface Notification {
  id: NotificationId;
  userId: UserId;
  kind: NotificationKind;
  refType: string;
  refId: string;
  message: string;
  state: NotificationState;
  createdAt: EpochMillis;
  /** Dedup key for deadline reminders: `${taskId}:${deadline}` (Requirement 17.3). */
  dedupKey?: string;
}

export interface Task {
  id: TaskId;
  userId: UserId;
  title: string;
  status: TaskStatus;
  deadline: EpochMillis;
  linkedRefType?: string;
  linkedRefId?: string;
  reminderSent: boolean;
}

// ---------------------------------------------------------------------------
// Master data & sessions
// ---------------------------------------------------------------------------

export interface MasterDataRecord {
  id: MasterDataId;
  type: string;
  /** Business-unique identifier within a type (Requirement 20.4). */
  uniqueId: string;
  fields: Record<string, string>;
}

export interface Session {
  userId: UserId;
  role: Role;
  lastActivityAt: EpochMillis;
}

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

export const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes (Requirement 1.5)
export const MAX_FAILED_ATTEMPTS = 5; // (Requirement 1.6)
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes (Requirement 1.6)
export const DEADLINE_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // 24 hours (Requirement 17.2)
export const DASHBOARD_LIST_LIMIT = 10; // (Requirement 4.2)
