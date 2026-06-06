/**
 * Dashboard module: role-scoped summary cards, upcoming campaigns, today's
 * summary, workflow visualization, recent notifications, empty states.
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
 */

import { theme } from "../theme.js";
import { Card, CategoryBadge, EmptyState, MetricCard, StatusBadge, StepBar } from "../components/ui.js";
import { NOW, useApp } from "../store.js";
import {
  countByStatus,
  upcomingCampaigns,
  mostRecent,
} from "../../domain/collections.js";
import { campaignStepView } from "../../domain/workflowView.js";
import { statusLabels } from "../i18n.js";

export function Dashboard() {
  const { services, userId } = useApp();
  const campaigns = services.repos.campaigns.all();
  const tasks = services.repos.tasks.forUser(userId);
  const notifications = services.notifications.list(userId);

  const byStatus = countByStatus(campaigns);
  const activeCount = byStatus.Live;
  const pendingTasks = tasks.filter((t) => t.status !== "Done").length;
  const approvals = notifications.filter((n) => n.kind === "approval" && n.state === "unread").length;
  const todaysDeadlines = tasks.filter(
    (t) => Math.floor(t.deadline / (24 * 3600 * 1000)) === Math.floor(NOW / (24 * 3600 * 1000)),
  ).length;

  const upcoming = upcomingCampaigns(campaigns, NOW);
  const recentNotifs = mostRecent(notifications, (n) => n.createdAt);
  const featured = campaigns.find((c) => c.status === "Live") ?? campaigns[0];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <div style={{ display: "flex", gap: theme.spacing(4), flexWrap: "wrap" }}>
        <MetricCard label="Campaign Aktif" value={activeCount} accent={theme.colors.primarySoft} />
        <MetricCard label="Tugas Saya" value={pendingTasks} />
        <MetricCard label="Butuh Approval" value={approvals} />
        <MetricCard label="Deadline Hari Ini" value={todaysDeadlines} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: theme.spacing(5) }}>
        <Card title="Upcoming Campaign">
          {upcoming.length === 0 ? (
            <EmptyState message="Belum ada campaign mendatang." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {upcoming.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <CategoryBadge category={c.category} />
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Ringkasan Hari Ini">
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: theme.colors.textMuted }}>
                  {statusLabels[status as keyof typeof statusLabels]}
                </span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Workflow Diagram: Alur Campaign">
        {featured ? (
          <>
            <div style={{ marginBottom: theme.spacing(3), color: theme.colors.textMuted, fontSize: 13 }}>
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
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {recentNotifs.map((n) => (
              <li key={n.id} style={{ fontSize: 13, color: theme.colors.text }}>
                <span style={{ fontWeight: n.state === "unread" ? 700 : 400 }}>{n.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
