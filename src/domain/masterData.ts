/**
 * Master-data domain rules (pure).
 *
 * Rejects deletion of referenced records (identifying the referencing items),
 * allows unreferenced deletion, and rejects create/edit that duplicates an
 * existing unique identifier.
 *
 * _Requirements: 20.3, 20.4, 20.6_
 */

import { MasterDataId, MasterDataRecord } from "./types.js";

/** A reference from an active campaign or asset to a master-data record. */
export interface MasterDataReference {
  recordId: MasterDataId;
  /** Human-readable description of the referencing item, e.g. "Campaign ABC". */
  refLabel: string;
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: string; referencedBy: string[] };

/**
 * Deletion is permitted iff the record is not referenced by any active campaign
 * or asset. When rejected, the referencing items are identified (Requirements
 * 20.3, 20.6).
 */
export function canDelete(
  recordId: MasterDataId,
  references: readonly MasterDataReference[],
): DeleteResult {
  const refs = references
    .filter((r) => r.recordId === recordId)
    .map((r) => r.refLabel);
  if (refs.length > 0) {
    return {
      ok: false,
      reason: "Data masih direferensikan oleh item aktif.",
      referencedBy: refs,
    };
  }
  return { ok: true };
}

export type UpsertResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validates that creating or editing a record does not duplicate the unique
 * identifier of another existing record of the same type (Requirement 20.4).
 *
 * `editingId` is the id of the record being edited (excluded from the conflict
 * check); omit it for a create.
 */
export function checkUniqueIdentifier(
  record: Pick<MasterDataRecord, "type" | "uniqueId">,
  existing: readonly MasterDataRecord[],
  editingId?: MasterDataId,
): UpsertResult {
  const conflict = existing.some(
    (r) =>
      r.id !== editingId &&
      r.type === record.type &&
      r.uniqueId === record.uniqueId,
  );
  if (conflict) {
    return { ok: false, reason: "Identifier sudah digunakan." };
  }
  return { ok: true };
}
