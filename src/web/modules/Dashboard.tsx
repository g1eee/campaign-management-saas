/**
 * Dashboard module: campaign calendar widget, role-scoped summary metrics,
 * upcoming campaigns, today's summary, workflow visualization, recent
 * notifications, and empty states.
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 15.1, 15.4, 15.5, 15.6_
 */

import { theme } from "../theme.js";
import { Card, CategoryBadge, EmptyState, StatusBadge, StepBar } from "../components/ui.js";
import { CalendarWidget, campaignsToCalendarItems } from "../components/CalendarWidget.js";
import { NOW, useApp } from "../store.js";
import {
  countByStatus,
  upcomingCampaigns,
  mostRecent,
} from "../../domain/collections.js";
import { campaignStepView } from "../../domain/workflowView.js";
import { statusLabels } from "../i18n.js";

const DAY = 24 * 3600 * 1000;

export function Dashboard() {
  const { services, userId, notes, addNote, removeNote } = useApp();
  const campaigns = services.repos.campaigns.all();
  const tasks = services.repos.tasks.forUser(userId);
  const notifications = services.notifications.list(userId);

  const byStatus = countByStatus(campaigns);
  const activeCount = byStatus.Live;
  const pendingTasks = tasks.filter((t) => t.status !== "Done").length;
  const approvals = notifications.filter((n) => n.kind === "approval" && n.state === "unread").length;
  const todaysDeadlines = tasks.filter(
    (t) => Math.floor(t.deadline / DAY) === Math.floor(NOW / DAY),
  ).length;

  const upcoming = upcomingCampaigns(campaigns, NOW);
  const recentNotifs = mostRecent(notifications, (n) => n.createdAt);
  const featured = campaigns.find((c) => c.status === "Live") ?? campaigns[0];
  const calendarItems = campaignsToCalendarItems(campaigns);

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      {/* Row 1: Calendar (left) + Upcoming & Summary (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: theme.spacing(5), alignItems: "start" }}>
        <Card title="Kalender Campaign">
          <CalendarWidget
            items={calendarItems}
            initial={NOW}
            notes={notes}
            onAddNote={addNote}
            onRemoveNote={removeNote}
          />
        </Card>

        <div style={{ display: "grid", gap: theme.spacing(5) }}>
          <Card title="Upcoming Campaign">
            {upcoming.length === 0 ? (
              <EmptyState message="Belum ada campaign mendatang." />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                {upcoming.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: `1px solid ${theme.colors.border}`,
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: theme.font.size.md }}>{c.name}</span>
                      <CategoryBadge category={c.category} />
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Ringkasan Hari Ini">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing(3) }}>
              <Metric label="Campaign Aktif" value={activeCount} tone="primary" />
              <Metric label="Butuh Approval" value={approvals} tone="warning" />
              <Metric label="Tugas Saya" value={pendingTasks} tone="default" />
              <Metric label="Deadline Hari Ini" value={todaysDeadlines} tone="danger" />
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: theme.spacing(4) }}>
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} style={{ display: "flex", justifyContent: "space-between", fontSize: theme.font.size.base }}>
                  <span style={{ color: theme.colors.textMuted }}>
                    {statusLabels[status as keyof typeof statusLabels]}
                  </span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 2: Workflow (left) + Notifications (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: theme.spacing(5), alignItems: "start" }}>
        <Card title="Workflow Diagram: Alur Campaign">
          {featured ? (
            <>
              <div style={{ marginBottom: theme.spacing(3), color: theme.colors.textMuted, fontSize: theme.font.size.base }}>
                {featured.name}
              </div>
              <StepBar steps={campaignStepView(featured.step)} />
            </>
          ) : (
            <EmptyState message="Belum ada campaign." />
          )}
        </Card>

        <Card title="Notifikasi">
          {recentNotifs.length === 0 ? (
            <EmptyState message="Belum ada notifikasi." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {recentNotifs.map((n) => (
                <li key={n.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: theme.font.size.base }}>
                  <span
                    style={{
                      marginTop: 5,
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      flex: "0 0 auto",
                      background: n.state === "unread" ? theme.colors.primary : theme.colors.border,
                    }}
                  />
                  <span style={{ fontWeight: n.state === "unread" ? 600 : 400, color: theme.colors.text }}>
                    {n.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

const toneMap = {
  primary: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
  warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
  danger: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
  default: { bg: theme.colors.surfaceAlt, fg: theme.colors.text },
} as const;

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: keyof typeof toneMap;
}) {
  const t = toneMap[tone];
  return (
    <div style={{ background: t.bg, borderRadius: theme.radius.md, padding: theme.spacing(3) }}>
      <div style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: theme.font.size.xxl, fontWeight: 800, color: t.fg, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}
