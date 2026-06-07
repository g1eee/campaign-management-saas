import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppProvider } from "../store.js";
import { CampaignCalc } from "./CampaignCalc.js";

function wrap() {
  return render(
    <AppProvider>
      <CampaignCalc />
    </AppProvider>,
  );
}

describe("CampaignCalc", () => {
  it("renders the calc table with import/export/save controls", () => {
    wrap();
    expect(screen.getByText("Import CSV")).toBeInTheDocument();
    expect(screen.getByText("Export CSV")).toBeInTheDocument();
    expect(screen.getByText("Simpan Campaign")).toBeInTheDocument();
    // a seeded product row is present
    expect(screen.getByText(/Alea Hijab/)).toBeInTheDocument();
  });

  it("exposes the fee-rate editor on toggle", () => {
    wrap();
    fireEvent.click(screen.getByText("Edit rate fee"));
    expect(screen.getByText("Rate Fee Marketplace")).toBeInTheDocument();
    expect(screen.getByText("Reset default")).toBeInTheDocument();
  });

  it("saves a named campaign and shows it in the saved list", () => {
    wrap();
    fireEvent.change(screen.getByLabelText("Nama campaign"), {
      target: { value: "Flash Sale 6.6" },
    });
    fireEvent.click(screen.getByText("Simpan Campaign"));
    expect(screen.getByText("Tersimpan:")).toBeInTheDocument();
    // the saved chip carries the campaign name (button)
    expect(
      screen.getAllByText("Flash Sale 6.6").length,
    ).toBeGreaterThanOrEqual(1);
  });
});
