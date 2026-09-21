"use client";

import React, { useState } from "react";
import { Milk, Trash2, Calendar } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { DairyRecord } from "../types";

interface BMCDairyProps {
  records: DairyRecord[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function BMCDairy({ records, currentUser, onRefresh, formatDate }: BMCDairyProps) {
  const [dairyDate, setDairyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dairyAmount, setDairyAmount] = useState("");
  const [dairyNotes, setDairyNotes] = useState("BMC Dairy Milk Transport");
  const [editingDairy, setEditingDairy] = useState<DairyRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSaveDairyIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dairyAmount || Number(dairyAmount) <= 0) return;
    setLoading(true);

    try {
      if (editingDairy) {
        await supabase
          .from("dairy_income")
          .update({
            received_date: dairyDate,
            amount: Number(dairyAmount),
            notes: dairyNotes
          })
          .eq("id", editingDairy.id);
        setEditingDairy(null);
      } else {
        await supabase.from("dairy_income").insert({
          received_date: dairyDate,
          amount: Number(dairyAmount),
          notes: dairyNotes
        });
      }
      setDairyAmount("");
      setDairyNotes("BMC Dairy Milk Transport");
      await onRefresh();
    } catch (err: any) {
      alert("Dairy error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDairy = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this dairy entry?")) return;
    setLoading(true);
    try {
      await supabase.from("dairy_income").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {currentUser !== "JC" && (
        <form onSubmit={handleSaveDairyIncome} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-emerald-400 text-base flex items-center gap-2">
              <Milk className="w-5 h-5" /> {editingDairy ? "Edit Dairy Income Entry" : "Record BMC Milk Transport Income"}
            </h3>
            {editingDairy && (
              <button
                type="button"
                onClick={() => { setEditingDairy(null); setDairyAmount(""); setDairyNotes("BMC Dairy Milk Transport"); }}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400">Date Received</label>
              <input
                type="date"
                required
                value={dairyDate}
                onChange={e => setDairyDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Total Income Received (₹) *</label>
              <input
                type="text"
                required
                value={dairyAmount}
                onChange={e => setDairyAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 35000"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1 font-bold"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Notes</label>
              <input
                type="text"
                value={dairyNotes}
                onChange={e => setDairyNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition"
          >
            {editingDairy ? "Update Dairy Entry" : "Save Dairy Income"}
          </button>
        </form>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-2">
        <h4 className="font-semibold text-slate-300 text-sm">BMC Dairy Payout Log</h4>
        {records.length === 0 && <p className="text-xs text-slate-500 py-3 text-center">No dairy records added yet.</p>}
        {records.map(d => (
          <div key={d.id} className="flex justify-between items-center bg-slate-900/60 p-3.5 rounded-lg text-xs border border-slate-800">
            <div>
              <span className="text-white font-medium block text-sm">{d.notes}</span>
              <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-500" /> {formatDate(d.received_date)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold text-base">₹{Number(d.amount).toLocaleString("en-IN")}</span>
              {currentUser === "ADMIN" && (
                <button onClick={() => handleDeleteDairy(d.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}