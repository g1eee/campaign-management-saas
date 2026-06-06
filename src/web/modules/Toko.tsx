/**
 * Toko (Store) module: status-grouped stores, campaign/category assignment,
 * chat-broadcast composer with per-store delivery status, empty-group states.
 *
 * _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
 */

import { useState } from "react";
import { theme } from "../theme.js";
import { Button, Card, EmptyState } from "../components/ui.js";
import { useApp } from "../store.js";
import { groupStores } from "../../domain/stores.js";
import { deliverBroadcast, InMemoryDeliveryChannel } from "../../infra/delivery/broadcast.js";
import { MAX_BROADCAST_MESSAGE, StoreStatus } from "../../domain/types.js";

const groupLabels: Record<StoreStatus, string> = {
  active: "Aktif",
  "non-active": "Non-aktif",
  "attention-needed": "Perlu Perhatian",
};

export function Toko() {
  const { services, role } = useApp();
  const stores = services.repos.stores.all();
  const groups = groupStores(stores);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sendBroadcast = () => {
    const storeIds = [...selected];
    const channel = new InMemoryDeliveryChannel();
    const outcomes = deliverBroadcast(channel, storeIds, message);
    const r = services.stores.broadcast(role, `b-${Date.now()}`, { message, storeIds }, outcomes);
    if (!r.ok) {
      setResult(`Gagal: ${r.reason}`);
      return;
    }
    setResult(
      r.value.failedStoreIds.length === 0
        ? `Terkirim ke ${storeIds.length} toko.`
        : `Terkirim sebagian. Gagal: ${r.value.failedStoreIds.join(", ")}`,
    );
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      {(Object.keys(groups) as StoreStatus[]).map((status) => (
        <Card key={status} title={`Toko ${groupLabels[status]} (${groups[status].length})`}>
          {groups[status].length === 0 ? (
            <EmptyState message={`Tidak ada toko ${groupLabels[status].toLowerCase()}.`} />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {groups[status].map((s) => (
                <li
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                    {s.name}
                  </label>
                  <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
                    {s.assignedCampaignIds.length} campaign
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <Card title="Chat Broadcast">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_BROADCAST_MESSAGE}
          placeholder="Tulis pesan untuk toko terpilih..."
          style={{
            width: "100%",
            minHeight: 80,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            padding: 10,
            fontSize: 13,
            boxSizing: "border-box",
            fontFamily: theme.font.family,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
            {selected.size} toko dipilih · {message.length}/{MAX_BROADCAST_MESSAGE}
          </span>
          <Button onClick={sendBroadcast}>Kirim Broadcast</Button>
        </div>
        {result && <div style={{ marginTop: 8, fontSize: 13 }}>{result}</div>}
      </Card>
    </div>
  );
}
