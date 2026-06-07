/**
 * Palet_Perintah — overlay pencarian perintah yang dipanggil dengan
 * Pintasan_Keyboard (Requirement 12).
 *
 * Saat dibuka, overlay menampilkan kolom input yang langsung siap menerima
 * ketikan (Req 12.1) dan—selama input kosong—daftar seluruh perintah hingga
 * maksimum 50 (Req 12.2). Mengetik menyaring perintah berdasarkan substring
 * label tanpa membedakan huruf besar/kecil melalui `filterCommands`
 * (Req 12.3); bila tidak ada yang cocok, indikasi "tidak ada perintah yang
 * cocok" ditampilkan dan palet tetap terbuka (Req 12.4).
 *
 * Memilih sebuah perintah menjalankannya lalu menutup palet (Req 12.5); sebuah
 * perintah yang berhasil boleh mengubah data Campaign sesuai fungsinya
 * (Req 12.7). Jika perintah melempar galat saat dijalankan, indikasi kesalahan
 * ditampilkan, palet tetap terbuka, dan tidak ada perubahan yang diteruskan
 * (Req 12.6).
 *
 * Menekan Esc menutup palet tanpa menjalankan perintah apa pun dan
 * mengembalikan fokus ke elemen yang aktif sebelum palet dibuka (Req 12.9).
 *
 * Komponen ini presentasional: daftar `Command` beserta efek `run`-nya
 * disediakan oleh induk (`Board`).
 *
 * _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.9_
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { theme } from "../theme.js";
import { text } from "../i18n.js";
import { Command, filterCommands } from "../../domain/commandPalette.js";

interface CommandPaletteProps {
  /** Commands available to run; filtered by label via `filterCommands`. */
  commands: readonly Command[];
  /** Closes the palette (induk clears the open flag). */
  onClose: () => void;
}

/**
 * Renders the command overlay. Mounted by the parent only while open, so it
 * captures the previously focused element on mount and restores it when the
 * palette is dismissed without running a command (Req 12.9).
 */
export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [runError, setRunError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Element focused before the palette opened, restored on Esc/backdrop close.
  const prevFocused = useRef<HTMLElement | null>(null);

  // Capture the prior focus and focus the input promptly on open (Req 12.1, 12.9).
  useEffect(() => {
    prevFocused.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(
    () => filterCommands(commands, query),
    [commands, query],
  );

  // Reset the highlighted row whenever the filtered set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  /** Closes without running anything and returns focus to the prior element (Req 12.9). */
  const closeWithoutRun = () => {
    const el = prevFocused.current;
    onClose();
    if (el && typeof el.focus === "function") {
      el.focus();
    }
  };

  /**
   * Runs a command (Req 12.5, 12.7). A thrown error keeps the palette open and
   * surfaces an error indication without propagating any change (Req 12.6); on
   * success the palette closes and the command itself directs focus.
   */
  const execute = (command: Command) => {
    setRunError(false);
    try {
      command.run();
    } catch {
      setRunError(true);
      return;
    }
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeWithoutRun();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const command = filtered[activeIndex];
      if (command) {
        execute(command);
      }
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        // Click on the backdrop (outside the panel) dismisses without running.
        if (e.target === e.currentTarget) {
          closeWithoutRun();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(35, 38, 58, 0.28)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={text.commandPaletteTitle}
        style={{
          width: 520,
          maxWidth: "92vw",
          background: theme.colors.surface,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadow.pop,
          border: `1px solid ${theme.colors.border}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          aria-label={text.commandPaletteTitle}
          placeholder={text.commandPalettePlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "none",
            borderBottom: `1px solid ${theme.colors.border}`,
            padding: theme.spacing(4),
            fontSize: theme.font.size.lg,
            color: theme.colors.text,
            outline: "none",
          }}
        />

        {runError && (
          <div
            role="alert"
            style={{
              padding: `${theme.spacing(2)} ${theme.spacing(4)}`,
              background: theme.colors.dangerSoft,
              color: theme.colors.danger,
              fontSize: theme.font.size.sm,
              fontWeight: 600,
            }}
          >
            {text.commandRunError}
          </div>
        )}

        <ul
          role="listbox"
          aria-label={text.commandPaletteTitle}
          style={{
            listStyle: "none",
            margin: 0,
            padding: theme.spacing(2),
            maxHeight: "48vh",
            overflowY: "auto",
            display: "grid",
            gap: 2,
          }}
        >
          {filtered.length === 0 ? (
            <li
              role="status"
              style={{
                padding: theme.spacing(4),
                textAlign: "center",
                color: theme.colors.textMuted,
                fontSize: theme.font.size.base,
              }}
            >
              {text.commandPaletteNoMatch}
            </li>
          ) : (
            filtered.map((command, index) => (
              <li key={command.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => execute(command)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    cursor: "pointer",
                    background:
                      index === activeIndex ? theme.colors.primarySoft : "transparent",
                    color: theme.colors.text,
                    borderRadius: theme.radius.sm,
                    padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
                    fontSize: theme.font.size.md,
                  }}
                >
                  {command.label}
                </button>
              </li>
            ))
          )}
        </ul>

        <div
          style={{
            padding: `${theme.spacing(2)} ${theme.spacing(4)}`,
            borderTop: `1px solid ${theme.colors.border}`,
            color: theme.colors.textSoft,
            fontSize: theme.font.size.xs,
          }}
        >
          {text.commandPaletteHint}
        </div>
      </div>
    </div>
  );
}
