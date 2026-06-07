import { describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import { useEffect } from "react";
import { AppProvider, AppState, useApp } from "../store.js";
import { Board } from "./Board.js";

/**
 * Renders the Board inside the real AppProvider, switching the active role to
 * Admin so that Tambah_Cepat and seret-dan-lepas controls are shown. Returns a
 * `getApp` accessor that exposes the most recent app context (services, repos,
 * refresh) so tests can inject failures and trigger reloads.
 */
function renderAdminBoard() {
  let app: AppState | undefined;

  function Harness() {
    const a = useApp();
    app = a;
    useEffect(() => {
      if (a.role !== "Admin") {
        a.setRole("Admin");
      }
    }, [a]);
    return a.role === "Admin" ? <Board /> : null;
  }

  const utils = render(
    <AppProvider>
      <Harness />
    </AppProvider>,
  );

  return { ...utils, getApp: () => app as AppState };
}

/** Locates a Kolom_Status `<section>` by its column heading label. */
function columnSection(statusLabel: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: statusLabel });
  const section = heading.closest("section");
  if (!section) {
    throw new Error(`No column section found for "${statusLabel}"`);
  }
  return section as HTMLElement;
}

/** A minimal HTML5 DataTransfer stand-in for drag-and-drop fireEvents. */
function makeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    data: store,
    setData(key: string, value: string) {
      store[key] = value;
    },
    getData(key: string) {
      return store[key] ?? "";
    },
    effectAllowed: "",
    dropEffect: "",
  };
}

// ---------------------------------------------------------------------------
// Task 18.2 — render papan, keadaan-kosong, dan galat pemuatan (Req 2.8, 2.10)
// ---------------------------------------------------------------------------

describe("Board render and empty-state (Requirement 2.8)", () => {
  it("renders the five status columns in order", () => {
    renderAdminBoard();
    for (const label of ["Menunggu", "Proses", "Review", "Live", "Selesai"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("shows the empty-state message for a status with no campaigns", () => {
    // The seeded data has no campaign at status Selesai, so its column must
    // display the genuine empty-state message (Req 2.8).
    renderAdminBoard();
    const selesai = columnSection("Selesai");
    expect(
      within(selesai).getByText("Tidak ada campaign pada status ini."),
    ).toBeInTheDocument();
  });
});

describe("Board load failure (Requirement 2.10)", () => {
  it("shows a load error while preserving the last arrangement (no false-empty columns)", async () => {
    const { getApp } = renderAdminBoard();

    // The seeded campaigns are visible before any failure. Cards are queried by
    // their role/accessible name so they are not confused with the category
    // badge or the filter option that share the same label text.
    expect(screen.getByRole("button", { name: "Flash Sale 6.6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brand Day" })).toBeInTheDocument();

    // Make the next data load fail, then trigger a reload.
    getApp().services.repos.campaigns.all = () => {
      throw new Error("load failed");
    };
    act(() => {
      getApp().refresh();
    });

    // The error message is shown (Req 2.10) ...
    await waitFor(() =>
      expect(screen.getByText("Data tidak dapat dimuat.")).toBeInTheDocument(),
    );

    // ... and the previously displayed arrangement is preserved: the real
    // cards remain rather than collapsing into five false-empty columns.
    expect(
      within(columnSection("Live")).getByRole("button", { name: "Flash Sale 6.6" }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("Proses")).getByRole("button", { name: "Brand Day" }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task 19.2 — Tambah Cepat dan seret-dan-lepas (Req 3.2, 3.3, 6.5, 6.6)
// ---------------------------------------------------------------------------

describe("Quick add control (Requirements 3.2, 3.3)", () => {
  it("clears the input and keeps the control active after a successful add", async () => {
    renderAdminBoard();

    const input = screen.getAllByLabelText(
      "+ Tambah campaign cepat...",
    )[0] as HTMLInputElement;

    fireEvent.change(input, { target: { value: "Promo Baru" } });
    expect(input.value).toBe("Promo Baru");

    fireEvent.keyDown(input, { key: "Enter" });

    // Input is cleared on success (Req 3.2) and the control stays active and
    // ready for the next name (Req 3.3).
    await waitFor(() => expect(input.value).toBe(""));
    expect(input).not.toBeDisabled();
    expect(input).toBeInTheDocument();

    // The new draft was persisted and appears on the board.
    await waitFor(() => expect(screen.getByText("Promo Baru")).toBeInTheDocument());
  });
});

describe("Drag-and-drop rollback (Requirements 6.5, 6.6)", () => {
  it("leaves the status unchanged when a card is dropped outside any column (Req 6.5)", () => {
    const { getApp } = renderAdminBoard();

    const moveSpy = vi.fn();
    getApp().services.board.moveCampaign = moveSpy as never;

    const card = screen.getByRole("button", { name: "Flash Sale 6.6" });
    const dataTransfer = makeDataTransfer();

    // Begin dragging, then end the drag without dropping on a column. No
    // column onDrop fires, so no move is attempted and the card stays put.
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragEnd(card, { dataTransfer });

    expect(moveSpy).not.toHaveBeenCalled();
    expect(
      within(columnSection("Live")).getByText("Flash Sale 6.6"),
    ).toBeInTheDocument();
  });

  it("rolls back to the origin column and shows an error when the save fails (Req 6.6)", async () => {
    const { getApp } = renderAdminBoard();

    // Force the persisted move to fail; Proses -> Review is a valid transition,
    // so the optimistic move happens first and must then be rolled back.
    getApp().services.board.moveCampaign = () => {
      throw new Error("save failed");
    };

    const card = screen.getByRole("button", { name: "Brand Day" });
    const dataTransfer = makeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(columnSection("Review"), { dataTransfer });

    // The failure message is surfaced (Req 6.6) ...
    await waitFor(() =>
      expect(screen.getByText("Pembaruan status gagal.")).toBeInTheDocument(),
    );

    // ... and the card is returned to its origin column (Proses), not left in
    // the Review column it was dropped on.
    expect(
      within(columnSection("Proses")).getByRole("button", { name: "Brand Day" }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("Review")).queryByRole("button", { name: "Brand Day" }),
    ).toBeNull();
  });
});
