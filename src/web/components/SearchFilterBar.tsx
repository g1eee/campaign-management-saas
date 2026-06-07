/**
 * SearchFilterBar — pencarian dan penyaringan cepat Papan_Campaign (Requirement 11).
 *
 * Kontrol presentasional: sebuah input pencarian nama Campaign dan pemilih
 * Campaign_Category. Komponen ini tidak menyaring sendiri; ia melaporkan
 * perubahan kriteria ke induk (`Board`) yang memanggil `searchCampaigns`
 * (Layanan_Pencarian) dan merender hasilnya. Bila induk menolak teks yang
 * melebihi batas panjang (Requirement 11.6), pesan galat ditampilkan di sini
 * berdampingan dengan kontrol—tanpa mengubah teks yang sedang diketik.
 *
 * Pemulihan kriteria kosong (Requirement 11.4) terjadi secara alami: ketika
 * input dikosongkan dan kategori dikembalikan ke "Semua kategori", induk
 * menerima kriteria kosong dan menampilkan kembali seluruh Kartu_Campaign.
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.7_
 */

import { theme } from "../theme.js";
import { categoryLabels, text } from "../i18n.js";
import { CAMPAIGN_CATEGORIES, CampaignCategory } from "../../domain/types.js";

interface SearchFilterBarProps {
  /** Current search text (controlled). May exceed the limit; induk yang menolak. */
  searchText: string;
  /** Currently selected category filter, or undefined for "Semua kategori". */
  category: CampaignCategory | undefined;
  /** Error indication to show alongside the controls (e.g. teks > 100). */
  error: string | null;
  onSearchTextChange: (value: string) => void;
  onCategoryChange: (category: CampaignCategory | undefined) => void;
}

/** Sentinel select value representing "no category filter" (Requirement 11.4). */
const ALL = "__all__";

/**
 * Renders the search input + category selector. The error message (when present)
 * is announced via role="alert" and rendered beneath the controls so it can be
 * shown together with the empty-state on the board (Requirement 11.7).
 */
export function SearchFilterBar({
  searchText,
  category,
  error,
  onSearchTextChange,
  onCategoryChange,
}: SearchFilterBarProps) {
  return (
    <div style={{ display: "grid", gap: theme.spacing(2) }}>
      <div
        style={{
          display: "flex",
          gap: theme.spacing(3),
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          value={searchText}
          aria-label={text.searchLabel}
          placeholder={text.searchPlaceholder}
          onChange={(e) => onSearchTextChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          style={{
            flex: "1 1 240px",
            minWidth: 200,
            boxSizing: "border-box",
            background: theme.colors.surface,
            border: `1px solid ${error ? theme.colors.danger : theme.colors.border}`,
            borderRadius: theme.radius.md,
            padding: theme.spacing(2),
            fontSize: theme.font.size.base,
            color: theme.colors.text,
          }}
        />
        <select
          value={category ?? ALL}
          aria-label={text.filterCategoryLabel}
          onChange={(e) => {
            const value = e.target.value;
            onCategoryChange(value === ALL ? undefined : (value as CampaignCategory));
          }}
          style={{
            flex: "0 0 auto",
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            padding: theme.spacing(2),
            fontSize: theme.font.size.base,
            color: theme.colors.text,
          }}
        >
          <option value={ALL}>{text.filterAllCategories}</option>
          {CAMPAIGN_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat] ?? cat}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          style={{ color: theme.colors.danger, fontSize: theme.font.size.sm }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
