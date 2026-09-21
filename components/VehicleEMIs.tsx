"use client";

import React, { useState } from "react";
import { Truck, Plus, Trash2, X, FileText } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { VehicleEMI, CashSourceOption } from "../types";
import MoneySourceSelector from "./MoneySourceSelector";

interface VehicleEMIsProps {
  emis: VehicleEMI[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  availableSources: CashSourceOption[];
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function VehicleEMIs({ emis, currentUser, availableSources, onRefresh, formatDate }: VehicleEMIsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("50");
  const [completedInstallments, setCompletedInstallments] = useState("20");
  const [dueDay, setDueDay] = useState("10");
  const [bankName, setBankName] = useState("HDFC / Kotak Prime");

  const [payEmiModal, setPayEmiModal] = useState<VehicleEMI | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [paySource, setPaySource] = useState<string>("Centering Cash");
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleName || !emiAmount) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("vehicle_emis").insert({
        vehicle_name: vehicleName,
        monthly_emi_amount: Number(emiAmount),
        total_installments: Number(totalInstallments) || 50,
        completed_installments: Number(completedInstallments) || 0,
        due_day_of_month: Number(dueDay) || 10,
        bank_name: bankName
      });
      if (error) throw error;
      setShowAddModal(false);
      setVehicleName("");
      setEmiAmount("");
      await onRefresh();
    } catch (err: any) {
      alert("Error adding EMI: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmiModal || !payAmount) return;
    setLoading(true);
    try {
      let receiptUrl = null;
      if (receiptBlob) {
        const fileName = `emi_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("payment_receipts").upload(fileName, receiptBlob);
        if (!upErr) {
          const { data } = supabase.storage.from("payment_receipts").getPublicUrl(fileName);
          receiptUrl = data.publicUrl;
        }
      }

      await supabase.from("vehicle_emi_payments").insert({
        emi_id: payEmiModal.id,
        amount: Number(payAmount),
        paid_date: payDate,
        source: paySource,
        receipt_url: receiptUrl
      });

      await supabase.from("vehicle_emis").update({
        completed_installments: (payEmiModal.completed_installments || 0) + 1
      }).eq("id", payEmiModal.id);

      setPayEmiModal(null);
      setPayAmount("");
      setReceiptBlob(null);
      await onRefresh();
    } catch (err: any) {
      alert("Payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEMI = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this vehicle EMI schedule?")) return;
    setLoading(true);
    try {
      await supabase.from("vehicle_emis").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Delete this EMI payment entry?")) return;
    setLoading(true);
    try {
      await supabase.from("vehicle_emi_payments").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" /> Vehicle EMIs (ವಾಹನಗಳ ಮಾಸಿಕ ಕಂತು)
          </h2>
          <p className="text-xs text-slate-400">Ashok Leyland Lorry & Car EMI Tracker with Installment Logs</p>
        </div>

        {currentUser === "ADMIN" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Add Vehicle Loan Schedule
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emis.map((emi) => {
          const remaining = Math.max(0, emi.total_installments - emi.completed_installments);
          const percent = Math.round((emi.completed_installments / emi.total_installments) * 100);

          return (
            <div key={emi.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4 shadow-xl relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-lg text-white">{emi.vehicle_name}</h3>
                  <span className="text-xs text-slate-400 font-medium">{emi.bank_name} • Monthly Due: {emi.due_day_of_month}th</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-amber-400">₹{Number(emi.monthly_emi_amount).toLocaleString("en-IN")}/mo</span>
                  {currentUser === "ADMIN" && (
                    <button onClick={() => handleDeleteEMI(emi.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-bold">{emi.completed_installments} Paid</span>
                  <span className="text-amber-400 font-bold">{remaining} Remaining (of {emi.total_installments})</span>
                </div>
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Next installment due on {emi.due_day_of_month}th</span>
                <button
                  type="button"
                  onClick={() => {
                    setPayEmiModal(emi);
                    setPayAmount(emi.monthly_emi_amount.toString());
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-lg transition shadow"
                >
                  Pay Installment (ಕಂತು ಕಟ್ಟಿ)
                </button>
              </div>

              {emi.payments && emi.payments.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Installments:</span>
                  {emi.payments.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-slate-300">
                      <span>• Paid: ₹{Number(p.amount).toLocaleString("en-IN")} on {formatDate(p.paid_date)} via {p.source}</span>
                      <div className="flex items-center gap-1.5">
                        {p.receipt_url && (
                          <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline text-[11px] flex items-center gap-0.5">
                            <FileText className="w-3 h-3" /> Slip
                          </a>
                        )}
                        {currentUser === "ADMIN" && (
                          <button onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pay Modal */}
      {payEmiModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRecordPayment} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Pay EMI: {payEmiModal.vehicle_name}</h3>
              <button type="button" onClick={() => setPayEmiModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Installment Amount (₹) *</label>
              <input required value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Payment Date</label>
                <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Payment Source *</label>
                <div className="mt-1">
                  <MoneySourceSelector
                    value={paySource}
                    onChange={setPaySource}
                    sources={availableSources}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Bank Debit Slip / Screenshot</label>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setReceiptBlob(e.target.files[0])} className="text-xs text-slate-400" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Confirm EMI Payment
            </button>
          </form>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateEMI} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Add Vehicle Loan</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Vehicle Name *</label>
              <input required value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="e.g. Ashok Leyland Lorry / Car" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Monthly EMI (₹) *</label>
                <input required value={emiAmount} onChange={(e) => setEmiAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 18500" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Due Day of Month *</label>
                <input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="10" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Total Tenor (Installments)</label>
                <input type="number" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} placeholder="50" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Already Paid (ಈಗಾಗಲೇ ಕಟ್ಟಿದ್ದು)</label>
                <input type="number" value={completedInstallments} onChange={(e) => setCompletedInstallments(e.target.value)} placeholder="20" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400">Financier / Bank Name</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Kotak Mahindra Prime" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Save Vehicle EMI Schedule
            </button>
          </form>
        </div>
      )}
    </div>
  );
}