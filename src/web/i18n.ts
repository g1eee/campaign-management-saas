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
  Campaign: "Papan Campaign",
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
  quickAddPlaceholder: "+ Tambah campaign cepat...",
  createError: "Pembuatan campaign gagal.",
  moveError: "Pembaruan status gagal.",
  // Panel_Detail & Editor_Inline (Requirements 4, 5)
  detailTitle: "Detail Campaign",
  close: "Tutup",
  saving: "Menyimpan…",
  saved: "Tersimpan",
  saveFailed: "Perubahan belum tersimpan.",
  retry: "Ulangi",
  fieldName: "Nama",
  fieldCategory: "Kategori",
  fieldStart: "Tanggal mulai",
  fieldEnd: "Tanggal selesai",
  fieldStores: "Toko target",
  fieldPromos: "Opsi Promo",
  addPromo: "Tambah Opsi Promo",
  promoDiscountPlaceholder: "Diskon %",
  addStorePlaceholder: "Tambah toko…",
  remove: "Hapus",
  noStores: "Belum ada toko target.",
  noPromos: "Belum ada opsi promo.",
  // Layanan_Pencarian / SearchFilterBar (Requirement 11)
  searchPlaceholder: "Cari nama campaign…",
  filterAllCategories: "Semua kategori",
  searchNoMatch: "Tidak ada campaign yang cocok.",
  searchLabel: "Cari campaign",
  filterCategoryLabel: "Filter kategori",
  // Palet_Perintah & Pintasan_Keyboard (Requirement 12)
  commandPaletteTitle: "Palet Perintah",
  commandPalettePlaceholder: "Ketik perintah…",
  commandPaletteNoMatch: "Tidak ada perintah yang cocok.",
  commandRunError: "Perintah gagal dijalankan.",
  commandPaletteHint: "Ctrl/⌘ K untuk membuka, Esc untuk menutup",
  cmdQuickAdd: "Tambah campaign cepat",
  cmdFocusSearch: "Cari campaign",
  cmdNewDraft: "Buat campaign draft baru",
  cmdCloseDetail: "Tutup panel detail",
  newDraftName: "Campaign Baru",
  // Layanan_Aksi_Massal / seleksi & toolbar (Requirement 10)
  selectCard: "Pilih campaign",
  bulkSelectedCount: (n: number) => `${n} campaign dipilih`,
  bulkSetCategory: "Ubah kategori",
  bulkSetCategoryAction: "Terapkan kategori",
  bulkMove: "Pindahkan ke",
  bulkMoveAction: "Pindahkan",
  bulkDelete: "Hapus",
  bulkClear: "Bersihkan pilihan",
  bulkChoosePlaceholder: "Pilih…",
  bulkDeleteConfirmTitle: "Hapus campaign terpilih?",
  bulkDeleteConfirmBody: (n: number) =>
    `Tindakan ini akan menghapus ${n} campaign terpilih dan tidak dapat dibatalkan.`,
  bulkDeleteConfirm: "Ya, hapus",
  bulkResultUpdated: (n: number) => `${n} campaign berhasil diperbarui.`,
  bulkResultDeleted: (n: number) => `${n} campaign berhasil dihapus.`,
  bulkResultFailures: (n: number) => `${n} campaign tidak dapat diproses:`,
  bulkActionError: "Aksi massal gagal dijalankan.",
} as const;
