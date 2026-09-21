"use client";

import React, { useState } from "react";
import { User, Plus, Calendar, Trash2, X, FileText } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { JCSalaryRecord } from "../types";

interface JCSalaryProps {
  salaryRecords: JCSalaryRecord[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function JCSalarySection({ salaryRecords, currentUser, onRefresh, formatDate }: JCSalaryProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState("May 2026");
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split("T")[0]);
  const [grossSalary, setGrossSalary] = useState("");
  const [deductions, setDeductions] = useState("0");
  const [notes, setNotes] = useState("JC Monthly Salary Credited");
  const [payslipBlob, setPayslipBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  const netCredited = Math.max(0, (Number(grossSalary) || 0) - (Number(deductions) || 0));

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grossSalary) return;
    if (!payslipBlob) {
      alert("Payslip upload is mandatory! Please choose a photo or screenshot of the payslip.");
      return;
    }

    setLoading(true);
    try {
      let payslipUrl = null;
      const fileName = `payslip_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("payment_receipts").upload(fileName, payslipBlob);
      if (!upErr) {
        const { data } = supabase.storage.from("payment_receipts").getPublicUrl(fileName);
        payslipUrl = data.publicUrl;
      }

      const { error } = await supabase.from("jc_salary_records").insert({
        salary_month: salaryMonth,
        credited_date: creditDate,
        gross_salary: Number(grossSalary),
        deducted_amount: Number(deductions) || 0,
        net_credited: netCredited,
        payslip_photo_url: payslipUrl,
        notes: notes
      });
      if (error) throw error;
      setShowAddModal(false);
      setGrossSalary("");
      setDeductions("0");
      setPayslipBlob(null);
      await onRefresh();
    } catch (err: any) {
      alert("Error saving salary: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalary = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this salary record?")) return;
    setLoading(true);
    try {
      await supabase.from("jc_salary_records").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" /> JC's Monthly Salary (JC ಸಂಬಳ)
          </h2>
          <p className="text-xs text-slate-400">Monthly Salary Credited between 5th to 15th • Mandatory Payslip Proofs</p>
        </div>

        {(currentUser === "JC" || currentUser === "ADMIN") && (
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow">
            <Plus className="w-4 h-4" /> Record Salary Credit
          </button>
        )}
      </div>

      {/* Salary Records Cards */}
      <div className="space-y-3">
        {salaryRecords.length === 0 && (
          <div className="p-8 bg-slate-800/60 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
            No salary records logged yet.
          </div>
        )}

        {salaryRecords.map((s) => (
          <div key={s.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base">{s.salary_month}</span>
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  CREDITED IN BANK
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3">
                <span>Gross: ₹{Number(s.gross_salary).toLocaleString("en-IN")}</span>
                <span className="text-red-400">Deductions: -₹{Number(s.deducted_amount).toLocaleString("en-IN")}</span>
                <span className="text-slate-500">• {formatDate(s.credited_date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Net Received</span>
                <span className="text-xl font-black text-emerald-400">₹{Number(s.net_credited).toLocaleString("en-IN")}</span>
              </div>
              {s.payslip_photo_url && (
                <a href={s.payslip_photo_url} target="_blank" rel="noreferrer" className="bg-slate-700 hover:bg-slate-600 text-indigo-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Payslip
                </a>
              )}
              {currentUser === "ADMIN" && (
                <button onClick={() => handleDeleteSalary(s.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Record Salary Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSalary} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Record JC's Salary</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Month / Year *</label>
                <input required value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)} placeholder="e.g. May 2026" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Date Credited *</label>
                <input type="date" required value={creditDate} onChange={e => setCreditDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Gross Salary (₹) *</label>
                <input required value={grossSalary} onChange={e => setGrossSalary(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 45000" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Deductions (ಕಡಿತ) (₹)</label>
                <input value={deductions} onChange={e => setDeductions(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1" />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Calculated Net In Hand:</span>
              <strong className="text-emerald-400 text-base font-black">₹{netCredited.toLocaleString("en-IN")}</strong>
            </div>

            {/* MANDATORY PAYSLIP UPLOAD */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-1">
              <label className="text-xs text-indigo-300 font-bold block">
                Upload Payslip Photo / Screenshot * (ಕಡ್ಡಾಯ)
              </label>
              <input
                type="file"
                required
                accept="image/*"
                onChange={e => e.target.files?.[0] && setPayslipBlob(e.target.files[0])}
                className="text-xs text-slate-300"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-sm transition mt-2">
              Save Salary Credit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}