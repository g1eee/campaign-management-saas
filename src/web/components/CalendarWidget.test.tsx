import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { CalendarWidget, campaignsToCalendarItems } from "./CalendarWidget.js";

const NOW = Date.UTC(2026, 5, 12); // 12 June 2026
const DAY = 24 * 3600 * 1000;

const items = campaignsToCalendarItems([
  {
    id: "c1",
    name: "Flash Sale 6.6",
    category: "FlashSale",
    status: "Live",
    timelineStart: Date.UTC(2026, 5, 11),
    timelineEnd: Date.UTC(2026, 5, 17),
  },
]);

function Harness() {
  const [notes, setNotes] = useState<Record<number, string[]>>({});
  return (
    <CalendarWidget
      items={items}
      initial={NOW}
      notes={notes}
      onAddNote={(day, text) =>
        setNotes((p) => ({ ...p, [day]: [...(p[day] ?? []), text] }))
      }
      onRemoveNote={(day, i) =>
        setNotes((p) => ({ ...p, [day]: (p[day] ?? []).filter((_, idx) => idx !== i) }))
      }
    />
  );
}

describe("CalendarWidget", () => {
  it("offers Bulan / Minggu / Hari views", () => {
    render(<Harness />);
    expect(screen.getByText("Bulan")).toBeInTheDocument();
    expect(screen.getByText("Minggu")).toBeInTheDocument();
    expect(screen.getByText("Hari")).toBeInTheDocument();
  });

  it("has a month slider", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Geser bulan")).toBeInTheDocument();
  });

  it("adds and removes a note on the selected date", () => {
    render(<Harness />);
    const input = screen.getByPlaceholderText(/Tambah catatan/);
    fireEvent.change(input, { target: { value: "Siapkan banner" } });
    fireEvent.click(screen.getByText("Tambah"));
    expect(screen.getByText("📝 Siapkan banner")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Hapus catatan"));
    expect(screen.queryByText("📝 Siapkan banner")).not.toBeInTheDocument();
  });

  it("switches to Hari view", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Hari"));
    // Day view shows the campaign occurring on 12 June (within 11-17 June range)
    expect(screen.getAllByText("Flash Sale 6.6").length).toBeGreaterThan(0);
    void DAY;
  });
});
