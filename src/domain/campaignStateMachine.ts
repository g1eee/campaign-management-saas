/**
 * Campaign state machine (pure).
 *
 * Governs Campaign_Status and Campaign_Step. Only the legal transitions defined
 * in Requirements 6 and 8 succeed; every other event is rejected with the state
 * unchanged. Selesai is terminal. Every successful transition emits an audit
 * effect and any notification effects.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8,
 *  9.1, 9.2, 9.3, 9.4_
 */

import {
  CampaignSchedule,
  CampaignStatus,
  CampaignStep,
  EpochMillis,
  Role,
  UserId,
} from "./types.js";

export interface CampaignSmState {
  status: CampaignStatus;
  step: CampaignStep;
  /** Whether the Calculation_Service has produced a result (gate for approval). */
  calculated: boolean;
  /** Whether the scheme passes validation (gate for submission). */
  schemeComplete: boolean;
  schedule?: CampaignSchedule;
}

export type CampaignEvent =
  | { kind: "Submit"; actor: UserId; role: Role; at: EpochMillis }
  | { kind: "Approve"; actor: UserId; role: Role; at: EpochMillis }
  | {
      kind: "Schedule";
      actor: UserId;
      role: Role;
      at: EpochMillis;
      schedule: CampaignSchedule;
    }
  | { kind: "ReviewApprove"; actor: UserId; role: Role; at: EpochMillis }
  | { kind: "ReviewReject"; actor: UserId; role: Role; at: EpochMillis }
  | { kind: "TimerStart"; at: EpochMillis }
  | { kind: "TimerEnd"; at: EpochMillis };

export interface AuditEffect {
  type: "audit";
  fromStatus: CampaignStatus;
  toStatus: CampaignStatus;
  fromStep: CampaignStep;
  toStep: CampaignStep;
  actor: UserId | "System";
  at: EpochMillis;
}

export interface NotificationEffect {
  type: "notification";
  toRole: Role;
  kind: "approval" | "rejection";
  message: string;
}

export type CampaignEffect = AuditEffect | NotificationEffect;

export type TransitionResult =
  | {
      ok: true;
      state: CampaignSmState;
      effects: CampaignEffect[];
    }
  | { ok: false; state: CampaignSmState; reason: string };

function actorOf(event: CampaignEvent): UserId | "System" {
  return "actor" in event ? event.actor : "System";
}

function audit(
  prev: CampaignSmState,
  next: CampaignSmState,
  event: CampaignEvent,
): AuditEffect {
  return {
    type: "audit",
    fromStatus: prev.status,
    toStatus: next.status,
    fromStep: prev.step,
    toStep: next.step,
    actor: actorOf(event),
    at: event.at,
  };
}

function reject(state: CampaignSmState, reason: string): TransitionResult {
  return { ok: false, state, reason };
}

/**
 * Applies an event to a campaign state. Pure: returns a new state plus effects
 * on success, or the unchanged state with a reason on rejection.
 */
export function transition(
  state: CampaignSmState,
  event: CampaignEvent,
): TransitionResult {
  // Selesai is terminal (Requirement 9.4).
  if (state.status === "Selesai") {
    return reject(state, "Campaign is in a terminal status (Selesai).");
  }

  switch (event.kind) {
    case "Submit": {
      // Menunggu/BuatSkema -> Proses/Submit (Requirement 6.1)
      if (state.status !== "Menunggu" || state.step !== "BuatSkema") {
        return reject(state, "Campaign cannot be submitted in its current status.");
      }
      if (!state.schemeComplete) {
        // (Requirement 6.3)
        return reject(state, "Campaign scheme is incomplete.");
      }
      const next: CampaignSmState = { ...state, status: "Proses", step: "Submit" };
      const effects: CampaignEffect[] = [
        audit(state, next, event),
        {
          type: "notification",
          toRole: "Admin",
          kind: "approval",
          message: "Campaign baru memerlukan kalkulasi.",
        },
      ];
      return { ok: true, state: next, effects };
    }

    case "Approve": {
      // Proses/Submit -> Proses/Eksekusi, requires calculation (Requirements 8.1, 8.2)
      if (state.status !== "Proses" || state.step !== "Submit") {
        return reject(state, "Approve is not valid in the current state.");
      }
      if (!state.calculated) {
        return reject(state, "Campaign must be calculated before approval.");
      }
      const next: CampaignSmState = { ...state, step: "Eksekusi" };
      return { ok: true, state: next, effects: [audit(state, next, event)] };
    }

    case "Schedule": {
      // Records schedule while in Proses/Eksekusi (Requirement 8.3)
      if (state.status !== "Proses" || state.step !== "Eksekusi") {
        return reject(state, "Schedule is not valid in the current state.");
      }
      if (event.schedule.end <= event.schedule.start) {
        // (Requirement 8.4)
        return reject(state, "Schedule end must be after start.");
      }
      const next: CampaignSmState = { ...state, schedule: event.schedule };
      return { ok: true, state: next, effects: [audit(state, next, event)] };
    }

    case "ReviewApprove": {
      // Proses/Eksekusi -> Review/Review (Requirement 8.5)
      if (state.status !== "Proses" || state.step !== "Eksekusi") {
        return reject(state, "ReviewApprove is not valid in the current state.");
      }
      const next: CampaignSmState = {
        ...state,
        status: "Review",
        step: "Review",
      };
      return { ok: true, state: next, effects: [audit(state, next, event)] };
    }

    case "ReviewReject": {
      // Review/Review -> Proses/Eksekusi + notify Admin (Requirement 8.8)
      if (state.status !== "Review" || state.step !== "Review") {
        return reject(state, "ReviewReject is not valid in the current state.");
      }
      const next: CampaignSmState = {
        ...state,
        status: "Proses",
        step: "Eksekusi",
      };
      const effects: CampaignEffect[] = [
        audit(state, next, event),
        {
          type: "notification",
          toRole: "Admin",
          kind: "rejection",
          message: "Eksekusi campaign ditolak dan dikembalikan untuk perbaikan.",
        },
      ];
      return { ok: true, state: next, effects };
    }

    case "TimerStart": {
      // Review/Review -> Live/Live (Requirement 8.6)
      if (state.status !== "Review" || state.step !== "Review") {
        return reject(state, "TimerStart is not valid in the current state.");
      }
      const next: CampaignSmState = { ...state, status: "Live", step: "Live" };
      return { ok: true, state: next, effects: [audit(state, next, event)] };
    }

    case "TimerEnd": {
      // Live/Live -> Selesai (Requirement 8.7)
      if (state.status !== "Live") {
        return reject(state, "TimerEnd is not valid in the current state.");
      }
      const next: CampaignSmState = { ...state, status: "Selesai" };
      return { ok: true, state: next, effects: [audit(state, next, event)] };
    }

    default: {
      return reject(state, "Unknown event.");
    }
  }
}
