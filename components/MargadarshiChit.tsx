"use client";

import React, { useState } from "react";
import { HandCoins, Plus, Calendar, Trash2, X, Award } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { MargadarshiChit, CashSourceOption } from "../types";
import MoneySourceSelector from "./MoneySourceSelector";

interface MargadarshiChitProps {
  chits: MargadarshiChit[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  availableSources: CashSourceOption[];
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function MargadarshiChitSection({
  chits,
  currentUser,
  availableSources,
  onRefresh,
  formatDate
}: MargadarshiChitProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberName, setMemberName] = useState("JC (Dad)");
  const [chitValue, setChitValue] = useState("500000");
  const [dueDay, setDueDay] = useState("10");
  const [isLifted, setIsLifted] = useState(false);
  const [liftedAmount, setLiftedAmount] = useState("384000");

  const [payChitModal, setPayChitModal] = useState<MargadarshiChit | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [paySource, setPaySource] = useState<string>("Centering Cash");

  const [liftModal, setLiftModal] = useState<MargadarshiChit | null>(null);
  const [liftAmountInput, setLiftAmountInput] = useState("384000");
  const [liftDate, setLiftDate] = useState(new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(false);

  const handleCreateChit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("margadarshi_chits").insert({
        member_name: memberName,
        chit_value: Number(chitValue) || 500000,
        monthly_due_day: Number(dueDay) || 10,
        is_lifted: isLifted,
        lifted_amount: isLifted ? Number(liftedAmount) || 0 : 0,
        lifted_date: isLifted ? new Date().toISOString().split("T")[0] : null
      });
      if (error) throw error;
      setShowAddModal(false);
      await onRefresh();
    } catch (err: any) {
      alert("Error adding chit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payChitModal || !payAmount) return;
    setLoading(true);
    try {
      await supabase.from("margadarshi_payments").insert({
        chit_id: payChitModal.id,
        installment_amount: Number(payAmount),
        paid_date: payDate,
        source: paySource
      });
      setPayChitModal(null);
      setPayAmount("");
      await onRefresh();
    } catch (err: any) {
      alert("Chit payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLiftChit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liftModal || !liftAmountInput) return;
    setLoading(true);
    try {
      await supabase.from("margadarshi_chits").update({
        is_lifted: true,
        lifted_amount: Number(liftAmountInput),
        lifted_date: liftDate
      }).eq("id", liftModal.id);
      setLiftModal(null);
      await onRefresh();
    } catch (err: any) {
      alert("Lift error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChit = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this chit account and all its payment history?")) return;
    setLoading(true);
    try {
      await supabase.from("margadarshi_chits").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this payment record?")) return;
    setLoading(true);
    try {
      await supabase.from("margadarshi_payments").delete().eq("id", id);
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
            <HandCoins className="w-6 h-6 text-amber-400" /> Margadarshi Chit Fund (ಮಾರ್ಗದರ್ಶಿ ಚೀಟಿ)
          </h2>
          <p className="text-xs text-slate-400">₹5 Lakh Chits • Dad's Lifted Chit & Brother's Active Chit</p>
        </div>

        {currentUser === "ADMIN" && (
          <button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow">
            <Plus className="w-4 h-4" /> Add Chit Account
          </button>
        )}
      </div>

      {/* Chits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chits.map((chit) => (
          <div key={chit.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">₹{Number(chit.chit_value).toLocaleString("en-IN")} Chit Fund</span>
                <h3 className="font-extrabold text-lg text-white mt-0.5">{chit.member_name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${chit.is_lifted ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}`}>
                  {chit.is_lifted ? "LIFTED / ಎತ್ತಲಾಗಿದೆ" : "SAVING / ಉಳಿತಾಯ"}
                </span>
                {currentUser === "ADMIN" && (
                  <button onClick={() => handleDeleteChit(chit.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              {chit.is_lifted ? (
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Cash Received (ಎತ್ತಿದ ಹಣ):</span>
                  <strong className="text-emerald-400 font-extrabold">₹{Number(chit.lifted_amount).toLocaleString("en-IN")}</strong>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-amber-400 font-bold">Accumulating Monthly Dividends</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Due Date:</span>
                <strong className="text-white">{chit.monthly_due_day}th of every month</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setPayChitModal(chit);
                  setPayAmount("10000");
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-lg text-xs transition"
              >
                Pay Monthly Installment
              </button>

              {!chit.is_lifted && (
                <button
                  type="button"
                  onClick={() => {
                    setLiftModal(chit);
                    setLiftAmountInput("384000");
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition flex items-center gap-1"
                >
                  <Award className="w-3.5 h-3.5" /> Lift Chit
                </button>
              )}
            </div>

            {/* Installment Log */}
            {chit.payments && chit.payments.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recent Paid Months:</span>
                {chit.payments.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>• Paid: ₹{Number(p.installment_amount).toLocaleString("en-IN")} on {formatDate(p.paid_date)} via {p.source}</span>
                    {currentUser === "ADMIN" && (
                      <button onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 p-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pay Modal */}
      {payChitModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRecordPayment} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Pay Chit: {payChitModal.member_name}</h3>
              <button type="button" onClick={() => setPayChitModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Installment Amount to Pay (₹) *</label>
              <input required value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Date Paid</label>
                <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Payment Source (ಹಣದ ಮೂಲ) *</label>
                <div className="mt-1">
                  <MoneySourceSelector
                    value={paySource}
                    onChange={setPaySource}
                    sources={availableSources}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Confirm Chit Payment
            </button>
          </form>
        </div>
      )}

      {/* Lift Chit Modal */}
      {liftModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleLiftChit} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Lift Chit (ಚೀಟಿ ಎತ್ತುವುದು)</h3>
              <button type="button" onClick={() => setLiftModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Bid Amount Lifted (ಕೈಗೆ ಸಿಕ್ಕ ಹಣ) (₹) *</label>
              <input required value={liftAmountInput} onChange={(e) => setLiftAmountInput(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
            </div>

            <div>
              <label className="text-xs text-slate-400">Date Lifted</label>
              <input type="date" required value={liftDate} onChange={(e) => setLiftDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg text-sm transition mt-2">
              Confirm Chit Lift
            </button>
          </form>
        </div>
      )}

      {/* Add Chit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateChit} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Add Chit Account</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Member Name *</label>
              <input required value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. JC (Dad) / Brother" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Chit Value (₹)</label>
                <input value={chitValue} onChange={(e) => setChitValue(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Monthly Due Day (1-31)</label>
                <input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="liftCheck" checked={isLifted} onChange={(e) => setIsLifted(e.target.checked)} className="w-4 h-4 text-amber-500 rounded" />
              <label htmlFor="liftCheck" className="text-xs text-slate-300 font-bold">Already Lifted (ಈಗಾಗಲೇ ಹಣ ಎತ್ತಲಾಗಿದೆ)</label>
            </div>

            {isLifted && (
              <div>
                <label className="text-xs text-slate-400">Lifted Amount (₹)</label>
                <input value={liftedAmount} onChange={(e) => setLiftedAmount(e.target.value)} placeholder="384000" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Save Chit Account
            </button>
          </form>
        </div>
      )}
    </div>
  );
}