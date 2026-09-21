"use client";

import React from "react";
import { CashSourceOption } from "../types";

interface MoneySourceSelectorProps {
  value: string;
  onChange: (val: string) => void;
  sources?: CashSourceOption[];
  className?: string;
}

export default function MoneySourceSelector({
  value,
  onChange,
  sources = [],
  className = ""
}: MoneySourceSelectorProps) {
  const safeList = Array.isArray(sources) ? sources : [];

  const filtered = safeList.filter(
    (s) =>
      s.id === "Personal Cash" ||
      s.id === "Pavan Cash" ||
      s.availableBalance > 0 ||
      s.id === value
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-medium focus:border-amber-500 outline-none ${className}`}
    >
      {filtered.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}{" "}
          {s.availableBalance !== undefined &&
          s.id !== "Personal Cash" &&
          s.id !== "Pavan Cash"
            ? `(₹${s.availableBalance.toLocaleString("en-IN")} available)`
            : ""}
        </option>
      ))}
    </select>
  );
}