import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar.js";
import { AppProvider } from "../store.js";
import { moduleLabels } from "../i18n.js";
import { NAV_MODULES } from "../navConfig.js";

function renderSidebar() {
  const active = "Dashboard" as const;
  return render(
    <AppProvider>
      <Sidebar active={active} onNavigate={() => {}} />
    </AppProvider>,
  );
}

describe("Sidebar", () => {
  it("renders only the primary nav modules in fixed order", () => {
    renderSidebar();
    const expected = NAV_MODULES.map((m) => moduleLabels[m]);
    for (const label of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Modules that were removed from the primary nav must not appear.
    expect(screen.queryByText(moduleLabels.Notifikasi)).not.toBeInTheDocument();
    expect(screen.queryByText(moduleLabels.Laporan)).not.toBeInTheDocument();
    expect(screen.queryByText(moduleLabels.Calendar)).not.toBeInTheDocument();
  });

  it("marks exactly one entry active (aria-current=page)", () => {
    renderSidebar();
    const current = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain(moduleLabels.Dashboard);
  });

  it("invokes navigation on click", () => {
    let navigated: string | null = null;
    render(
      <AppProvider>
        <Sidebar active="Dashboard" onNavigate={(m) => (navigated = m)} />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText(moduleLabels.Campaign));
    expect(navigated).toBe("Campaign");
  });
});
