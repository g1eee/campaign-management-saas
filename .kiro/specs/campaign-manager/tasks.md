# Implementation Plan: Campaign Manager

## Overview

Rencana ini mengubah desain Campaign Manager menjadi langkah-langkah kode bertahap dalam **TypeScript** (sesuai kode yang ada), menggunakan Vitest dan fast-check untuk pengujian. Pendekatannya membangun inti domain murni lebih dulu (transisi papan, tambah cepat, validasi, derivasi papan, template, duplikasi, aksi massal, pencarian, palet perintah), lalu lapisan infrastruktur dan API yang membungkusnya dengan kontrol akses dan audit, dan terakhir frontend React yang merangkai semuanya. Setiap langkah dibangun di atas langkah sebelumnya dan diakhiri dengan perangkaian, sehingga tidak ada kode yang menggantung tanpa terintegrasi.

Catatan basis kode: `session.ts` (`isExpired`, `lockoutState`), `accessPolicy.ts` (`isPermitted`, `permittedModules`, `applyGuarded`), `validation.ts`, dan `colorRegistry.ts` sudah ada dan diperluas, bukan ditulis ulang. Modul yang ditandai (BARU) pada desain dibuat baru.

## Tasks

- [ ] 1. Perluas tipe bersama dan dasar pengujian
  - [x] 1.1 Tambahkan tipe dan konstanta baru pada `src/domain/types.ts`
    - Tambahkan `CampaignTemplate`, konstanta `TEMPLATE_MIN/MAX_PROMOS`, `TEMPLATE_MIN/MAX_STORES`, `COPY_MARKER`, `DUPLICATE_NAME_MAX`, `BULK_MIN/MAX`, `SEARCH_MAX`, `PALETTE_MAX_VISIBLE`, `PALETTE_QUERY_MAX`, dan `DEFAULT_DRAFT_CATEGORY`
    - Pastikan tipe baru selaras dengan `Campaign`, `CampaignScheme`, `PromoOption` yang ada
    - _Requirements: 3.1, 7.1, 8.1, 8.5, 10.7, 10.8, 11.6, 12.2, 12.3_

  - [x]* 1.2 Perluas `src/domain/testArbitraries.ts` dengan generator baru
    - Tambahkan `campaignArb` (termasuk status tak dikenal), `statusPairArb`, `attemptHistoryArb`, `templateArb`, `invalidTemplateArb`, `selectionArb`, `searchScenarioArb`, `commandListArb`
    - _Requirements: 2.9, 7.1, 9.2_

- [ ] 2. Kontrol akses dan sesi untuk pivot Campaign Manager
  - [x] 2.1 Perluas `src/domain/accessPolicy.ts` dengan aksi papan
    - Tambahkan aksi Admin (buat, sunting, pindah, duplikasi, hapus Campaign, aksi massal) dan aksi SPV (buat Template_Campaign, tinjau, setujui) ke peta `ROLE_ACTIONS`
    - Pertahankan `isPermitted`, `permittedModules`, `applyGuarded` tanpa efek parsial
    - _Requirements: 1.6, 1.7_

  - [x]* 2.2 Tulis property test izin aksi berbasis peran
    - **Property 3: Izin aksi berbasis peran**
    - **Validates: Requirements 1.6, 1.7**

  - [x]* 2.3 Tulis property test prinsipal tanpa autentikasi
    - **Property 4: Prinsipal tanpa autentikasi tidak diizinkan apa pun**
    - **Validates: Requirements 1.4**

  - [x]* 2.4 Tulis property test penolakan tanpa efek parsial
    - **Property 5: Penolakan tanpa efek parsial**
    - **Validates: Requirements 1.8**

  - [x]* 2.5 Tulis property test modul yang dirender sesuai izin
    - **Property 6: Modul yang dirender sesuai izin peran**
    - **Validates: Requirements 13.6, 13.8**

  - [x]* 2.6 Tulis property test lockout autentikasi (perluas `session.test.ts`)
    - **Property 1: Lockout setelah lima kegagalan beruntun**
    - **Validates: Requirements 1.3**

  - [x]* 2.7 Tulis property test kedaluwarsa sesi (perluas `session.test.ts`)
    - **Property 2: Kedaluwarsa sesi karena tidak aktif**
    - **Validates: Requirements 1.5**

- [ ] 3. Model transisi status papan (otoritas Requirement 9)
  - [x] 3.1 Implementasikan `src/domain/boardTransition.ts`
    - Definisikan `VALID_TRANSITIONS`, `isValidTransition`, `transitionStatus`, dan tipe `BoardAudit`/`StatusTransitionResult`
    - Tolak actor null, transisi keluar dari Selesai, dan transisi tak valid; perlakukan `from===to` sebagai no-op valid tanpa audit
    - _Requirements: 6.1, 6.4, 9.1, 9.2, 9.3, 9.4, 9.7_

  - [x]* 3.2 Tulis property test validitas transisi menyeluruh
    - **Property 20: Validitas transisi status menyeluruh**
    - **Validates: Requirements 6.1, 6.3, 9.2, 9.3, 9.4, 9.7**

  - [x]* 3.3 Tulis property test audit transisi valid
    - **Property 21: Setiap transisi valid mencatat audit lengkap**
    - **Validates: Requirements 6.2, 9.5**

  - [x]* 3.4 Tulis property test pelepasan kolom sama
    - **Property 22: Pelepasan pada kolom yang sama tidak mengubah status**
    - **Validates: Requirements 6.4**

  - [x]* 3.5 Tulis property test status selalu salah satu dari lima nilai
    - **Property 23: Status selalu salah satu dari lima nilai**
    - **Validates: Requirements 9.1**

  - [x]* 3.6 Tulis property test transisi bersamaan berurutan
    - **Property 24: Transisi bersamaan diproses berurutan terhadap status terkini**
    - **Validates: Requirements 9.6**

- [ ] 4. Tambah Cepat campaign
  - [x] 4.1 Implementasikan `src/domain/quickAdd.ts`
    - Implementasikan `createDraft`: pangkas spasi, validasi panjang 1..100, status awal Menunggu, kategori default netral
    - _Requirements: 3.1, 3.4, 3.5_

  - [x]* 4.2 Tulis property test pembuatan draft dari nama valid
    - **Property 12: Tambah Cepat membuat draft dari nama valid**
    - **Validates: Requirements 3.1**

  - [x]* 4.3 Tulis property test nama kosong ditolak
    - **Property 13: Nama kosong (setelah pemangkasan) ditolak**
    - **Validates: Requirements 3.4**

  - [x]* 4.4 Tulis property test nama melebihi 100 karakter ditolak
    - **Property 14: Nama melebihi 100 karakter ditolak**
    - **Validates: Requirements 3.5**

- [ ] 5. Validasi penyuntingan inline dan Opsi_Promo
  - [x] 5.1 Perluas `src/domain/validation.ts` untuk patch field dan Opsi_Promo
    - Tambahkan validasi patch field (nama 1..100, tanggal selesai ≥ mulai) dan penerapan patch murni
    - Tambahkan `validatePromoOption` dan penambahan Opsi_Promo dengan batas 20
    - _Requirements: 4.1, 4.4, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x]* 5.2 Tulis property test nilai valid tersimpan
    - **Property 15: Nilai valid tersimpan pada penyuntingan inline**
    - **Validates: Requirements 4.1, 5.2**

  - [x]* 5.3 Tulis property test nilai tidak valid ditolak
    - **Property 16: Nilai tidak valid ditolak dan nilai sebelumnya dipertahankan**
    - **Validates: Requirements 4.4, 5.3**

  - [x]* 5.4 Tulis property test penambahan Opsi_Promo valid
    - **Property 17: Penambahan Opsi_Promo valid menambah satu entri**
    - **Validates: Requirements 5.4**

  - [x]* 5.5 Tulis property test penambahan Opsi_Promo pada batas 20
    - **Property 18: Penambahan Opsi_Promo pada batas 20 ditolak**
    - **Validates: Requirements 5.5**

  - [x]* 5.6 Tulis property test validasi diskon Opsi_Promo
    - **Property 19: Validasi diskon Opsi_Promo**
    - **Validates: Requirements 5.6**

- [ ] 6. Derivasi tampilan papan Kanban
  - [x] 6.1 Implementasikan `src/domain/boardView.ts` dan perluas `colorRegistry.ts`
    - Implementasikan `buildBoard` (lima kolom terurut, pengelompokan, hitungan, keadaan-kosong, normalisasi status tak dikenal ke Menunggu)
    - Turunkan `CardView` dengan warna kategori dan fallback netral
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

  - [x]* 6.2 Tulis property test struktur dan penempatan kolom
    - **Property 7: Struktur dan penempatan kolom papan**
    - **Validates: Requirements 2.1, 2.2**

  - [x]* 6.3 Tulis property test konservasi hitungan kolom
    - **Property 8: Konservasi hitungan kolom**
    - **Validates: Requirements 2.6, 2.8**

  - [x]* 6.4 Tulis property test derivasi kartu memuat field dan warna
    - **Property 9: Derivasi kartu memuat seluruh field dan warna**
    - **Validates: Requirements 2.3, 2.4**

  - [x]* 6.5 Tulis property test warna default netral
    - **Property 10: Warna default netral untuk kategori tak terdaftar**
    - **Validates: Requirements 2.5**

  - [x]* 6.6 Tulis property test normalisasi status tak dikenal
    - **Property 11: Status kosong atau tak dikenal dinormalisasi ke Menunggu**
    - **Validates: Requirements 2.9**

- [x] 7. Checkpoint - Pastikan seluruh test inti domain papan lulus
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Template campaign yang dapat dipakai ulang
  - [x] 8.1 Implementasikan `src/domain/template.ts`
    - Implementasikan `validateTemplate` (kategori wajib, 1..50 promo, 1..1000 toko) dan `instantiate` (salinan independen mendalam, validasi ulang, status Menunggu)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [x]* 8.2 Tulis property test penyimpanan template dalam batas
    - **Property 25: Penyimpanan template dalam batas diterima**
    - **Validates: Requirements 7.1**

  - [x]* 8.3 Tulis property test template tanpa field wajib ditolak
    - **Property 26: Template tanpa field wajib ditolak**
    - **Validates: Requirements 7.2**

  - [x]* 8.4 Tulis property test template melampaui batas entri
    - **Property 27: Template melampaui batas entri ditolak**
    - **Validates: Requirements 7.3**

  - [x]* 8.5 Tulis property test instansiasi menyalin field dan status Menunggu
    - **Property 28: Instansiasi template menyalin field dan berstatus Menunggu**
    - **Validates: Requirements 7.4**

  - [x]* 8.6 Tulis property test salinan independen template
    - **Property 29: Campaign dari template adalah salinan independen**
    - **Validates: Requirements 7.5**

  - [x]* 8.7 Tulis property test instansiasi memvalidasi ulang konten
    - **Property 30: Instansiasi memvalidasi ulang konten template**
    - **Validates: Requirements 7.7**

- [ ] 9. Duplikasi campaign
  - [x] 9.1 Implementasikan `src/domain/duplication.ts`
    - Implementasikan `duplicate`: salinan independen mendalam, status Menunggu, nama dengan penanda salinan dan pemotongan ≤ 200
    - _Requirements: 8.1, 8.2, 8.5_

  - [x]* 9.2 Tulis property test duplikasi menyalin skema
    - **Property 31: Duplikasi menyalin skema dengan penanda salinan dan status Menunggu**
    - **Validates: Requirements 8.1**

  - [x]* 9.3 Tulis property test hasil duplikasi independen
    - **Property 32: Campaign hasil duplikasi independen dari sumber**
    - **Validates: Requirements 8.2**

  - [x]* 9.4 Tulis property test pemotongan nama duplikasi
    - **Property 33: Pemotongan nama duplikasi mempertahankan penanda salinan**
    - **Validates: Requirements 8.5**

- [ ] 10. Aksi massal
  - [x] 10.1 Implementasikan `src/domain/bulkActions.ts`
    - Implementasikan `bulkSetCategory`, `bulkMove` (memakai `isValidTransition`, keberhasilan parsial), dan `validateSelection` (1..100)
    - _Requirements: 10.1, 10.2, 10.3, 10.7, 10.8_

  - [x]* 10.2 Tulis property test aksi massal kategori
    - **Property 34: Aksi massal kategori memperbarui seluruh terpilih**
    - **Validates: Requirements 10.1**

  - [x]* 10.3 Tulis property test partisi pindah status massal
    - **Property 35: Aksi massal pindah status mempartisi terpilih menjadi berhasil dan gagal**
    - **Validates: Requirements 10.2, 10.3**

  - [x]* 10.4 Tulis property test batas ukuran seleksi
    - **Property 37: Batas ukuran seleksi aksi massal**
    - **Validates: Requirements 10.7, 10.8**

- [ ] 11. Pencarian dan penyaringan
  - [x] 11.1 Implementasikan `src/domain/search.ts`
    - Implementasikan `searchCampaigns`: pencocokan substring nama tanpa membedakan huruf besar/kecil DAN filter kategori, abaikan teks whitespace, tolak teks > 100
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x]* 11.2 Tulis property test pencarian gabungan teks dan kategori
    - **Property 38: Pencarian gabungan teks dan kategori**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

  - [x]* 11.3 Tulis property test teks pencarian melebihi 100 karakter
    - **Property 39: Teks pencarian melebihi 100 karakter ditolak**
    - **Validates: Requirements 11.6**

- [ ] 12. Palet perintah
  - [x] 12.1 Implementasikan `src/domain/commandPalette.ts`
    - Implementasikan `filterCommands`: substring label tanpa membedakan huruf besar/kecil, kueri kosong menampilkan hingga 50 perintah pertama
    - _Requirements: 12.2, 12.3, 12.4_

  - [x]* 12.2 Tulis property test kueri kosong menampilkan hingga 50
    - **Property 40: Kueri kosong menampilkan hingga 50 perintah**
    - **Validates: Requirements 12.2**

  - [x]* 12.3 Tulis property test penyaringan perintah berdasarkan label
    - **Property 41: Penyaringan perintah berdasarkan substring label**
    - **Validates: Requirements 12.3**

- [x] 13. Checkpoint - Pastikan seluruh property test domain lulus
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Infrastruktur penyimpanan template
  - [x] 14.1 Tambahkan `TemplateRepository` pada `src/infra/db/repositories.ts`
    - Buat `TemplateRepository` mewarisi `InMemoryRepository` dan tambahkan ke antarmuka `Repositories`
    - _Requirements: 7.1_

  - [x]* 14.2 Tulis unit test untuk `TemplateRepository`
    - Uji operasi simpan/ambil/hapus dasar
    - _Requirements: 7.1_

- [ ] 15. Lapisan API papan
  - [x] 15.1 Implementasikan `BoardService` pada `src/api/board.ts`
    - Implementasikan `quickAdd`, `moveCampaign`, `editField`, `addPromoOption`, `duplicateCampaign`, `bulkSetCategory`, `bulkMove`, `bulkDelete`, `search`
    - Bungkus domain murni dengan `authorize`, persistence repository, dan pencatatan audit transisi
    - _Requirements: 3.1, 4.1, 5.2, 6.1, 6.2, 8.1, 8.3, 9.5, 10.1, 10.2, 10.5, 11.1_

  - [x]* 15.2 Tulis property test penghapusan massal hanya menghapus yang terpilih
    - **Property 36: Penghapusan massal terkonfirmasi hanya menghapus yang terpilih**
    - **Validates: Requirements 10.5**

  - [x]* 15.3 Tulis unit test jalur galat API papan
    - Uji Tambah Cepat gagal sistem (3.6), pindah gagal simpan (6.6), duplikasi sumber dihapus (8.4)
    - _Requirements: 3.6, 6.6, 8.4_

- [ ] 16. Lapisan API template
  - [x] 16.1 Implementasikan `TemplateService` pada `src/api/template.ts`
    - Implementasikan `save` (SPV) dan `createFrom` (Admin) dengan `authorize` dan repository
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x]* 16.2 Tulis unit test jalur galat template API
    - Uji template dihapus (7.6) dan konten tidak valid saat instansiasi (7.7)
    - _Requirements: 7.6, 7.7_

- [x] 17. Checkpoint - Pastikan seluruh test API lulus
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Papan Kanban (frontend inti)
  - [x] 18.1 Implementasikan `Board.tsx`, `Column`, dan `CampaignCard`
    - Render lima kolom dari `buildBoard`, hitungan judul, keadaan-kosong, dan pesan galat pemuatan dengan mempertahankan susunan terakhir
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.10_

  - [x]* 18.2 Tulis component test render papan, keadaan-kosong, dan galat pemuatan
    - Uji keadaan-kosong (2.8) dan galat pemuatan tanpa kolom kosong palsu (2.10)
    - _Requirements: 2.8, 2.10_

- [ ] 19. Tambah Cepat dan seret-dan-lepas
  - [x] 19.1 Implementasikan kontrol Tambah_Cepat dan pemindahan seret-dan-lepas
    - Sambungkan ke `BoardService.quickAdd` dan `moveCampaign`; terapkan optimistic UI dengan rollback saat transisi tidak valid, lepas di luar kolom, atau gagal simpan
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.3, 6.4, 6.5, 6.6_

  - [x]* 19.2 Tulis component test Tambah Cepat dan seret-dan-lepas
    - Uji input dikosongkan dan kontrol tetap aktif (3.2, 3.3); rollback lepas di luar kolom dan gagal simpan (6.5, 6.6)
    - _Requirements: 3.2, 3.3, 6.5, 6.6_

- [ ] 20. Panel detail dan penyuntingan inline
  - [x] 20.1 Implementasikan `DetailPanel` dengan editor inline dan indikator penyimpanan
    - Render field tanpa menyembunyikan papan; editor inline field + Opsi_Promo + Toko; indikator menyimpan/tersimpan/gagal dan opsi ulang
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x]* 20.2 Tulis component test panel detail dan indikator penyimpanan
    - Uji render tanpa menyembunyikan papan dan tutup panel (5.1, 5.8); indikator menyimpan/tersimpan/gagal/timeout (4.2, 4.3, 4.5, 5.7)
    - _Requirements: 4.2, 4.3, 4.5, 5.1, 5.7, 5.8_

- [ ] 21. Pencarian dan penyaringan (frontend)
  - [x] 21.1 Implementasikan `SearchFilterBar`
    - Input pencarian + pemilih kategori tersambung ke `searchCampaigns`; tampilkan indikasi galat teks > 100 dan pemulihan kriteria kosong
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x]* 21.2 Tulis component test keadaan-kosong hasil pencarian
    - Uji pesan keadaan-kosong saat tidak ada hasil cocok
    - _Requirements: 11.7_

- [ ] 22. Palet perintah, pintasan keyboard, dan UI aksi massal
  - [x] 22.1 Implementasikan `CommandPalette` dan pintasan keyboard
    - Overlay pencarian perintah, buka/tutup dengan pintasan, jalankan perintah, pintasan Tambah_Cepat, kembalikan fokus saat ditutup
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9_

  - [x] 22.2 Implementasikan UI seleksi dan aksi massal
    - Seleksi kartu, terapkan kategori/pindah massal, dan alur konfirmasi penghapusan
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [x]* 22.3 Tulis component test palet perintah dan aksi massal
    - Uji buka/tutup/jalankan/gagal palet (12.1, 12.4-12.9) dan konfirmasi/batal hapus (10.4, 10.6)
    - _Requirements: 10.4, 10.6, 12.1, 12.4, 12.5, 12.6, 12.9_

- [ ] 23. Perangkaian shell dan kontrol akses UI
  - [x] 23.1 Sambungkan papan ke `AppShell` sebagai tampilan utama
    - Jadikan Papan_Campaign tampilan default setelah autentikasi, pertahankan saat navigasi, sembunyikan aksi/modul tak diizinkan via `accessPolicy`, dan pastikan label Bahasa Indonesia + tema pastel
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x]* 23.2 Tulis component test tampilan default, persistensi navigasi, dan penyembunyian aksi
    - Uji papan sebagai tampilan default (13.4), persistensi navigasi (13.5), penyembunyian aksi tak diizinkan (13.7)
    - _Requirements: 13.4, 13.5, 13.7_

- [x] 24. Checkpoint akhir - Pastikan seluruh test lulus
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Task yang ditandai `*` bersifat opsional (test) dan dapat dilewati untuk MVP lebih cepat; task inti implementasi tidak pernah opsional.
- Setiap task merujuk klausa requirement spesifik untuk keterlacakan.
- Property test memakai fast-check minimal 100 iterasi dan diberi komentar penanda `Feature: campaign-manager, Property {nomor}: {teks properti}`.
- Modul `session.ts`, `accessPolicy.ts`, `validation.ts`, dan `colorRegistry.ts` yang sudah ada diperluas, bukan ditulis ulang.
- Jalankan `npm run typecheck` dan `npm test -- --run` setelah implementasi tiap epik.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "4.1", "5.1", "6.1", "8.1", "9.1", "11.1", "12.1", "14.1"] },
    { "id": 2, "tasks": ["10.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.2", "3.3", "3.4", "3.5", "3.6", "4.2", "4.3", "4.4", "5.2", "5.3", "5.4", "5.5", "5.6", "6.2", "6.3", "6.4", "6.5", "6.6", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "9.2", "9.3", "9.4", "11.2", "11.3", "12.2", "12.3", "14.2"] },
    { "id": 3, "tasks": ["10.2", "10.3", "10.4", "15.1", "16.1"] },
    { "id": 4, "tasks": ["15.2", "15.3", "16.2", "18.1"] },
    { "id": 5, "tasks": ["18.2", "19.1"] },
    { "id": 6, "tasks": ["19.2", "20.1"] },
    { "id": 7, "tasks": ["20.2", "21.1"] },
    { "id": 8, "tasks": ["21.2", "22.1", "22.2"] },
    { "id": 9, "tasks": ["22.3", "23.1"] },
    { "id": 10, "tasks": ["23.2"] }
  ]
}
```
