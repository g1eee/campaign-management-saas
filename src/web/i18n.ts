/**
 * Bahasa Indonesia user-facing strings (Requirement 3.6).
 *
 * Single source of UI text so every module renders in Bahasa Indonesia.
 */

import {
  CampaignCategory,
  CampaignStatus,
  CampaignStep,
  ModuleId,
} from "../domain/types.js";

export const moduleLabels: Record<ModuleId, string> = {
  Dashboard: "Dashboard",
  Calendar: "Kalender",
  Campaign: "Campaign",
  Workflow: "Workflow",
  Banner: "Banner",
  Toko: "Toko",
  IGStory: "IG Story",
  HostLive: "Host Live",
  AdsCPAS: "Ads CPAS",
  TugasSaya: "Tugas Saya",
  Notifikasi: "Notifikasi",
  Laporan: "Laporan",
  MasterData: "Master Data",
  Pengaturan: "Pengaturan",
};

export const statusLabels: Record<CampaignStatus, string> = {
  Menunggu: "Menunggu",
  Proses: "Proses",
  Review: "Review",
  Live: "Live",
  Selesai: "Selesai",
};

export const stepLabels: Record<CampaignStep, string> = {
  BuatSkema: "Buat Skema",
  Submit: "Submit",
  Eksekusi: "Eksekusi",
  Review: "Review",
  Live: "Live",
};

export const categoryLabels: Record<CampaignCategory, string> = {
  FlashSale: "Flash Sale",
  BrandDay: "Brand Day",
  Payday: "Payday",
  MegaBonus: "Mega Bonus",
  Weekend: "Weekend",
  Lokal: "Lokal",
};

export const text = {
  appName: "CampaignHub",
  appTagline: "Promo Management",
  greeting: "Selamat datang",
  search: "Cari campaign, tugas, dll...",
  noItems: "Belum ada data.",
  loadError: "Data tidak dapat dimuat.",
  save: "Simpan",
  submit: "Submit",
  approve: "Setujui",
  reject: "Tolak",
  cancel: "Batal",
} as const;
