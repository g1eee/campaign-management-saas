import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "./AppShell.js";
import { AppProvider } from "../store.js";
import { moduleLabels, text } from "../i18n.js";

function renderShell() {
  return render(
    <AppProvider>
      <AppShell />
    </AppProvider>,
  );
}

describe("AppShell default view (Req 13.4)", () => {
  it("shows the Papan_Campaign board as the default authenticated view", () => {
    renderShell();
    // The board renders its own <h1> heading; the sidebar uses a button with
    // the same label, so target the heading specifically to assert the active
    // content area is the board (Req 13.4).
    expect(
      screen.getByRole("heading", { name: moduleLabels.Campaign }),
    ).toBeInTheDocument();
    // The board's five Kolom_Status are present, confirming the board (not some
    // other module) is the landing content.
    expect(screen.getByText("Menunggu")).toBeInTheDocument();
    expect(screen.getByText("Selesai")).toBeInTheDocument();
  });
});

describe("AppShell navigation persistence (Req 13.5)", () => {
  it("keeps the board active across re-renders until another module is chosen", () => {
    const { rerender } = renderShell();
    // Board is the active view on first load.
    expect(
      screen.getByRole("heading", { name: moduleLabels.Campaign }),
    ).toBeInTheDocument();

    // Re-rendering the shell must not reset the active view back to a default
    // (state is held across renders) — the board stays active (Req 13.5).
    rerender(
      <AppProvider>
        <AppShell />
      </AppProvider>,
    );
    expect(
      screen.getByRole("heading", { name: moduleLabels.Campaign }),
    ).toBeInTheDocument();
  });

  it("persists the selected module after navigating away and back", () => {
    renderShell();

    // Navigate to Dashboard via the sidebar.
    fireEvent.click(screen.getByRole("button", { name: moduleLabels.Dashboard }));
    expect(screen.getByText("Campaign Aktif")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: moduleLabels.Campaign }),
    ).not.toBeInTheDocument();

    // The chosen view persists: navigating back to the board restores it.
    fireEvent.click(screen.getByRole("button", { name: moduleLabels.Campaign }));
    expect(
      screen.getByRole("heading", { name: moduleLabels.Campaign }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Campaign Aktif")).not.toBeInTheDocument();
  });
});

describe("AppShell unpermitted action hiding (Req 13.7)", () => {
  it("hides actions not permitted for the role while still rendering the module", () => {
    // Default role is SPV, which lacks CreateCampaign; the board (module) is
    // shown but the Tambah_Cepat control (an Admin action) is not rendered.
    renderShell();
    expect(
      screen.getByRole("heading", { name: moduleLabels.Campaign }),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(text.quickAddPlaceholder),
    ).not.toBeInTheDocument();

    // Switching to Admin reveals the permitted action, confirming the control
    // was hidden by access policy rather than absent altogether.
    fireEvent.change(screen.getByDisplayValue("Supervisor (SPV)"), {
      target: { value: "Admin" },
    });
    expect(
      screen.getAllByPlaceholderText(text.quickAddPlaceholder).length,
    ).toBeGreaterThan(0);
  });
});
