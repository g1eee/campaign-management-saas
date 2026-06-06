/**
 * Workflow module: five-step campaign diagram + per-banner stage progress.
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
 */

import { useState } from "react";
import { theme } from "../theme.js";
import { Card, EmptyState, StepBar } from "../components/ui.js";
import { useApp } from "../store.js";
import { bannerStageView, campaignStepView } from "../../domain/workflowView.js";
import { BANNER_STATUSES } from "../../domain/types.js";

export function Workflow() {
  const { services } = useApp();
  const campaigns = services.repos.campaigns.all();
  const [selectedId, setSelectedId] = useState<string | null>(campaigns[0]?.id ?? null);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;
  const banners = selected
    ? [...services.assets.banners.values()].filter((b) => b.campaignId === selected.id)
    : [];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card
        title="Alur Campaign"
        action={
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.colors.border}`, fontSize: 13 }}
          >
            <option value="">Pilih campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      >
        <StepBar steps={campaignStepView(selected ? selected.step : null)} />
      </Card>

      <Card title="Progress Banner">
        {!selected ? (
          <EmptyState message="Pilih campaign untuk melihat progress banner." />
        ) : banners.length === 0 ? (
          <EmptyState message="Belum ada banner untuk campaign ini." />
        ) : (
          <div style={{ display: "grid", gap: theme.spacing(4) }}>
            {banners.map((b) => (
              <div key={b.id}>
                <div style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 6 }}>{b.id}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {bannerStageView(b.status).map((sv) => (
                    <span
                      key={sv.step}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        background:
                          sv.classification === "active"
                            ? theme.colors.primary
                            : sv.classification === "completed"
                              ? theme.colors.success
                              : theme.colors.surfaceAlt,
                        color: sv.classification === "upcoming" ? theme.colors.textMuted : "#fff",
                      }}
                    >
                      {sv.step}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: theme.spacing(3), fontSize: 12, color: theme.colors.textMuted }}>
          Tahapan: {BANNER_STATUSES.join(" → ")}
        </div>
      </Card>
    </div>
  );
}
