import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../store.js";
import { Campaign } from "./Campaign.js";
import { Dashboard } from "./Dashboard.js";
import { Banner } from "./Assets.js";

function wrap(ui: React.ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe("Campaign module", () => {
  it("renders the scheme form with a promo slider for SPV", () => {
    wrap(<Campaign />);
    // There are multiple sliders on the page (campaign discount + promo
    // options); the promo slider is the one bounded 0..100.
    const sliders = screen.getAllByRole("slider") as HTMLInputElement[];
    expect(sliders.length).toBeGreaterThanOrEqual(1);
    const promoSlider = sliders.find((s) => s.min === "0" && s.max === "100");
    expect(promoSlider).toBeDefined();
  });

  it("shows the real-time preview heading", () => {
    wrap(<Campaign />);
    expect(screen.getByText("Pratinjau Real-time")).toBeInTheDocument();
  });
});

describe("Dashboard module", () => {
  it("renders summary metric cards", () => {
    wrap(<Dashboard />);
    expect(screen.getByText("Campaign Aktif")).toBeInTheDocument();
    expect(screen.getByText("Butuh Approval")).toBeInTheDocument();
  });
});

describe("Banner module", () => {
  it("shows an empty state before any banner is requested", () => {
    wrap(<Banner />);
    expect(screen.getByText("Belum ada banner.")).toBeInTheDocument();
  });

  it("hides the request action for SPV (only Admin prepares assets)", () => {
    // Default role is SPV which is not permitted PrepareAsset.
    wrap(<Banner />);
    expect(screen.queryByText("+ Request Banner")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Hanya Admin yang dapat membuat permintaan banner/),
    ).toBeInTheDocument();
  });
});
