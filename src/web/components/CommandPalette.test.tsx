import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import { CommandPalette } from "./CommandPalette.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Command } from "../../domain/commandPalette.js";
import { text } from "../i18n.js";

/**
 * Component tests for the Palet_Perintah overlay (Requirement 12) and the
 * bulk-delete confirmation dialog (Requirement 10.4, 10.6).
 *
 * These exercise the UI behaviors the pure modules cannot cover: open/focus,
 * run+close, run-error retention, Esc close with focus restore, and the
 * confirm/cancel branches of ConfirmDialog.
 */

function makeCommands(overrides: Partial<Command>[] = []): Command[] {
  const base: Command[] = [
    { id: "quick-add", label: text.cmdQuickAdd, run: vi.fn() },
    { id: "focus-search", label: text.cmdFocusSearch, run: vi.fn() },
    { id: "new-draft", label: text.cmdNewDraft, run: vi.fn() },
  ];
  return base.map((cmd, i) => ({ ...cmd, ...(overrides[i] ?? {}) }));
}

/**
 * Harness that mounts the palette on demand from a trigger button. The trigger
 * is focused before opening so we can assert focus is restored on close
 * (Req 12.9). The palette is only mounted while `open`, matching how the Board
 * mounts it.
 */
function PaletteHarness({
  commands,
  onClose,
}: {
  commands: readonly Command[];
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>
        buka palet
      </button>
      {open && (
        <CommandPalette
          commands={commands}
          onClose={() => {
            setOpen(false);
            onClose?.();
          }}
        />
      )}
    </div>
  );
}

function openPalette() {
  const trigger = screen.getByTestId("trigger");
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

describe("CommandPalette", () => {
  it("focuses the command input ready for typing when opened (Req 12.1)", () => {
    render(<PaletteHarness commands={makeCommands()} />);
    openPalette();

    const input = screen.getByPlaceholderText(text.commandPalettePlaceholder);
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("lists available commands while the query is empty (Req 12.2)", () => {
    render(<PaletteHarness commands={makeCommands()} />);
    openPalette();

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText(text.cmdQuickAdd)).toBeInTheDocument();
    expect(within(listbox).getByText(text.cmdFocusSearch)).toBeInTheDocument();
    expect(within(listbox).getByText(text.cmdNewDraft)).toBeInTheDocument();
  });

  it("shows a no-match indication and stays open when nothing matches (Req 12.4)", () => {
    render(<PaletteHarness commands={makeCommands()} />);
    openPalette();

    const input = screen.getByPlaceholderText(text.commandPalettePlaceholder);
    fireEvent.change(input, { target: { value: "zzz-tidak-ada" } });

    expect(screen.getByText(text.commandPaletteNoMatch)).toBeInTheDocument();
    // Palette remains open: the dialog and input are still present.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it("runs the selected command and closes the palette (Req 12.5)", () => {
    const run = vi.fn();
    const onClose = vi.fn();
    const commands = makeCommands([{ run }]);
    render(<PaletteHarness commands={commands} onClose={onClose} />);
    openPalette();

    fireEvent.click(screen.getByText(text.cmdQuickAdd));

    expect(run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    // Closed: the dialog is no longer rendered.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("surfaces an error and keeps the palette open when a command throws (Req 12.6)", () => {
    const failing = vi.fn(() => {
      throw new Error("gagal");
    });
    const onClose = vi.fn();
    const commands = makeCommands([{ run: failing }]);
    render(<PaletteHarness commands={commands} onClose={onClose} />);
    openPalette();

    fireEvent.click(screen.getByText(text.cmdQuickAdd));

    expect(failing).toHaveBeenCalledTimes(1);
    // Error indication shown, palette still open, close not propagated.
    expect(screen.getByRole("alert")).toHaveTextContent(text.commandRunError);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Esc without running any command and restores prior focus (Req 12.9)", () => {
    const commands = makeCommands();
    render(<PaletteHarness commands={commands} />);
    const trigger = openPalette();

    const input = screen.getByPlaceholderText(text.commandPalettePlaceholder);
    fireEvent.keyDown(input, { key: "Escape" });

    // No command ran.
    for (const cmd of commands) {
      expect(cmd.run).not.toHaveBeenCalled();
    }
    // Palette closed and focus returned to the element active before opening.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("dismisses without running when the backdrop is clicked (Req 12.9)", () => {
    const commands = makeCommands();
    render(<PaletteHarness commands={commands} />);
    openPalette();

    const backdrop = screen.getByRole("presentation");
    fireEvent.mouseDown(backdrop);

    for (const cmd of commands) {
      expect(cmd.run).not.toHaveBeenCalled();
    }
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ConfirmDialog (bulk delete confirmation)", () => {
  it("requests confirmation without mutating data, then deletes on confirm (Req 10.4, 10.5)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title={text.bulkDeleteConfirmTitle}
        body={text.bulkDeleteConfirmBody(3)}
        confirmLabel={text.bulkDeleteConfirm}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // The dialog is shown as a confirmation request (no deletion yet).
    expect(screen.getByText(text.bulkDeleteConfirmTitle)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(text.bulkDeleteConfirm));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("leaves campaigns unchanged when the user cancels (Req 10.6)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title={text.bulkDeleteConfirmTitle}
        body={text.bulkDeleteConfirmBody(2)}
        confirmLabel={text.bulkDeleteConfirm}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText(text.cancel));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on Esc without deleting (Req 10.6)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title={text.bulkDeleteConfirmTitle}
        body={text.bulkDeleteConfirmBody(1)}
        confirmLabel={text.bulkDeleteConfirm}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels when the backdrop is clicked without deleting (Req 10.6)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title={text.bulkDeleteConfirmTitle}
        body={text.bulkDeleteConfirmBody(1)}
        confirmLabel={text.bulkDeleteConfirm}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const backdrop = screen.getByRole("presentation");
    fireEvent.mouseDown(backdrop);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
