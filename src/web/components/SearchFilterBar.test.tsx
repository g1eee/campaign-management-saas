import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../store.js";
import { Board } from "../modules/Board.js";
import { text } from "../i18n.js";

/**
 * Empty-state (keadaan-kosong) behaviour for pencarian/penyaringan (Requirement
 * 11.7). The SearchFilterBar is a presentational control whose criteria drive
 * the Papan_Campaign: when no Kartu_Campaign matches the active search/filter,
 * the board hides all cards and shows a no-match empty-state message. These
 * tests render the Board (which wires the SearchFilterBar to Layanan_Pencarian)
 * and exercise the control through its search input.
 */
function wrap(ui: React.ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

/** The search input rendered by SearchFilterBar (role="searchbox"). */
function searchInput(): HTMLInputElement {
  return screen.getByRole("searchbox", { name: text.searchLabel }) as HTMLInputElement;
}

describe("SearchFilterBar empty-state (Requirement 11.7)", () => {
  it("shows the no-match message and hides all cards when search matches nothing", () => {
    wrap(<Board />);

    // Sanity: a seeded Kartu_Campaign is visible before any search.
    expect(screen.getByText("Flash Sale 6.6")).toBeInTheDocument();

    // Type a search term that no seeded campaign name contains.
    fireEvent.change(searchInput(), { target: { value: "zzz-tidak-ada" } });

    // The board surfaces the empty-state message stating no campaign matched.
    expect(screen.getByText(text.searchNoMatch)).toBeInTheDocument();

    // And every Kartu_Campaign is hidden. (Campaign names are used here rather
    // than category labels, since e.g. "Brand Day" also appears as a filter
    // option in the SearchFilterBar select.)
    expect(screen.queryByText("Flash Sale 6.6")).not.toBeInTheDocument();
    expect(screen.queryByText("Voucher Xtra")).not.toBeInTheDocument();
  });

  it("does not show the no-match message while a search still matches a card", () => {
    wrap(<Board />);

    // "Flash" matches the seeded "Flash Sale 6.6" (case-insensitive substring).
    fireEvent.change(searchInput(), { target: { value: "Flash" } });

    expect(screen.getByText("Flash Sale 6.6")).toBeInTheDocument();
    expect(screen.queryByText(text.searchNoMatch)).not.toBeInTheDocument();
  });

  it("restores cards and clears the no-match message when criteria are cleared", () => {
    wrap(<Board />);

    fireEvent.change(searchInput(), { target: { value: "zzz-tidak-ada" } });
    expect(screen.getByText(text.searchNoMatch)).toBeInTheDocument();

    // Clearing the search text removes all criteria (Requirement 11.4).
    fireEvent.change(searchInput(), { target: { value: "" } });

    expect(screen.queryByText(text.searchNoMatch)).not.toBeInTheDocument();
    expect(screen.getByText("Flash Sale 6.6")).toBeInTheDocument();
  });

  it("exposes the no-match empty-state as a status region for assistive tech", () => {
    wrap(<Board />);

    fireEvent.change(searchInput(), { target: { value: "zzz-tidak-ada" } });

    const status = screen.getByRole("status");
    expect(within(status).getByText(text.searchNoMatch)).toBeInTheDocument();
  });
});
