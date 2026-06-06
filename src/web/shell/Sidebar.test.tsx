import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar.js";
import { AppProvider } from "../store.js";
import { moduleLabels } from "../i18n.js";
import { MODULE_ORDER } from "../../domain/types.js";

function renderSidebar() {
  let active = "Dashboard" as const;
  return render(
    <AppProvider>
      <Sidebar active={active} onNavigate={() => {}} />
    </AppProvider>,
  );
}

describe("Sidebar", () => {
  it("renders all modules in fixed order", () => {
    renderSidebar();
    const buttons = screen
      .getAllByRole("button")
      .map((b) => b.textContent)
      .filter((t) => MODULE_ORDER.some((m) => moduleLabels[m] === t));
    const expected = MODULE_ORDER.map((m) => moduleLabels[m]);
    expect(buttons).toEqual(expected);
  });

  it("marks exactly one entry active (aria-current=page)", () => {
    renderSidebar();
    const current = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe(moduleLabels.Dashboard);
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
