/**
 * Frontend application store.
 *
 * Instantiates the domain services over in-memory repositories, seeds demo
 * data, and exposes everything via React context. The current role drives
 * role-based access throughout the UI.
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import { createRepositories, Repositories } from "../infra/db/repositories.js";
import { CampaignService } from "../api/campaign.js";
import { AssetService } from "../api/assets.js";
import {
  MasterDataService,
  NotificationService,
  ReportService,
  StoreService,
  TaskService,
} from "../api/operations.js";
import {
  Campaign,
  CampaignCategory,
  Role,
  Store,
  Task,
} from "../domain/types.js";

export interface AppServices {
  repos: Repositories;
  campaigns: CampaignService;
  assets: AssetService;
  stores: StoreService;
  notifications: NotificationService;
  tasks: TaskService;
  reports: ReportService;
  masterData: MasterDataService;
}

export interface AppState {
  services: AppServices;
  role: Role;
  setRole: (role: Role) => void;
  userId: string;
  /** Monotonic counter bumped to force re-render after mutations. */
  version: number;
  refresh: () => void;
}

const AppContext = createContext<AppState | null>(null);

const DAY = 24 * 60 * 60 * 1000;

function seed(repos: Repositories): void {
  repos.directory.add("spv1", "SPV");
  repos.directory.add("adm1", "Admin");

  const base = Date.UTC(2026, 5, 1); // June 2026 (matches mockup)
  const mk = (
    id: string,
    name: string,
    category: CampaignCategory,
    status: Campaign["status"],
    step: Campaign["step"],
    startDay: number,
    endDay: number,
  ): Campaign => ({
    id,
    name,
    category,
    status,
    step,
    timelineStart: base + startDay * DAY,
    timelineEnd: base + endDay * DAY,
    scheduledStart: base + startDay * DAY,
    scheduledEnd: base + endDay * DAY,
    scheme: {
      name,
      category,
      timelineStart: base + startDay * DAY,
      timelineEnd: base + endDay * DAY,
      targetStoreIds: ["s1", "s2"],
      promoOptions: [
        { id: `${id}-p1`, label: "Diskon", discountPct: 15 },
        { id: `${id}-p2`, label: "Voucher", discountPct: 10 },
      ],
      baseRevenue: 100_000_000,
      baseCost: 60_000_000,
      additionalCosts: 5_000_000,
    },
    calculation: { totalCost: 90_000_000, margin: 10_000_000, npm: 0.1, warning: false },
    targetStoreIds: ["s1", "s2"],
    createdAt: base,
    updatedAt: base,
  });

  repos.campaigns.upsert(mk("c1", "Flash Sale 6.6", "FlashSale", "Live", "Live", 11, 17));
  repos.campaigns.upsert(mk("c2", "Voucher Xtra", "Payday", "Live", "Live", 11, 15));
  repos.campaigns.upsert(mk("c3", "Brand Day", "BrandDay", "Proses", "Eksekusi", 19, 19));
  repos.campaigns.upsert(mk("c4", "Mid Month Sale", "MegaBonus", "Menunggu", "BuatSkema", 24, 29));
  repos.campaigns.upsert(mk("c5", "Payday Sale", "Payday", "Review", "Review", 9, 9));

  const stores: Store[] = [
    { id: "s1", name: "Toko Utama", status: "active", categoryIds: ["cat1"], assignedCampaignIds: ["c1"] },
    { id: "s2", name: "Toko Cabang", status: "active", categoryIds: ["cat1"], assignedCampaignIds: ["c2"] },
    { id: "s3", name: "Toko Lama", status: "non-active", categoryIds: [], assignedCampaignIds: [] },
    { id: "s4", name: "Toko Perlu Perhatian", status: "attention-needed", categoryIds: ["cat2"], assignedCampaignIds: [] },
  ];
  for (const s of stores) repos.stores.upsert(s);

  const tasks: Task[] = [
    { id: "t1", userId: "spv1", title: "Buat Skema Flash Sale 6.6", status: "InProgress", deadline: base + 12 * DAY, reminderSent: false, linkedRefType: "Campaign", linkedRefId: "c1" },
    { id: "t2", userId: "spv1", title: "Review Brand Day", status: "Open", deadline: base + 19 * DAY, reminderSent: false, linkedRefType: "Campaign", linkedRefId: "c3" },
    { id: "t3", userId: "adm1", title: "Siapkan Banner Shopee", status: "Open", deadline: base + 13 * DAY, reminderSent: false },
  ];
  for (const t of tasks) repos.tasks.upsert(t);

  repos.notifications.upsert({ id: "n1", userId: "spv1", kind: "approval", refType: "Campaign", refId: "c1", message: "Skema Flash Sale 6.6 menunggu approval", state: "unread", createdAt: base + 12 * DAY });
  repos.notifications.upsert({ id: "n2", userId: "spv1", kind: "deadline", refType: "Task", refId: "t3", message: "Tugas Buat Banner Shopee mendekati tenggat", state: "unread", createdAt: base + 12 * DAY });
  repos.notifications.upsert({ id: "n3", userId: "adm1", kind: "assetStatus", refType: "Asset", refId: "b1", message: "Approval diberikan untuk Mid Month Sale", state: "read", createdAt: base + 11 * DAY });

  repos.masterData.upsert({ id: "cat1", type: "StoreCategory", uniqueId: "FASHION", fields: { name: "Fashion" } });
  repos.masterData.upsert({ id: "cat2", type: "StoreCategory", uniqueId: "ELEKTRONIK", fields: { name: "Elektronik" } });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("SPV");
  const [version, setVersion] = useState(0);

  const services = useMemo<AppServices>(() => {
    const repos = createRepositories();
    seed(repos);
    return {
      repos,
      campaigns: new CampaignService(repos),
      assets: new AssetService(repos),
      stores: new StoreService(repos),
      notifications: new NotificationService(repos),
      tasks: new TaskService(repos),
      reports: new ReportService(repos),
      masterData: new MasterDataService(repos),
    };
  }, []);

  const userId = role === "SPV" ? "spv1" : "adm1";

  const value: AppState = {
    services,
    role,
    setRole,
    userId,
    version,
    refresh: () => setVersion((v) => v + 1),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const NOW = Date.UTC(2026, 5, 12); // "today" in the demo (12 June 2026)
