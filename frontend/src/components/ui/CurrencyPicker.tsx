"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CURRENCIES, formatCurrency, type CurrencyMeta } from "@/lib/utils/currency";

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
}

export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = CURRENCIES.find((c) => c.code === value) ?? {
    code: value,
    name: value,
    flag: "🌐",
    region: "global" as const,
  };

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const q = search.toLowerCase();
  const filtered = q
    ? CURRENCIES.filter(
        (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
      )
    : CURRENCIES;

  const africa = filtered.filter((c) => c.region === "africa");
  const global = filtered.filter((c) => c.region === "global");

  function select(code: string) {
    onChange(code);
    close();
  }

  const preview = formatCurrency(1234.56, selected.code);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "9px 12px",
          background: "var(--bg-page)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          textAlign: "left",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#C9A84C")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <span style={{ fontSize: "1.2rem", lineHeight: 1, flexShrink: 0 }}>
          {selected.flag}
        </span>
        <span
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "#C9A84C",
            minWidth: "3rem",
            letterSpacing: "0.04em",
          }}
        >
          {selected.code}
        </span>
        <span
          style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-secondary)" }}
        >
          {selected.name}
        </span>
        <span
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          {preview}
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            opacity: 0.45,
            marginLeft: "2px",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            zIndex: 60,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "340px",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              padding: "8px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name…"
              style={{
                width: "100%",
                padding: "7px 10px",
                fontSize: "0.8125rem",
                background: "var(--bg-page)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Scrollable list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {africa.length > 0 && (
              <Group label="Africa" currencies={africa} selected={value} onSelect={select} />
            )}
            {global.length > 0 && (
              <Group label="Global" currencies={global} selected={value} onSelect={select} />
            )}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                }}
              >
                No currencies match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  currencies,
  selected,
  onSelect,
}: {
  label: string;
  currencies: CurrencyMeta[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  return (
    <>
      <div
        style={{
          padding: "6px 12px 5px",
          fontSize: "0.6875rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
        }}
      >
        {label}
      </div>
      {currencies.map((c) => (
        <CurrencyRow key={c.code} c={c} isSelected={c.code === selected} onSelect={onSelect} />
      ))}
    </>
  );
}

function CurrencyRow({
  c,
  isSelected,
  onSelect,
}: {
  c: CurrencyMeta;
  isSelected: boolean;
  onSelect: (code: string) => void;
}) {
  const preview = formatCurrency(1234.56, c.code);

  return (
    <button
      type="button"
      onClick={() => onSelect(c.code)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        background: isSelected ? "rgba(201,168,76,0.07)" : "transparent",
        color: "var(--text-primary)",
        border: "none",
        borderLeft: `2px solid ${isSelected ? "#C9A84C" : "transparent"}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(201,168,76,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span style={{ fontSize: "1.05rem", lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
      <span
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontWeight: 600,
          fontSize: "0.75rem",
          color: isSelected ? "#C9A84C" : "var(--text-secondary)",
          width: "3rem",
          flexShrink: 0,
          letterSpacing: "0.04em",
        }}
      >
        {c.code}
      </span>
      <span
        style={{ flex: 1, fontSize: "0.8125rem", color: "var(--text-secondary)" }}
      >
        {c.name}
      </span>
      <span
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "0.7rem",
          color: "var(--text-muted)",
        }}
      >
        {preview}
      </span>
    </button>
  );
}
