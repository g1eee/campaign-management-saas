/**
 * Broadcast delivery infrastructure.
 *
 * Delivers a Chat_Broadcast to each selected store and records a per-store
 * delivered/failed outcome. The pure store result builder surfaces failures.
 *
 * _Requirements: 16.4, 16.8_
 */

import { StoreId } from "../../domain/types.js";
import { DeliveryOutcome } from "../../domain/stores.js";

/** Abstraction over the channel that actually delivers a message to a store. */
export interface DeliveryChannel {
  deliver(storeId: StoreId, message: string): boolean;
}

/**
 * Attempts delivery to each store via the channel, returning a per-store
 * outcome. A thrown error or a false return is recorded as a failed delivery.
 */
export function deliverBroadcast(
  channel: DeliveryChannel,
  storeIds: readonly StoreId[],
  message: string,
): DeliveryOutcome[] {
  return storeIds.map((storeId) => {
    let delivered = false;
    try {
      delivered = channel.deliver(storeId, message);
    } catch {
      delivered = false;
    }
    return { storeId, status: delivered ? "delivered" : "failed" };
  });
}

/** A simple in-memory channel for tests / local runs. */
export class InMemoryDeliveryChannel implements DeliveryChannel {
  readonly delivered: { storeId: StoreId; message: string }[] = [];
  constructor(private readonly failFor: ReadonlySet<StoreId> = new Set()) {}

  deliver(storeId: StoreId, message: string): boolean {
    if (this.failFor.has(storeId)) return false;
    this.delivered.push({ storeId, message });
    return true;
  }
}
