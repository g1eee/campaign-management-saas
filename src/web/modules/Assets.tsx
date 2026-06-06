/**
 * Asset modules: Banner, IG Story, Host Live, Ads CPAS.
 * Each drives its asset workflow with request/upload/review/approve/reject/
 * schedule/setup actions.
 *
 * _Requirements: 11.*, 12.*, 13.*, 14.*_
 */

import React, { useState } from "react";
import { theme } from "../theme.js";
import { Button, Card, EmptyState } from "../components/ui.js";
import { NOW, useApp } from "../store.js";

function ActionBar({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>;
}

const pill: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  background: theme.colors.surfaceAlt,
  fontWeight: 600,
};

function useNotify() {
  const { refresh } = useApp();
  return (r: { ok: boolean; reason?: string }) => {
    refresh();
    if (!r.ok && r.reason) alert(r.reason);
  };
}

export function Banner() {
  const { services, role, refresh } = useApp();
  const notify = useNotify();
  const campaigns = services.repos.campaigns.all();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const banners = [...services.assets.banners.values()];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card title="Banner: Request → Design → Review → Approve → Schedule → Live">
        {role === "Admin" ? (
          <ActionBar>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={selectStyle}>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button onClick={() => { services.assets.requestBanner(role, campaignId); refresh(); }}>
              + Request Banner
            </Button>
          </ActionBar>
        ) : (
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Hanya Admin yang dapat membuat permintaan banner. Anda dapat me-review banner di status Design/Review.
          </div>
        )}
      </Card>
      <Card title="Daftar Banner">
        {banners.length === 0 ? (
          <EmptyState message="Belum ada banner." />
        ) : (
          <ul style={listStyle}>
            {banners.map((b) => (
              <li key={b.id} style={rowStyle}>
                <span>{b.id}</span>
                <span style={pill}>{b.status}</span>
                <ActionBar>
                  {role === "Admin" && b.status === "Request" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.bannerEvent(role, b.id, { kind: "Upload", hasFile: true }, NOW))}>Upload Desain</Button>
                  )}
                  {role === "SPV" && b.status === "Design" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.bannerEvent(role, b.id, { kind: "Review" }, NOW))}>Review</Button>
                  )}
                  {role === "SPV" && b.status === "Review" && (
                    <>
                      <Button variant="ghost" onClick={() => notify(services.assets.bannerEvent(role, b.id, { kind: "Approve" }, NOW))}>Setujui</Button>
                      <Button variant="danger" onClick={() => notify(services.assets.bannerEvent(role, b.id, { kind: "Reject" }, NOW))}>Tolak</Button>
                    </>
                  )}
                  {role === "Admin" && b.status === "Approve" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.bannerEvent(role, b.id, { kind: "Schedule", goLiveAt: NOW + 86400000, now: NOW }, NOW))}>Jadwalkan</Button>
                  )}
                </ActionBar>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function IGStory() {
  const { services, role, refresh } = useApp();
  const notify = useNotify();
  const campaigns = services.repos.campaigns.all();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const stories = [...services.assets.igStories.values()];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card title="IG Story: Request → Design → Approve">
        {role === "Admin" ? (
          <ActionBar>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={selectStyle}>
              {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <Button onClick={() => { services.assets.requestIGStory(role, campaignId); refresh(); }}>+ Request IG Story</Button>
          </ActionBar>
        ) : (
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Hanya Admin yang dapat membuat permintaan IG Story.
          </div>
        )}
      </Card>
      <Card title="Daftar IG Story">
        {stories.length === 0 ? <EmptyState message="Belum ada IG Story." /> : (
          <ul style={listStyle}>
            {stories.map((s) => (
              <li key={s.id} style={rowStyle}>
                <span>{s.id}</span>
                <span style={pill}>{s.status}</span>
                <ActionBar>
                  {role === "Admin" && s.status === "Request" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.igStoryEvent(role, s.id, { kind: "Upload", hasFile: true }, NOW))}>Upload Desain</Button>
                  )}
                  {role === "SPV" && s.status === "Design" && (
                    <>
                      <Button variant="ghost" onClick={() => notify(services.assets.igStoryEvent(role, s.id, { kind: "Approve" }, NOW))}>Setujui</Button>
                      <Button variant="danger" onClick={() => notify(services.assets.igStoryEvent(role, s.id, { kind: "Reject" }, NOW))}>Tolak</Button>
                    </>
                  )}
                </ActionBar>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function HostLive() {
  const { services, role, refresh } = useApp();
  const notify = useNotify();
  const campaigns = services.repos.campaigns.all();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const sessions = [...services.assets.hostLives.values()];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card title="Host Live: Request → Design → Approve → Schedule → Live">
        {role === "Admin" ? (
          <ActionBar>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={selectStyle}>
              {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <Button onClick={() => { services.assets.requestHostLive(role, campaignId); refresh(); }}>+ Request Host Live</Button>
          </ActionBar>
        ) : (
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Hanya Admin yang dapat membuat permintaan Host Live.
          </div>
        )}
      </Card>
      <Card title="Daftar Host Live">
        {sessions.length === 0 ? <EmptyState message="Belum ada sesi host live." /> : (
          <ul style={listStyle}>
            {sessions.map((h) => (
              <li key={h.id} style={rowStyle}>
                <span>{h.id}</span>
                <span style={pill}>{h.status}</span>
                <ActionBar>
                  {role === "Admin" && h.status === "Request" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.hostLiveEvent(role, h.id, { kind: "Upload", hasFile: true }, NOW))}>Upload Desain</Button>
                  )}
                  {role === "SPV" && h.status === "Design" && (
                    <>
                      <Button variant="ghost" onClick={() => notify(services.assets.hostLiveEvent(role, h.id, { kind: "Approve" }, NOW))}>Setujui</Button>
                      <Button variant="danger" onClick={() => notify(services.assets.hostLiveEvent(role, h.id, { kind: "Reject" }, NOW))}>Tolak</Button>
                    </>
                  )}
                  {role === "Admin" && h.status === "Approve" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.hostLiveEvent(role, h.id, { kind: "Schedule", sessionAt: NOW + 86400000, now: NOW }, NOW))}>Jadwalkan</Button>
                  )}
                </ActionBar>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function AdsCPAS() {
  const { services, role, refresh } = useApp();
  const notify = useNotify();
  const campaigns = services.repos.campaigns.all();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const ads = [...services.assets.adsCPAS.values()];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card title="Ads CPAS: Request → Design → Approve → Setup Complete">
        {role === "Admin" ? (
          <ActionBar>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={selectStyle}>
              {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <Button onClick={() => { services.assets.requestAdsCPAS(role, campaignId); refresh(); }}>+ Request Ads CPAS</Button>
          </ActionBar>
        ) : (
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
            Hanya Admin yang dapat membuat permintaan Ads CPAS.
          </div>
        )}
      </Card>
      <Card title="Daftar Ads CPAS">
        {ads.length === 0 ? <EmptyState message="Belum ada iklan CPAS." /> : (
          <ul style={listStyle}>
            {ads.map((a) => (
              <li key={a.id} style={rowStyle}>
                <span>{a.id}</span>
                <span style={pill}>{a.status}</span>
                <ActionBar>
                  {role === "Admin" && a.status === "Request" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.adsCPASEvent(role, a.id, { kind: "Upload", hasFile: true }, NOW))}>Upload Desain</Button>
                  )}
                  {role === "SPV" && a.status === "Design" && (
                    <>
                      <Button variant="ghost" onClick={() => notify(services.assets.adsCPASEvent(role, a.id, { kind: "Approve" }, NOW))}>Setujui</Button>
                      <Button variant="danger" onClick={() => notify(services.assets.adsCPASEvent(role, a.id, { kind: "Reject" }, NOW))}>Tolak</Button>
                    </>
                  )}
                  {role === "Admin" && a.status === "Approve" && (
                    <Button variant="ghost" onClick={() => notify(services.assets.adsCPASEvent(role, a.id, { kind: "Setup", missingFields: [] }, NOW))}>Selesaikan Setup</Button>
                  )}
                </ActionBar>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.colors.border}`,
  fontSize: 13,
};
const listStyle: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 };
const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "8px 0",
  borderBottom: `1px solid ${theme.colors.border}`,
};
