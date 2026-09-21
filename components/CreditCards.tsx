"use client";

import React, { useState } from "react";
import { CreditCard, Plus, History, Trash2, X } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { CreditCardProfile, CreditCardSpend, CreditCardRepayment } from "../types";

interface CreditCardsProps {
  cards: CreditCardProfile[];
  spends: CreditCardSpend[];
  repayments: CreditCardRepayment[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function CreditCards({
  cards,
  spends,
  repayments,
  currentUser,
  onRefresh,
  formatDate
}: CreditCardsProps) {
  // Add Card State
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardLast4, setNewCardLast4] = useState("");
  const [newCardLimit, setNewCardLimit] = useState("");
  const [newCardBillingDay, setNewCardBillingDay] = useState("20");
  const [newCardDueDay, setNewCardDueDay] = useState("10");
  const [newCardColor, setNewCardColor] = useState("#2563eb");

  // Spend Modal State
  const [showSpendModal, setShowSpendModal] = useState<CreditCardProfile | null>(null);
  const [spendUser, setSpendUser] = useState<"JC" | "PAVAN">("JC");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendDate, setSpendDate] = useState(new Date().toISOString().split("T")[0]);
  const [spendCategory, setSpendCategory] = useState("Diesel / Fuel");
  const [spendReason, setSpendReason] = useState("");

  // Pay Modal State
  const [showPayModal, setShowPayModal] = useState<CreditCardProfile | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [paySource, setPaySource] = useState<"Centering" | "BMC Dairy" | "Pavan Cash" | "Personal Cash">("Centering");

  const [loading, setLoading] = useState(false);

  const getOutstanding = (cardId: number) => {
    const totalSpends = spends.filter(s => s.card_id === cardId).reduce((sum, s) => sum + Number(s.amount), 0);
    const totalRepayments = repayments.filter(r => r.card_id === cardId).reduce((sum, r) => sum + Number(r.amount), 0);
    return Math.max(0, totalSpends - totalRepayments);
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName || !newCardLast4 || !newCardLimit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("credit_cards").insert({
        card_name: newCardName,
        last_4_digits: newCardLast4,
        credit_limit: Number(newCardLimit),
        billing_day: Number(newCardBillingDay),
        due_day: Number(newCardDueDay),
        color_code: newCardColor
      });
      if (error) throw error;
      setShowAddCardModal(false);
      setNewCardName("");
      setNewCardLast4("");
      setNewCardLimit("");
      await onRefresh();
    } catch (err: any) {
      alert("Card save error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this card profile?")) return;
    setLoading(true);
    try {
      await supabase.from("credit_cards").delete().eq("id", cardId);
      await onRefresh();
    } catch (err: any) {
      alert("Card delete error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSpendModal || !spendAmount) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("credit_card_spends").insert({
        card_id: showSpendModal.id,
        amount: Number(spendAmount),
        spend_date: spendDate,
        category: spendCategory,
        reason_text: spendReason || null,
        created_by: spendUser
      });
      if (error) throw error;
      setShowSpendModal(null);
      setSpendAmount("");
      setSpendReason("");
      await onRefresh();
    } catch (err: any) {
      alert("Spend error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || !payAmount) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("credit_card_repayments").insert({
        card_id: showPayModal.id,
        amount: Number(payAmount),
        repaid_date: payDate,
        source: paySource
      });
      if (error) throw error;
      setShowPayModal(null);
      setPayAmount("");
      await onRefresh();
    } catch (err: any) {
      alert("Payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-400" /> Credit Card Command Center
          </h2>
          <p className="text-xs text-slate-400">Used by JC & Pavan • Card Balances & Reminders</p>
        </div>

        {currentUser === "ADMIN" && (
          <button
            type="button"
            onClick={() => setShowAddCardModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Add Card Profile
          </button>
        )}
      </div>

      {cards.length === 0 && (
        <div className="p-8 bg-slate-800/60 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
          No credit card profiles added yet.
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const outstanding = getOutstanding(card.id);
          const availableLimit = Math.max(0, Number(card.credit_limit) - outstanding);

          return (
            <div
              key={card.id}
              className="p-5 rounded-2xl border border-slate-700 shadow-2xl relative flex flex-col justify-between"
              style={{ background: `linear-gradient(135deg, ${card.color_code}25, #0b1329)` }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400">{card.card_name}</span>
                  <h4 className="text-lg font-extrabold text-white mt-0.5">•••• {card.last_4_digits}</h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                  {currentUser === "ADMIN" && (
                    <button onClick={() => handleDeleteCard(card.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="my-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current Outstanding:</span>
                  <strong className="text-red-400 font-extrabold text-sm">₹{outstanding.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Available Limit:</span>
                  <strong className="text-emerald-400 font-bold">₹{availableLimit.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between text-[11px] text-amber-400 pt-1 border-t border-slate-800">
                  <span>Bill Date: {card.billing_day}th</span>
                  <span className="font-bold">Payment Due: {card.due_day}th</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSpendModal(card)}
                  className="bg-slate-800 hover:bg-slate-700 text-blue-300 py-2 rounded-lg text-xs font-bold transition"
                >
                  + Record Swipe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(card);
                    setPayAmount(outstanding.toString());
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold transition"
                >
                  Pay Bank Bill
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Swipes and Repayments Log */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
        <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" /> Card Swipes & Bank Repayments Log
        </h4>

        <div className="space-y-2">
          {spends.length === 0 && repayments.length === 0 && (
            <p className="text-xs text-slate-500 py-4 text-center">No card transactions logged yet.</p>
          )}

          {spends.map((sp) => {
            const card = cards.find(c => c.id === sp.card_id);
            return (
              <div key={`sp-${sp.id}`} className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-400">-₹{Number(sp.amount).toLocaleString("en-IN")}</span>
                    <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded font-bold">
                      {card?.card_name} (•• {card?.last_4_digits})
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                      By: {sp.created_by}
                    </span>
                  </div>
                  {sp.reason_text && <span className="text-[11px] text-slate-400 block mt-0.5">Note: {sp.reason_text}</span>}
                </div>
                <span className="text-slate-500 text-[11px]">{formatDate(sp.spend_date)}</span>
              </div>
            );
          })}

          {repayments.map((rp) => {
            const card = cards.find(c => c.id === rp.card_id);
            return (
              <div key={`rp-${rp.id}`} className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-emerald-400">BILL PAID: ₹{Number(rp.amount).toLocaleString("en-IN")}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold ml-2">
                    {card?.card_name}
                  </span>
                  <span className="text-slate-400 ml-2">Source: {rp.source}</span>
                </div>
                <span className="text-slate-500 text-[11px]">{formatDate(rp.repaid_date)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateCard} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" /> Add Credit Card Profile
              </h3>
              <button type="button" onClick={() => setShowAddCardModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Card Name / Bank *</label>
              <input
                required
                value={newCardName}
                onChange={e => setNewCardName(e.target.value)}
                placeholder="e.g. SBI SimplyCLICK / HDFC Millennia"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Last 4 Digits *</label>
                <input
                  required
                  maxLength={4}
                  value={newCardLast4}
                  onChange={e => setNewCardLast4(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 8492"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Credit Limit (₹) *</label>
                <input
                  required
                  value={newCardLimit}
                  onChange={e => setNewCardLimit(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 150000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Bill Date (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newCardBillingDay}
                  onChange={e => setNewCardBillingDay(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-amber-400 font-bold">Payment Due Day (1-31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newCardDueDay}
                  onChange={e => setNewCardDueDay(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-2.5 text-sm text-white mt-1 font-bold"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-sm transition mt-2">
              Save Card Profile
            </button>
          </form>
        </div>
      )}

      {/* Record Spend Modal */}
      {showSpendModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveSpend} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Record Swipe: {showSpendModal.card_name}</h3>
              <button type="button" onClick={() => setShowSpendModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Who Used The Card? (ಯಾರು ಬಳಸಿದ್ದು) *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSpendUser("JC")}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${spendUser === "JC" ? "bg-indigo-600 text-white border-indigo-500" : "bg-slate-950 text-slate-400 border-slate-700"}`}
                >
                  JC (Appaji)
                </button>
                <button
                  type="button"
                  onClick={() => setSpendUser("PAVAN")}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${spendUser === "PAVAN" ? "bg-blue-600 text-white border-blue-500" : "bg-slate-950 text-slate-400 border-slate-700"}`}
                >
                  Pavan
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400">Swipe Amount (₹) *</label>
              <input
                required
                value={spendAmount}
                onChange={e => setSpendAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 3500"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Date Swiped</label>
                <input
                  type="date"
                  required
                  value={spendDate}
                  onChange={e => setSpendDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Category</label>
                <select
                  value={spendCategory}
                  onChange={e => setSpendCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1"
                >
                  <option value="Diesel / Fuel">⛽ Diesel / Fuel</option>
                  <option value="Site Materials">🏗️ Site Materials</option>
                  <option value="Maintenance">🔧 Maintenance</option>
                  <option value="Personal / Home">🏠 Personal / Home</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400">Note / Reason</label>
              <input
                value={spendReason}
                onChange={e => setSpendReason(e.target.value)}
                placeholder="e.g. Diesel for lorry"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-sm transition mt-2">
              Save Card Swipe
            </button>
          </form>
        </div>
      )}

      {/* Pay Card Bill Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveRepayment} className="bg-slate-900 border border-slate-700 max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">Pay Card Bill: {showPayModal.card_name}</h3>
              <button type="button" onClick={() => setShowPayModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Payment Amount (₹) *</label>
              <input
                required
                value={payAmount}
                onChange={e => setPayAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 12400"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-bold mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Date Paid</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Payment Source *</label>
                <select
                  value={paySource}
                  onChange={e => setPaySource(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white mt-1"
                >
                  <option value="Centering">🏗️ Centering Cash</option>
                  <option value="BMC Dairy">🥛 BMC Dairy Cash</option>
                  <option value="Pavan Cash">🧑‍🌾 Pavan's Cash</option>
                  <option value="Personal Cash">💼 Personal Cash</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-lg text-sm transition mt-2">
              Confirm Bank Bill Payment
            </button>
          </form>
        </div>
      )}
    </div>
  );
}