/**
 * Shared UI primitives: Card, StatusBadge, CategoryBadge, MetricCard, StepBar.
 * Consume the pure color registry so status/category colors are consistent
 * across every view (Requirements 23.3, 23.4, 15.4).
 */

import React from "react";
import { theme } from "../theme.js";
import { colorFor } from "../../domain/colorRegistry.js";
import {
  categoryLabels,
  statusLabels,
  stepLabels,
} from "../i18n.js";
import {
  CampaignCategory,
  CampaignStatus,
} from "../../domain/types.js";
import { StepView } from "../../domain/workflowView.js";
import { CampaignStep } from "../../domain/types.js";

export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.card,
        padding: theme.spacing(5),
      }}
    >
      {(title || action) && (
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: theme.spacing(4),
          }}
        >
          {title && (
            <h2 style={{ margin: 0, fontSize: 16, color: theme.colors.text }}>
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      style={{
        background: colorFor("status", status),
        color: theme.colors.text,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {statusLabels[status]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: CampaignCategory }) {
  return (
    <span
      style={{
        background: colorFor("category", category),
        color: theme.colors.text,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {categoryLabels[category]}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: accent ?? theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        padding: theme.spacing(4),
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 13, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.text }}>
        {value}
      </div>
    </div>
  );
}

const stepClassColor: Record<string, string> = {
  completed: theme.colors.success,
  active: theme.colors.primary,
  upcoming: theme.colors.border,
};

export function StepBar({ steps }: { steps: StepView<CampaignStep>[] }) {
  return (
    <div style={{ display: "flex", gap: theme.spacing(2), alignItems: "center" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.step}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: stepClassColor[s.classification],
                color: s.classification === "upcoming" ? theme.colors.textMuted : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                margin: "0 auto",
              }}
              aria-current={s.classification === "active" ? "step" : undefined}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: theme.colors.textMuted }}>
              {stepLabels[s.step]}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background:
                  s.classification === "completed"
                    ? theme.colors.success
                    : theme.colors.border,
                minWidth: 16,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const bg =
    variant === "primary"
      ? theme.colors.primary
      : variant === "danger"
        ? theme.colors.danger
        : "transparent";
  const color = variant === "ghost" ? theme.colors.text : "#fff";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="ch-clickable"
      style={{
        background: bg,
        color,
        border: variant === "ghost" ? `1px solid ${theme.colors.border}` : "none",
        borderRadius: theme.radius.sm,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: theme.spacing(6),
        textAlign: "center",
        color: theme.colors.textMuted,
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}
