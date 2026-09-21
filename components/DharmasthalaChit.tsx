"use client";

import React, { useState } from "react";
import { Clock, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { DharmasthalaChit } from "../types";

interface DharmasthalaProps {
  chits: DharmasthalaChit[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function DharmasthalaSection({ chits, currentUser, onRefresh, formatDate }: DharmasthalaProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupName, setGroupName] = useState("Dharmasthala Sangha");
  const [totalLoan, setTotalLoan] = useState("300000");
  const [weeklyKanth, setWeeklyKanth] = useState("3500");
  const [totalKanths, setTotalKanths] = useState("100");
  const [completedKanths, setCompletedKanths] = useState("18");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const [payKanthModal, setPayKanthModal] = useState<DharmasthalaChit | null>(null);
  const [kanthAmount, setKanthAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [paySource, setPaySource] = useState<any>("Centering");

  const [loading, setLoading] = useState(false);

  const handleCreateChit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("dharmasthala_chits").insert({
        group_name: groupName,
        total_loan_amount: Number(totalLoan) || 300000,
        weekly_kanth_amount: Number(weeklyKanth) || 3500,
        total_kanths: Number(totalKanths) || 100,
        completed_kanths: Number(completedKanths) || 0,
        start_date: startDate,
        meeting_day: "Thursday"
      });
      if (error) throw error;
      setShowAddModal(false);
      await onRefresh();
    } catch (err: any) {
      alert("Error adding Sangha: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payKanthModal || !kanthAmount) return;
    setLoading(true);
    try {
      const nextKanthNumber = (payKanthModal.completed_kanths || 0) + 1;

      await supabase.from("dharmasthala_payments").insert({
        chit_id: payKanthModal.id,
        amount: Number(kanthAmount),
        paid_date: payDate,
        kanth_number: nextKanthNumber,
        source: paySource
      });

      await supabase.from("dharmasthala_chits").update({
        completed_kanths: nextKanthNumber
      }).eq("id", payKanthModal.id);

      setPayKanthModal(null);
      setKanthAmount("");
      await onRefresh();
    } catch (err: any) {
      alert("Payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChit = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this Dharmasthala Sangha account?")) return;
    setLoading(true);
    try {
      await supabase.from("dharmasthala_chits").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-400" /> Dharmasthala Weekly Sangha (ಧರ್ಮಸ್ಥಳ ಸಂಘ - ಪ್ರತಿ ಗುರುವಾರ)
          </h2>
          <p className="text-xs text-slate-400">Weekly Thursday Kanth Payments • Total Loan & Pending Kanths</p>
        </div>

        {currentUser === "ADMIN" && (
          <button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow">
            <Plus className="w-4 h-4" /> Add Sangha Account
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chits.map((c) => {
          const remainingKanths = Math.max(0, c.total_kanths - c.completed_kanths);
          const percent = Math.round((c.completed_kanths / c.total_kanths) * 100);

          return (
            <div key={c.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono uppercase text-amber-400 font-bold">Every Thursday Kanth</span>
                  <h3 className="font-extrabold text-lg text-white mt-0.5">{c.group_name}</h3>
                  <span className="text-xs text-slate-400">Total Loan: ₹{Number(c.total_loan_amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-amber-400">₹{Number(c.weekly_kanth_amount).toLocaleString("en-IN")}/wk</span>
                  {currentUser === "ADMIN" && (
                    <button onClick={() => handleDeleteChit(c.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-bold">{c.completed_kanths} Kanths Paid</span>
                  <span className="text-amber-400 font-bold">{remainingKanths} Pending Kanths</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Payment day: Every Thursday</span>
                <button
                  type="button"
                  onClick={() => {
                    setPayKanthModal(c);
                    setKanthAmount(c.weekly_kanth_amount.toString());
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-lg transition"
                >
                  Pay Thursday Kanth
                </button>
              </div>

              {/* Payment Log */}
              {c.payments && c.payments.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recent Thursday Kanths:</span>
                  {c.payments.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>• Kanth #{p.kanth_number}: ₹{Number(p.amount).toLocaleString("en-IN")} on {formatDate(p.paid_date)}</span>
                      <span className="text-[11px] text-amber-400 font-medium">{p.source}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pay Kanth Modal */}
      {payKanthModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRecordPayment} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Pay Kanth: #{payKanthModal.completed_kanths + 1}</h3>
              <button type="button" onClick={() => setPayKanthModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Kanth Amount (₹) *</label>
              <input required value={kanthAmount} onChange={e => setKanthAmount(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Date Paid</label>
                <input type="date" required value={payDate} onChange={e => setPayDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Payment Source *</label>
                <select value={paySource} onChange={e => setPaySource(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1">
                  <option value="Centering">🏗️ Centering Cash</option>
                  <option value="BMC Dairy">🥛 BMC Dairy Cash</option>
                  <option value="Pavan Cash">🧑‍🌾 Pavan's Cash</option>
                  <option value="JC Salary Cash">💼 JC Salary Cash</option>
                  <option value="Personal Cash">💵 Outside Cash</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Confirm Thursday Kanth
            </button>
          </form>
        </div>
      )}

      {/* Add Sangha Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateChit} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Add Dharmasthala Sangha Loan</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Group / Sangha Name</label>
              <input required value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Dharmasthala Sangha" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Total Loan (₹)</label>
                <input value={totalLoan} onChange={e => setTotalLoan(e.target.value)} placeholder="300000" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Weekly Kanth (₹)</label>
                <input value={weeklyKanth} onChange={e => setWeeklyKanth(e.target.value)} placeholder="3500" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Total Kanths (Weeks)</label>
                <input type="number" value={totalKanths} onChange={e => setTotalKanths(e.target.value)} placeholder="100" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Already Paid (ಈಗಾಗಲೇ ಕಟ್ಟಿದ್ದು)</label>
                <input type="number" value={completedKanths} onChange={e => setCompletedKanths(e.target.value)} placeholder="18" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Save Sangha Account
            </button>
          </form>
        </div>
      )}
    </div>
  );
}