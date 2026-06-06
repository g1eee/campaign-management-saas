/**
 * Store-management domain (pure).
 *
 * Partitions stores into active/non-active/attention-needed, provides a
 * dedup-guarded campaign assignment, and builds a broadcast result with exactly
 * one delivery record per selected store (rejecting empty selections).
 *
 * _Requirements: 16.1, 16.2, 16.4, 16.5, 16.7, 16.8_
 */

import {
  BroadcastId,
  CampaignId,
  DeliveryStatus,
  MAX_BROADCAST_MESSAGE,
  MAX_BROADCAST_STORES,
  MIN_BROADCAST_MESSAGE,
  MIN_BROADCAST_STORES,
  Store,
  StoreId,
  StoreStatus,
} from "./types.js";

export interface StoreGroups {
  active: Store[];
  "non-active": Store[];
  "attention-needed": Store[];
}

/** Partitions stores by status into mutually exclusive groups (Requirement 16.1). */
export function groupStores(stores: readonly Store[]): StoreGroups {
  const groups: StoreGroups = {
    active: [],
    "non-active": [],
    "attention-needed": [],
  };
  for (const store of stores) {
    groups[store.status].push(store);
  }
  return groups;
}

export type AssignResult =
  | { ok: true; store: Store }
  | { ok: false; store: Store; reason: string };

/**
 * Assigns a campaign to a store. Rejects a duplicate assignment, leaving the
 * store unchanged (Requirements 16.2, 16.7).
 */
export function assignCampaign(
  store: Store,
  campaignId: CampaignId,
): AssignResult {
  if (store.assignedCampaignIds.includes(campaignId)) {
    return { ok: false, store, reason: "Toko sudah ditugaskan campaign ini." };
  }
  return {
    ok: true,
    store: {
      ...store,
      assignedCampaignIds: [...store.assignedCampaignIds, campaignId],
    },
  };
}

export interface BroadcastRequest {
  message: string;
  storeIds: StoreId[];
}

/** Per-store delivery outcome from the infrastructure layer. */
export type DeliveryOutcome = { storeId: StoreId; status: DeliveryStatus };

export interface BroadcastDeliveryRecord {
  broadcastId: BroadcastId;
  storeId: StoreId;
  status: DeliveryStatus;
}

export type BroadcastResult =
  | {
      ok: true;
      deliveries: BroadcastDeliveryRecord[];
      failedStoreIds: StoreId[];
    }
  | { ok: false; reason: string };

/** Validates a broadcast request's message and store-selection bounds. */
export function validateBroadcast(request: BroadcastRequest): string | null {
  if (request.storeIds.length < MIN_BROADCAST_STORES) {
    return "Minimal satu toko harus dipilih.";
  }
  if (request.storeIds.length > MAX_BROADCAST_STORES) {
    return `Maksimal ${MAX_BROADCAST_STORES} toko.`;
  }
  const len = request.message.length;
  if (len < MIN_BROADCAST_MESSAGE) {
    return "Pesan tidak boleh kosong.";
  }
  if (len > MAX_BROADCAST_MESSAGE) {
    return `Pesan maksimal ${MAX_BROADCAST_MESSAGE} karakter.`;
  }
  return null;
}

/**
 * Builds the broadcast result: exactly one delivery record per selected store,
 * surfacing the failed set. Rejects invalid requests (empty selection etc.),
 * retaining the message implicitly by returning a reason (Requirements
 * 16.4, 16.5, 16.8).
 */
export function buildBroadcastResult(
  broadcastId: BroadcastId,
  request: BroadcastRequest,
  outcomes: readonly DeliveryOutcome[],
): BroadcastResult {
  const invalid = validateBroadcast(request);
  if (invalid) {
    return { ok: false, reason: invalid };
  }

  const outcomeByStore = new Map<StoreId, DeliveryStatus>();
  for (const o of outcomes) outcomeByStore.set(o.storeId, o.status);

  const deliveries: BroadcastDeliveryRecord[] = request.storeIds.map(
    (storeId) => ({
      broadcastId,
      storeId,
      // A store with no recorded outcome is treated as failed.
      status: outcomeByStore.get(storeId) ?? "failed",
    }),
  );

  const failedStoreIds = deliveries
    .filter((d) => d.status === "failed")
    .map((d) => d.storeId);

  return { ok: true, deliveries, failedStoreIds };
}

export const STORE_STATUSES: readonly StoreStatus[] = [
  "active",
  "non-active",
  "attention-needed",
];
