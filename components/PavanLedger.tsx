"use client";

import React, { useState, useRef } from "react";
import { ArrowDownRight, HandCoins, Calendar, Trash2, Mic, Square, X, Eye, Bell, Check, Loader2 } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { PavanExpense, PavanBorrowing, CashSourceOption } from "../types";
import MoneySourceSelector from "./MoneySourceSelector";

interface PavanLedgerProps {
  expenses: PavanExpense[];
  borrowings: PavanBorrowing[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  availableSources: CashSourceOption[];
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function PavanLedger({
  expenses,
  borrowings,
  currentUser,
  availableSources,
  onRefresh,
  formatDate
}: PavanLedgerProps) {
  const [subTab, setSubTab] = useState<"EXPENSES" | "BORROWINGS">("BORROWINGS");

  // Expense form state
  const [expAmount, setExpAmount] = useState("");
  const [expSource, setExpSource] = useState<string>("Centering Cash");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expAudioBlob, setExpAudioBlob] = useState<Blob | null>(null);
  const [expAudioUrl, setExpAudioUrl] = useState<string | null>(null);

  // Borrowing form state
  const [borrowPerson, setBorrowPerson] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowType, setBorrowType] = useState<"Friendly" | "Interest">("Friendly");
  const [borrowInterest, setBorrowInterest] = useState("");
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split("T")[0]);
  const [borrowDueDay, setBorrowDueDay] = useState("10");
  const [borrowReasonMode, setBorrowReasonMode] = useState<"TYPE" | "VOICE">("VOICE");
  const [borrowReasonText, setBorrowReasonText] = useState("");
  const [borrowAudioBlob, setBorrowAudioBlob] = useState<Blob | null>(null);
  const [borrowAudioUrl, setBorrowAudioUrl] = useState<string | null>(null);

  // Working Repayment Modal State
  const [repayModalBorrowing, setRepayModalBorrowing] = useState<PavanBorrowing | null>(null);
  const [repayPayingAmount, setRepayPayingAmount] = useState("");
  const [repayPaymentType, setRepayPaymentType] = useState<"PRINCIPAL" | "INTEREST">("PRINCIPAL");
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split("T")[0]);
  const [repaySource, setRepaySource] = useState<string>("Centering Cash");

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<"EXPENSE" | "BORROW" | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async (target: "EXPENSE" | "BORROW") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(audioBlob);

        if (target === "EXPENSE") {
          setExpAudioBlob(audioBlob);
          setExpAudioUrl(localUrl);
        } else {
          setBorrowAudioBlob(audioBlob);
          setBorrowAudioUrl(localUrl);
        }
        setIsRecording(false);
        setRecordingTarget(null);
        clearInterval(timerIntervalRef.current);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTarget(target);
      setRecordSeconds(0);
      timerIntervalRef.current = setInterval(() => setRecordSeconds((prev) => prev + 1), 1000);
    } catch (err: any) {
      alert("Microphone permission required: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudio = async (blob: Blob, prefix: string) => {
    const fileName = `${prefix}_${Date.now()}.webm`;
    const { error } = await supabase.storage.from("pavan_audio").upload(fileName, blob, { contentType: "audio/webm" });
    if (error) throw error;
    const { data } = supabase.storage.from("pavan_audio").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return;
    setLoading(true);
    try {
      let finalAudioUrl = null;
      if (expAudioBlob) finalAudioUrl = await uploadAudio(expAudioBlob, "expense");
      const { error } = await supabase.from("pavan_expenditures").insert({
        amount: Number(expAmount),
        source: expSource,
        expense_date: expDate,
        audio_url: finalAudioUrl,
        created_by: currentUser || "PAVAN"
      });
      if (error) throw error;
      setExpAmount("");
      setExpAudioBlob(null);
      setExpAudioUrl(null);
      await onRefresh();
    } catch (err: any) {
      alert("Expense error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBorrowing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowAmount || Number(borrowAmount) <= 0) return;
    setLoading(true);
    try {
      let finalAudioUrl = null;
      if (borrowReasonMode === "VOICE" && borrowAudioBlob) {
        finalAudioUrl = await uploadAudio(borrowAudioBlob, "borrow");
      }
      const { error } = await supabase.from("pavan_borrowings").insert({
        person_name: borrowPerson.trim() || "Unspecified",
        amount: Number(borrowAmount),
        loan_type: borrowType,
        interest_rate: borrowType === "Interest" ? borrowInterest : null,
        borrowed_date: borrowDate,
        due_day_of_month: borrowType === "Interest" ? Number(borrowDueDay) || 10 : null,
        reason_type: borrowReasonMode,
        reason_text: borrowReasonMode === "TYPE" ? borrowReasonText : null,
        audio_url: finalAudioUrl,
        status: "PENDING",
        created_by: currentUser || "PAVAN"
      });
      if (error) throw error;
      setBorrowPerson("");
      setBorrowAmount("");
      setBorrowInterest("");
      setBorrowReasonText("");
      setBorrowAudioBlob(null);
      setBorrowAudioUrl(null);
      await onRefresh();
    } catch (err: any) {
      alert("Borrowing error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this expenditure?")) return;
    setLoading(true);
    try {
      await supabase.from("pavan_expenditures").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBorrowing = async (id: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this borrowing?")) return;
    setLoading(true);
    try {
      await supabase.from("pavan_borrowings").delete().eq("id", id);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBorrowingPrincipalPaid = (b: PavanBorrowing) => {
    const reps = Array.isArray(b.repayments) ? b.repayments : [];
    return reps.filter((r) => r.payment_type !== "INTEREST").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  };

  const getRemaining = (b: PavanBorrowing) => {
    return Math.max(0, Number(b.amount || 0) - getBorrowingPrincipalPaid(b));
  };

  const openRepaymentModal = (b: PavanBorrowing) => {
    setRepayModalBorrowing(b);
    const rem = getRemaining(b);
    setRepayPayingAmount(rem > 0 ? rem.toString() : "");
    setRepayPaymentType("PRINCIPAL");
    setRepayDate(new Date().toISOString().split("T")[0]);
    setRepaySource(availableSources[0]?.id || "Centering Cash");
  };

  const handleConfirmRepayment = async () => {
    if (!repayModalBorrowing || !repayPayingAmount || Number(repayPayingAmount) <= 0) return;
    setLoading(true);
    const payingNum = Number(repayPayingAmount);

    try {
      const { error: repErr } = await supabase.from("pavan_borrowing_repayments").insert({
        borrowing_id: repayModalBorrowing.id,
        amount: payingNum,
        payment_type: repayPaymentType,
        repaid_date: repayDate,
        source: repaySource
      });
      if (repErr) throw repErr;

      if (repayPaymentType === "PRINCIPAL") {
        const totalPrincipalPaid = getBorrowingPrincipalPaid(repayModalBorrowing) + payingNum;
        if (totalPrincipalPaid >= Number(repayModalBorrowing.amount)) {
          await supabase.from("pavan_borrowings").update({ status: "CLEARED" }).eq("id", repayModalBorrowing.id);
        }
      }

      await onRefresh();
      setRepayModalBorrowing(null);
    } catch (err: any) {
      alert("Repayment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {currentUser === "JC" && (
        <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl text-xs text-purple-300 flex items-center gap-2">
          <Eye className="w-4 h-4" /> You are viewing Pavan's ledger in <strong>Read-Only</strong> mode.
        </div>
      )}

      <div className="flex gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
        <button
          onClick={() => setSubTab("EXPENSES")}
          className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold transition ${subTab === "EXPENSES" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
        >
          <ArrowDownRight className="w-4 h-4 inline mr-1 text-red-400" /> 1. Expenditures & Voice Notes ({expenses.length})
        </button>
        <button
          onClick={() => setSubTab("BORROWINGS")}
          className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold transition ${subTab === "BORROWINGS" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
        >
          <HandCoins className="w-4 h-4 inline mr-1 text-amber-400" /> 2. Borrowings / Barrows ({borrowings.length})
        </button>
      </div>

      {subTab === "EXPENSES" ? (
        <div className="space-y-5">
          {(currentUser === "PAVAN" || currentUser === "ADMIN") && (
            <form onSubmit={handleSaveExpense} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-red-400" /> Record Pavan's Expense & Voice Note
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Amount (₹) *</label>
                  <input
                    type="text"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 2500"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Money Source (ಹಣದ ಮೂಲ) *</label>
                  <div className="mt-1">
                    <MoneySourceSelector
                      value={expSource}
                      onChange={setExpSource}
                      sources={availableSources}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1"
                  />
                </div>
              </div>

              {/* Voice Recorder */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-amber-400" /> Voice Note (ಎಲ್ಲಿ ಖರ್ಚಾಯ್ತು ಧ್ವನಿ ರೆಕಾರ್ಡ್ ಮಾಡಿ):
                  </label>
                  {isRecording && recordingTarget === "EXPENSE" && (
                    <span className="text-xs font-bold text-red-400 animate-pulse flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Recording: {recordSeconds}s
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => startRecording("EXPENSE")}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition"
                    >
                      <Mic className="w-4 h-4" /> Tap to Record Voice Note
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition"
                    >
                      <Square className="w-4 h-4" /> Stop Recording ({recordSeconds}s)
                    </button>
                  )}

                  {expAudioUrl && !isRecording && (
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                      <audio src={expAudioUrl} controls className="h-7 w-52" />
                      <button
                        type="button"
                        onClick={() => { setExpAudioBlob(null); setExpAudioUrl(null); }}
                        className="text-red-400 hover:text-white text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition"
              >
                Save Expense Entry
              </button>
            </form>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">Recorded Pavan Expenditures</h4>
            {expenses.map((exp) => (
              <div key={exp.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white text-sm">₹{Number(exp.amount).toLocaleString("en-IN")}</span>
                  <span className="text-slate-400 ml-2">via {exp.source}</span>
                  <span className="text-slate-500 text-[11px] block">{formatDate(exp.expense_date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {exp.audio_url ? <audio src={exp.audio_url} controls className="h-7 w-44" /> : <span className="text-[10px] text-slate-500 italic">No audio</span>}
                  {currentUser === "ADMIN" && (
                    <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {(currentUser === "PAVAN" || currentUser === "ADMIN") && (
            <form onSubmit={handleSaveBorrowing} className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-amber-400">Record Pavan's Borrowing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">From Whom? (ಯಾರಿಂದ ಸಾಲ) *</label>
                  <input
                    type="text"
                    required
                    value={borrowPerson}
                    onChange={(e) => setBorrowPerson(e.target.value)}
                    placeholder="e.g. Mandya Chethan"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Amount (₹) *</label>
                  <input
                    type="text"
                    required
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 10000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Loan Type *</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setBorrowType("Friendly")}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${borrowType === "Friendly" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500" : "bg-slate-950 text-slate-400 border-slate-700"}`}
                    >
                      🤝 Friendly (0%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorrowType("Interest")}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${borrowType === "Interest" ? "bg-amber-500/20 text-amber-400 border-amber-500" : "bg-slate-950 text-slate-400 border-slate-700"}`}
                    >
                      📈 Interest
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Date Borrowed</label>
                  <input
                    type="date"
                    required
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1"
                  />
                </div>

                {borrowType === "Interest" ? (
                  <div>
                    <label className="text-xs text-amber-400 font-bold">Monthly Reminder Day (1-31) *</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={borrowDueDay}
                      onChange={(e) => setBorrowDueDay(e.target.value)}
                      placeholder="10"
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                    />
                  </div>
                ) : (
                  <div className="flex items-center text-[11px] text-slate-500 italic pt-6">
                    * Friendly: No monthly reminder.
                  </div>
                )}
              </div>

              {borrowType === "Interest" && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
                  <label className="text-xs font-bold text-amber-300">How much interest? (ಬಡ್ಡಿ ವಿವರ) *</label>
                  <input
                    type="text"
                    required
                    value={borrowInterest}
                    onChange={(e) => setBorrowInterest(e.target.value)}
                    placeholder="e.g. 2% monthly or ₹1000 per month"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-2.5 text-sm text-white focus:border-amber-400 outline-none"
                  />
                </div>
              )}

              {/* Voice / Text Reason */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300">Reason Why Borrowed (ಯಾಕೆ ಸಾಲ ಪಡೆಯಲಾಯಿತು):</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setBorrowReasonMode("TYPE")}
                      className={`px-3 py-1 rounded border transition ${borrowReasonMode === "TYPE" ? "bg-purple-600 text-white font-bold border-purple-500" : "text-slate-400 border-slate-700"}`}
                    >
                      ✍️ Type Reason
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorrowReasonMode("VOICE")}
                      className={`px-3 py-1 rounded border transition ${borrowReasonMode === "VOICE" ? "bg-purple-600 text-white font-bold border-purple-500" : "text-slate-400 border-slate-700"}`}
                    >
                      🎙️ Voice Record
                    </button>
                  </div>
                </div>

                {borrowReasonMode === "TYPE" ? (
                  <input
                    type="text"
                    value={borrowReasonText}
                    onChange={(e) => setBorrowReasonText(e.target.value)}
                    placeholder="e.g. Urgent diesel + repair"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none"
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={() => startRecording("BORROW")}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition"
                      >
                        <Mic className="w-4 h-4" /> Tap to Record Borrowing Reason
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition"
                      >
                        <Square className="w-4 h-4" /> Stop Recording ({recordSeconds}s)
                      </button>
                    )}

                    {borrowAudioUrl && !isRecording && (
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                        <audio src={borrowAudioUrl} controls className="h-7 w-52" />
                        <button
                          type="button"
                          onClick={() => { setBorrowAudioBlob(null); setBorrowAudioUrl(null); }}
                          className="text-red-400 hover:text-white text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-lg text-sm transition"
              >
                Save Borrowing Entry
              </button>
            </form>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
            <h4 className="font-bold text-slate-200 text-sm">Recorded Pavan Borrowings</h4>
            {borrowings.map((b) => {
              const remaining = getRemaining(b);
              const isCleared = b.status === "CLEARED" || remaining === 0;

              return (
                <div key={b.id} className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base">₹{Number(b.amount).toLocaleString("en-IN")}</span>
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">From: {b.person_name}</span>
                        {b.loan_type === "Interest" && b.due_day_of_month && (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <Bell className="w-3 h-3" /> Due: {b.due_day_of_month}th
                          </span>
                        )}
                        {isCleared ? (
                          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">REPAID ✅</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">₹{remaining.toLocaleString("en-IN")} Pending</span>
                        )}
                      </div>
                      <span className="text-slate-500 block mt-1">Taken: {formatDate(b.borrowed_date)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isCleared && (currentUser === "PAVAN" || currentUser === "ADMIN") && (
                        <button
                          type="button"
                          onClick={() => openRepaymentModal(b)}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded font-bold transition"
                        >
                          Pay / Return
                        </button>
                      )}
                      {currentUser === "ADMIN" && (
                        <button onClick={() => handleDeleteBorrowing(b.id)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {b.audio_url && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-purple-400 text-[11px]">🎙️ Reason:</span>
                      <audio src={b.audio_url} controls className="h-6 w-48" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WORKING REPAYMENT MODAL WITH DYNAMIC MONEY SOURCES */}
      {repayModalBorrowing && (() => {
        const remaining = getRemaining(repayModalBorrowing);

        return (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-emerald-500/40 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl relative">
              <button type="button" onClick={() => setRepayModalBorrowing(null)} className="absolute right-4 top-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" /> Return Loan: {repayModalBorrowing.person_name}
                </h3>
                <div className="flex justify-between text-xs mt-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">Total Borrowed: <strong>₹{Number(repayModalBorrowing.amount).toLocaleString("en-IN")}</strong></span>
                  <span className="text-red-400 font-bold">Balance: ₹{remaining.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-bold block">Payment Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRepayPaymentType("PRINCIPAL"); setRepayPayingAmount(remaining.toString()); }}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${repayPaymentType === "PRINCIPAL" ? "bg-emerald-500 text-black border-emerald-400" : "bg-slate-950 text-slate-400 border-slate-700"}`}
                  >
                    Principal (ಅಸಲು)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRepayPaymentType("INTEREST"); setRepayPayingAmount(""); }}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${repayPaymentType === "INTEREST" ? "bg-amber-500 text-black border-amber-400" : "bg-slate-950 text-slate-400 border-slate-700"}`}
                  >
                    Monthly Interest (ಬಡ್ಡಿ)
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Paying Amount (₹) *</label>
                  <input
                    type="text"
                    required
                    value={repayPayingAmount}
                    onChange={(e) => setRepayPayingAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Enter amount"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">Repayment Date</label>
                    <input type="date" required value={repayDate} onChange={(e) => setRepayDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1" />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Source (ಹಣದ ಮೂಲ) *</label>
                    <div className="mt-1">
                      <MoneySourceSelector
                        value={repaySource}
                        onChange={setRepaySource}
                        sources={availableSources}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setRepayModalBorrowing(null)} className="flex-1 bg-slate-800 py-2.5 rounded-lg text-xs font-bold text-slate-300">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRepayment}
                  disabled={loading || !repayPayingAmount}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm Return
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}