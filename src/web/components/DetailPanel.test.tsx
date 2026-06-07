import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useEffect } from "react";
import { AppProvider, useApp, AppServices } from "../store.js";
import { DetailPanel } from "./DetailPanel.js";
import { text } from "../i18n.js";

/**
 * Component tests for Panel_Detail (Requirements 4, 5).
 *
 * Covers rendering the panel alongside (not hiding) the board and the close
 * control (Req 5.1, 5.8), plus the autosave indicator lifecycle:
 * menyimpan / tersimpan / gagal / timeout (Req 4.2, 4.3, 4.5, 5.7).
 */

/**
 * Promotes the current role to Admin (the role permitted to edit Campaigns)
 * and hands the live service instance back to the test so a save can be driven
 * to success or failure.
 */
function Capture({ onReady }: { onReady: (s: AppServices) => void }) {
  const { services, setRole } = useApp();
  useEffect(() => {
    setRole("Admin");
    onReady(services);
  }, [services, setRole, onReady]);
  return null;
}

/** Renders the panel next to a stand-in board so coexistence can be asserted. */
function renderPanel(opts?: { onClose?: () => void; onSaved?: () => void }) {
  const onClose = opts?.onClose ?? vi.fn();
  const onSaved = opts?.onSaved ?? vi.fn();
  let services: AppServices | null = null;
  render(
    <AppProvider>
      <Capture onReady={(s) => (services = s)} />
      <main data-testid="papan-campaign">Papan Campaign</main>
      <DetailPanel campaignId="c1" onClose={onClose} onSaved={onSaved} />
    </AppProvider>,
  );
  return { onClose, onSaved, getServices: () => services as AppServices };
}

/** Replaces editField with a stub to exercise the async save indicators. */
function stubEditField(
  services: AppServices,
  impl: (...args: unknown[]) => unknown,
): void {
  (services.board as unknown as { editField: unknown }).editField = impl;
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("DetailPanel rendering (Req 5.1, 5.8)", () => {
  it("shows the campaign fields alongside the board without hiding it (5.1)", () => {
    renderPanel();

    // The board stand-in is still present: the panel does not replace it.
    expect(screen.getByTestId("papan-campaign")).toBeInTheDocument();

    // The side panel and the seeded Campaign fields are visible (Req 5.1).
    expect(
      screen.getByRole("complementary", { name: text.detailTitle }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(text.fieldName)).toHaveValue("Flash Sale 6.6");
    expect(screen.getByLabelText(text.fieldCategory)).toBeInTheDocument();
    expect(screen.getByLabelText(text.fieldStart)).toBeInTheDocument();
    expect(screen.getByLabelText(text.fieldEnd)).toBeInTheDocument();
    expect(screen.getByText(text.fieldStores)).toBeInTheDocument();
    expect(
      screen.getByLabelText(text.promoDiscountPlaceholder),
    ).toBeInTheDocument();
  });

  it("invokes onClose when the close control is activated (5.8)", () => {
    const onClose = vi.fn();
    renderPanel({ onClose });

    fireEvent.click(screen.getByRole("button", { name: text.close }));

    expect(onClose).toHaveBeenCalledTimes(1);
    // The board remains rendered behind the (still-mounted) panel.
    expect(screen.getByTestId("papan-campaign")).toBeInTheDocument();
  });
});

describe("DetailPanel save indicators (Req 4.2, 4.3, 4.5, 5.7)", () => {
  it("shows the saved indicator and refreshes the board on success (4.2)", async () => {
    const onSaved = vi.fn();
    renderPanel({ onSaved });

    const name = screen.getByLabelText(text.fieldName);
    fireEvent.change(name, { target: { value: "Flash Sale 6.6 (revisi)" } });
    fireEvent.blur(name);

    expect(await screen.findByText(/Tersimpan/)).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows the saving indicator while a save is in flight (4.3)", async () => {
    const { getServices } = renderPanel();
    // A save that never settles keeps the panel in the in-flight state.
    stubEditField(getServices(), () => new Promise(() => {}));

    const name = screen.getByLabelText(text.fieldName);
    fireEvent.change(name, { target: { value: "Sedang disimpan" } });
    fireEvent.blur(name);

    expect(await screen.findByText(text.saving)).toBeInTheDocument();
  });

  it("treats a save that does not complete within 10s as failed (4.5)", async () => {
    const { getServices } = renderPanel();
    stubEditField(getServices(), () => new Promise(() => {}));

    vi.useFakeTimers();
    const name = screen.getByLabelText(text.fieldName);
    fireEvent.change(name, { target: { value: "Lambat" } });
    fireEvent.blur(name);

    // Advance past the 10-second autosave deadline (Req 4.5).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText(text.saveFailed)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: text.retry }),
    ).toBeInTheDocument();
  });

  it("keeps the entered value and offers retry when a save fails (5.7)", async () => {
    const { getServices } = renderPanel();
    // A thrown error models a system failure of an already-validated value.
    stubEditField(getServices(), () => {
      throw new Error("kegagalan sistem");
    });

    const name = screen.getByLabelText(text.fieldName) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Nilai tervalidasi" } });
    fireEvent.blur(name);

    expect(await screen.findByText(text.saveFailed)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: text.retry }),
    ).toBeInTheDocument();
    // The entered value is retained so the user can retry (Req 5.7).
    expect(name.value).toBe("Nilai tervalidasi");
  });
});
