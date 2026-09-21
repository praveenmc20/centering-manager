"use client";

import React, { useState, useEffect } from "react";
import { 
  Truck, Bell, LogOut, User, Loader2, 
  Mic, CreditCard, Milk, BarChart3, HandCoins, Clock 
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { 
  Order, DairyRecord, PavanExpense, PavanBorrowing, BorrowingRepayment, 
  JCExpense, JCBorrowing, CreditCardProfile, CreditCardSpend, CreditCardRepayment,
  VehicleEMI, MargadarshiChit, JCSalaryRecord, DharmasthalaChit, CashSourceOption
} from "../types";
import { translations } from "./lib/translations";

import SitesKhata from "../components/SitesKhata";
import NewDispatch from "../components/NewDispatch";
import BMCDairy from "../components/BMCDairy";
import PavanLedger from "../components/PavanLedger";
import JCLedger from "../components/JCLedger";
import CreditCards from "../components/CreditCards";
import FinancialAnalytics from "../components/FinancialAnalytics";
import VehicleEMIs from "../components/VehicleEMIs";
import MargadarshiChitSection from "../components/MargadarshiChit";
import JCSalarySection from "../components/JCSalary";
import DharmasthalaSection from "../components/DharmasthalaChit";

const formatDateWithDay = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const calculateReturnDateString = (startDateStr: string, daysKept: number) => {
  if (!startDateStr || daysKept < 1) return "";
  const d = new Date(startDateStr + "T00:00:00");
  d.setDate(d.getDate() + (daysKept - 1));
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

export default function CenteringYardManager() {
  const [showSplash, setShowSplash] = useState(true);
  const t = translations.en;

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const [currentUser, setCurrentUser] = useState<"ADMIN" | "PAVAN" | "JC" | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [dairyRecords, setDairyRecords] = useState<DairyRecord[]>([]);
  const [pavanExpenses, setPavanExpenses] = useState<PavanExpense[]>([]);
  const [pavanBorrowings, setPavanBorrowings] = useState<PavanBorrowing[]>([]);
  const [pavanRepayments, setPavanRepayments] = useState<BorrowingRepayment[]>([]);
  const [jcExpenses, setJcExpenses] = useState<JCExpense[]>([]);
  const [jcBorrowings, setJcBorrowings] = useState<JCBorrowing[]>([]);
  const [jcRepayments, setJcRepayments] = useState<BorrowingRepayment[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardProfile[]>([]);
  const [cardSpends, setCardSpends] = useState<CreditCardSpend[]>([]);
  const [cardRepayments, setCardRepayments] = useState<CreditCardRepayment[]>([]);

  const [vehicleEmis, setVehicleEmis] = useState<VehicleEMI[]>([]);
  const [margadarshiChits, setMargadarshiChits] = useState<MargadarshiChit[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<JCSalaryRecord[]>([]);
  const [dharmasthalaChits, setDharmasthalaChits] = useState<DharmasthalaChit[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "ACTIVE" | "SETTLE_FORM" | "DAIRY" | "PAVAN_LEDGER" | "JC_LEDGER" | 
    "CREDIT_CARDS" | "VEHICLE_EMIS" | "MARGADARSHI" | "JC_SALARY" | "DHARMASTHALA" | "ANALYTICS"
  >("ACTIVE");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rawOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      const { data: rawItems } = await supabase.from("order_items").select("*");
      const { data: rawPayments } = await supabase.from("order_payments").select("*");

      const parsedOrders: Order[] = (rawOrders || []).map((o: any) => {
        let photosList: any[] = [];
        if (Array.isArray(o.site_photos)) {
          photosList = o.site_photos;
        } else if (typeof o.site_photos === "string") {
          try {
            photosList = JSON.parse(o.site_photos);
          } catch (e) {
            photosList = [];
          }
        }
        if (photosList.length === 0 && o.site_photo_url) {
          photosList = [{ url: o.site_photo_url, address: o.site_full_address || o.place }];
        }

        const items = (rawItems || []).filter((i: any) => i.order_id === o.id).map((i: any) => ({
          id: i.id,
          name: i.name,
          qty: Number(i.qty || 1),
          initialRate: Number(i.initial_rate || 0),
          finalRate: Number(i.final_rate || i.initial_rate || 0)
        }));

        const payments = (rawPayments || []).filter((p: any) => p.order_id === o.id).map((p: any) => ({
          id: p.id,
          type: p.type,
          amount: Number(p.amount || 0),
          date: p.date
        }));

        return {
          id: o.id,
          customerName: o.customer_name || "Customer",
          customerPhone: o.customer_phone || "N/A",
          place: o.place || "Site Location",
          dispatchDate: o.dispatch_date || new Date().toISOString().split("T")[0],
          returnDate: o.return_date || null,
          totalDays: Number(o.total_days || 3),
          sitePhotoUrl: o.site_photo_url || (photosList[0]?.url ?? null),
          sitePhotos: photosList,
          siteFullAddress: o.site_full_address || null,
          siteLat: o.site_lat || null,
          siteLng: o.site_lng || null,
          transportAgreed: Number(o.transport_agreed || 0),
          transportSettled: Number(o.transport_settled || o.transport_agreed || 0),
          finalLumpSum: o.final_lump_sum ? Number(o.final_lump_sum) : null,
          status: o.status || "ON_SITE",
          items,
          payments
        };
      });

      setOrders(parsedOrders);

      const { data: dairyData } = await supabase.from("dairy_income").select("*").order("received_date", { ascending: false });
      if (dairyData) setDairyRecords(dairyData);

      const { data: pExp } = await supabase.from("pavan_expenditures").select("*").order("expense_date", { ascending: false });
      const { data: pBorr } = await supabase.from("pavan_borrowings").select("*").order("borrowed_date", { ascending: false });
      const { data: pReps } = await supabase.from("pavan_borrowing_repayments").select("*").order("repaid_date", { ascending: true });

      if (pExp) setPavanExpenses(pExp);
      if (pReps) setPavanRepayments(pReps);
      if (pBorr) {
        setPavanBorrowings(pBorr.map((b: any) => ({
          ...b,
          repayments: (pReps || []).filter((r: any) => r.borrowing_id === b.id)
        })));
      }

      const { data: jExp } = await supabase.from("jc_expenditures").select("*").order("expense_date", { ascending: false });
      const { data: jBorr } = await supabase.from("jc_borrowings").select("*").order("borrowed_date", { ascending: false });
      const { data: jReps } = await supabase.from("jc_borrowing_repayments").select("*").order("repaid_date", { ascending: true });

      if (jExp) setJcExpenses(jExp);
      if (jReps) setJcRepayments(jReps);
      if (jBorr) {
        setJcBorrowings(jBorr.map((b: any) => ({
          ...b,
          repayments: (jReps || []).filter((r: any) => r.borrowing_id === b.id)
        })));
      }

      const { data: cCards } = await supabase.from("credit_cards").select("*").order("created_at", { ascending: true });
      const { data: cSpends } = await supabase.from("credit_card_spends").select("*").order("spend_date", { ascending: false });
      const { data: cReps } = await supabase.from("credit_card_repayments").select("*").order("repaid_date", { ascending: false });

      if (cCards) setCreditCards(cCards);
      if (cSpends) setCardSpends(cSpends);
      if (cReps) setCardRepayments(cReps);

      const { data: emis } = await supabase.from("vehicle_emis").select("*");
      const { data: emiPays } = await supabase.from("vehicle_emi_payments").select("*");
      if (emis) {
        setVehicleEmis(emis.map((e: any) => ({
          ...e,
          payments: (emiPays || []).filter((p: any) => p.emi_id === e.id)
        })));
      }

      const { data: chits } = await supabase.from("margadarshi_chits").select("*");
      const { data: chitPays } = await supabase.from("margadarshi_payments").select("*");
      if (chits) {
        setMargadarshiChits(chits.map((c: any) => ({
          ...c,
          payments: (chitPays || []).filter((p: any) => p.chit_id === c.id).map((cp: any) => ({ ...cp, amount: cp.amount || cp.payment_amount || 0 }))
        })));
      }

      const { data: sal } = await supabase.from("jc_salary_records").select("*").order("credited_date", { ascending: false });
      if (sal) setSalaryRecords(sal);

      const { data: ds } = await supabase.from("dharmasthala_chits").select("*");
      const { data: dsPays } = await supabase.from("dharmasthala_payments").select("*");
      if (ds) {
        setDharmasthalaChits(ds.map((d: any) => ({
          ...d,
          payments: (dsPays || []).filter((p: any) => p.chit_id === d.id)
        })));
      }
    } catch (err: any) {
      console.error("Data Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (loginUsername === "admin" && loginPassword === "2019") setCurrentUser("ADMIN");
    else if (loginUsername === "pavan" && loginPassword === "8123") setCurrentUser("PAVAN");
    else if (loginUsername === "jc" && loginPassword === "jc123") setCurrentUser("JC");
    else setLoginError("Invalid credentials!");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
  };

  const computeDynamicAvailableSources = (): CashSourceOption[] => {
    const sources: CashSourceOption[] = [];

    let centeringGross = 0;
    orders.forEach((o) => {
      centeringGross += o.payments.reduce((s, p) => s + Number(p.amount), 0);
    });

    let centeringOutflows = 0;
    const isCentering = (src: string) => src && (src.includes("Centering") || src === "Centering Cash");

    pavanExpenses.forEach((pe) => { if (isCentering(pe.source)) centeringOutflows += Number(pe.amount); });
    jcExpenses.forEach((je) => { if (isCentering(je.source)) centeringOutflows += Number(je.amount); });
    pavanRepayments.forEach((pr) => { if (isCentering(pr.source)) centeringOutflows += Number(pr.amount); });
    jcRepayments.forEach((jr) => { if (isCentering(jr.source)) centeringOutflows += Number(jr.amount); });
    cardRepayments.forEach((cr) => { if (isCentering(cr.source)) centeringOutflows += Number(cr.amount); });
    vehicleEmis.forEach((v) => (v.payments || []).forEach((vp) => { if (isCentering(vp.source)) centeringOutflows += Number(vp.amount); }));
    margadarshiChits.forEach((m) => (m.payments || []).forEach((mp: any) => { if (isCentering(mp.source)) centeringOutflows += Number(mp.amount || 0); }));
    dharmasthalaChits.forEach((d) => (d.payments || []).forEach((dp) => { if (isCentering(dp.source)) centeringOutflows += Number(dp.amount); }));

    const centeringNet = Math.max(0, Math.round(centeringGross - centeringOutflows));
    sources.push({ id: "Centering Cash", label: "🏗️ Centering Cash", availableBalance: centeringNet });

    const dairyGross = dairyRecords.reduce((s, d) => s + Number(d.amount), 0);
    let dairyOutflows = 0;
    const isDairy = (src: string) => src && (src.includes("Dairy") || src === "BMC Dairy Cash");

    pavanExpenses.forEach((pe) => { if (isDairy(pe.source)) dairyOutflows += Number(pe.amount); });
    jcExpenses.forEach((je) => { if (isDairy(je.source)) dairyOutflows += Number(je.amount); });
    pavanRepayments.forEach((pr) => { if (isDairy(pr.source)) dairyOutflows += Number(pr.amount); });
    jcRepayments.forEach((jr) => { if (isDairy(jr.source)) dairyOutflows += Number(jr.amount); });
    cardRepayments.forEach((cr) => { if (isDairy(cr.source)) dairyOutflows += Number(cr.amount); });
    vehicleEmis.forEach((v) => (v.payments || []).forEach((vp) => { if (isDairy(vp.source)) dairyOutflows += Number(vp.amount); }));
    margadarshiChits.forEach((m) => (m.payments || []).forEach((mp: any) => { if (isDairy(mp.source)) dairyOutflows += Number(mp.amount || 0); }));
    dharmasthalaChits.forEach((d) => (d.payments || []).forEach((dp) => { if (isDairy(dp.source)) dairyOutflows += Number(dp.amount); }));

    const dairyNet = Math.max(0, Math.round(dairyGross - dairyOutflows));
    sources.push({ id: "BMC Dairy Cash", label: "🥛 BMC Dairy Cash", availableBalance: dairyNet });

    const salaryGross = salaryRecords.reduce((s, r) => s + Number(r.net_credited || 0), 0);
    let salaryOutflows = 0;
    const isSalary = (src: string) => src && (src.includes("Salary") || src === "JC Salary Cash");

    pavanExpenses.forEach((pe) => { if (isSalary(pe.source)) salaryOutflows += Number(pe.amount); });
    jcExpenses.forEach((je) => { if (isSalary(je.source)) salaryOutflows += Number(je.amount); });
    pavanRepayments.forEach((pr) => { if (isSalary(pr.source)) salaryOutflows += Number(pr.amount); });
    jcRepayments.forEach((jr) => { if (isSalary(jr.source)) salaryOutflows += Number(jr.amount); });
    cardRepayments.forEach((cr) => { if (isSalary(cr.source)) salaryOutflows += Number(cr.amount); });
    vehicleEmis.forEach((v) => (v.payments || []).forEach((vp) => { if (isSalary(vp.source)) salaryOutflows += Number(vp.amount); }));
    margadarshiChits.forEach((m) => (m.payments || []).forEach((mp: any) => { if (isSalary(mp.source)) salaryOutflows += Number(mp.amount || 0); }));
    dharmasthalaChits.forEach((d) => (d.payments || []).forEach((dp) => { if (isSalary(dp.source)) salaryOutflows += Number(dp.amount); }));

    const salaryNet = Math.max(0, Math.round(salaryGross - salaryOutflows));
    sources.push({ id: "JC Salary Cash", label: "💼 JC Salary Cash", availableBalance: salaryNet });

    const liftedGross = margadarshiChits.filter((m) => m.is_lifted).reduce((s, m) => s + Number(m.lifted_amount || 0), 0);
    let liftedOutflows = 0;
    const isLifted = (src: string) => src && (src.includes("Lifted") || src === "Margadarshi Lifted Cash");

    pavanExpenses.forEach((pe) => { if (isLifted(pe.source)) liftedOutflows += Number(pe.amount); });
    jcExpenses.forEach((je) => { if (isLifted(je.source)) liftedOutflows += Number(je.amount); });
    pavanRepayments.forEach((pr) => { if (isLifted(pr.source)) liftedOutflows += Number(pr.amount); });
    jcRepayments.forEach((jr) => { if (isLifted(jr.source)) liftedOutflows += Number(jr.amount); });
    cardRepayments.forEach((cr) => { if (isLifted(cr.source)) liftedOutflows += Number(cr.amount); });
    vehicleEmis.forEach((v) => (v.payments || []).forEach((vp) => { if (isLifted(vp.source)) liftedOutflows += Number(vp.amount); }));
    margadarshiChits.forEach((m) => (m.payments || []).forEach((mp: any) => { if (isLifted(mp.source)) liftedOutflows += Number(mp.amount || 0); }));
    dharmasthalaChits.forEach((d) => (d.payments || []).forEach((dp) => { if (isLifted(dp.source)) liftedOutflows += Number(dp.amount); }));

    const liftedNet = Math.max(0, Math.round(liftedGross - liftedOutflows));
    sources.push({ id: "Margadarshi Lifted Cash", label: "💰 Margadarshi Lifted Cash", availableBalance: liftedNet });

    [...pavanBorrowings, ...jcBorrowings].forEach((b) => {
      if (b.status === "PENDING") {
        const loanTotal = Number(b.amount || 0);
        let loanSpent = 0;
        const loanSourceId = `Loan: ${b.person_name}`;

        const isThisLoan = (src: string) => src && (src.includes(b.person_name || "") || src === loanSourceId);
        pavanExpenses.forEach((pe) => { if (isThisLoan(pe.source)) loanSpent += Number(pe.amount); });
        jcExpenses.forEach((je) => { if (isThisLoan(je.source)) loanSpent += Number(je.amount); });
        pavanRepayments.forEach((pr) => { if (isThisLoan(pr.source)) loanSpent += Number(pr.amount); });
        jcRepayments.forEach((jr) => { if (isThisLoan(jr.source)) loanSpent += Number(jr.amount); });
        cardRepayments.forEach((cr) => { if (isThisLoan(cr.source)) loanSpent += Number(cr.amount); });
        vehicleEmis.forEach((v) => (v.payments || []).forEach((vp) => { if (isThisLoan(vp.source)) loanSpent += Number(vp.amount); }));
        margadarshiChits.forEach((m) => (m.payments || []).forEach((mp: any) => { if (isThisLoan(mp.source)) loanSpent += Number(mp.amount || 0); }));
        dharmasthalaChits.forEach((d) => (d.payments || []).forEach((dp) => { if (isThisLoan(dp.source)) loanSpent += Number(dp.amount); }));

        const loanRemaining = Math.max(0, Math.round(loanTotal - loanSpent));
        sources.push({
          id: loanSourceId,
          label: `🤝 Loan from ${b.person_name}`,
          availableBalance: loanRemaining
        });
      }
    });

    sources.push({ id: "Pavan Cash", label: "🧑‍🌾 Pavan's Hand Cash", availableBalance: 999999 });
    sources.push({ id: "Personal Cash", label: "💵 Outside / Personal Cash", availableBalance: 999999 });

    return sources;
  };

  const dynamicSources = computeDynamicAvailableSources();

  const getCombinedAlerts = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentDayOfWeek = today.getDay();
    const alerts: any[] = [];

    creditCards.forEach((c) => {
      const spends = cardSpends.filter((s) => s.card_id === c.id).reduce((sum, s) => sum + Number(s.amount), 0);
      const reps = cardRepayments.filter((r) => r.card_id === c.id).reduce((sum, r) => sum + Number(r.amount), 0);
      const out = Math.max(0, spends - reps);
      if (out > 0) {
        let diff = c.due_day - currentDay;
        if (diff < 0) diff = 30 + diff;
        if (diff <= 7) {
          alerts.push({
            title: `Credit Card: ${c.card_name}`,
            subtitle: `Bill of ₹${out.toLocaleString("en-IN")} due on ${c.due_day}th`,
            isUrgent: diff <= 3,
            onPay: () => setActiveTab("CREDIT_CARDS")
          });
        }
      }
    });

    vehicleEmis.forEach((v) => {
      let diff = v.due_day_of_month - currentDay;
      if (diff < 0) diff = 30 + diff;
      if (diff <= 7) {
        alerts.push({
          title: `Vehicle EMI: ${v.vehicle_name}`,
          subtitle: `₹${Number(v.monthly_emi_amount).toLocaleString("en-IN")} due on ${v.due_day_of_month}th`,
          isUrgent: diff <= 2,
          onPay: () => setActiveTab("VEHICLE_EMIS")
        });
      }
    });

    margadarshiChits.forEach((m) => {
      let diff = m.monthly_due_day - currentDay;
      if (diff < 0) diff = 30 + diff;
      if (diff <= 7) {
        alerts.push({
          title: `Margadarshi Chit: ${m.member_name}`,
          subtitle: `Chit payment due on ${m.monthly_due_day}th`,
          isUrgent: diff <= 2,
          onPay: () => setActiveTab("MARGADARSHI")
        });
      }
    });

    if (dharmasthalaChits.length > 0 && (currentDayOfWeek === 3 || currentDayOfWeek === 4)) {
      alerts.push({
        title: `Dharmasthala Sangha`,
        subtitle: currentDayOfWeek === 4 ? `TODAY is Thursday Payment Day!` : `Tomorrow is Thursday Payment Day!`,
        isUrgent: currentDayOfWeek === 4,
        onPay: () => setActiveTab("DHARMASTHALA")
      });
    }

    if (currentDay >= 5 && currentDay <= 15) {
      alerts.push({
        title: `JC Salary Window (5th - 15th)`,
        subtitle: `Upload Appaji's payslip & record credited salary.`,
        isUrgent: false,
        onPay: () => setActiveTab("JC_SALARY")
      });
    }

    return alerts;
  };

  const combinedAlerts = getCombinedAlerts();

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30">
            <img src="/icon.png" alt="JC Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-widest uppercase">JC GROUP'S</h2>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-amber-500/10 rounded-full text-amber-500 mb-1">
              <Truck className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-bold text-white">BROTHERS CENTERING & TRANSPORT</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="p-3 bg-red-500/20 text-red-400 text-xs rounded">{loginError}</div>}
            <div>
              <label className="text-xs text-slate-400">Username</label>
              <input type="text" required value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="admin / pavan / jc" className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Password</label>
              <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-white mt-1" />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded text-sm transition mt-2">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-500 flex items-center gap-2">
            <Truck className="w-7 h-7" /> {t.appTitle}
          </h1>
          <p className="text-xs text-slate-400">{t.appSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
          <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 font-semibold">
            {currentUser === "ADMIN" ? "Admin (Full Control)" : currentUser === "PAVAN" ? "Pavan" : "JC (Appaji)"}
          </span>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-2" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Persistent Combined Reminders */}
      {combinedAlerts.length > 0 && (
        <div className="max-w-6xl mx-auto mt-4 space-y-2">
          {combinedAlerts.map((alert, idx) => (
            <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${alert.isUrgent ? "bg-red-500/15 border-red-500/50 animate-pulse" : "bg-amber-500/15 border-amber-500/40"}`}>
              <span className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                <Bell className={`w-4 h-4 ${alert.isUrgent ? "text-red-400" : "text-amber-400"}`} /> {alert.title}: {alert.subtitle}
              </span>
              <button onClick={alert.onPay} className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded shadow">Action</button>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto mt-4 flex flex-wrap gap-2">
        <button onClick={() => setActiveTab("ACTIVE")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "ACTIVE" ? "bg-amber-500 text-black font-bold" : "bg-slate-800 text-slate-300"}`}>
          {t.tabSites} ({orders.length})
        </button>
        {currentUser !== "JC" && (
          <button onClick={() => setActiveTab("SETTLE_FORM")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "SETTLE_FORM" ? "bg-amber-500 text-black font-bold" : "bg-slate-800 text-slate-300"}`}>
            {t.tabNewDispatch}
          </button>
        )}
        <button onClick={() => setActiveTab("DAIRY")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "DAIRY" ? "bg-emerald-500 text-black font-bold" : "bg-slate-800 text-slate-300"}`}>
          <Milk className="w-3.5 h-3.5 inline mr-1" /> {t.tabDairy} ({dairyRecords.length})
        </button>
        <button onClick={() => setActiveTab("PAVAN_LEDGER")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "PAVAN_LEDGER" ? "bg-purple-600 text-white font-bold" : "bg-slate-800 text-purple-300"}`}>
          <Mic className="w-3.5 h-3.5 inline mr-1" /> {t.tabPavanLedger} ({pavanExpenses.length + pavanBorrowings.length})
        </button>
        <button onClick={() => setActiveTab("JC_LEDGER")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "JC_LEDGER" ? "bg-indigo-600 text-white font-bold" : "bg-slate-800 text-indigo-300"}`}>
          <User className="w-3.5 h-3.5 inline mr-1" /> {t.tabJcLedger} ({jcExpenses.length + jcBorrowings.length})
        </button>
        <button onClick={() => setActiveTab("CREDIT_CARDS")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "CREDIT_CARDS" ? "bg-blue-600 text-white font-bold" : "bg-slate-800 text-blue-300"}`}>
          <CreditCard className="w-3.5 h-3.5 inline mr-1" /> {t.tabCreditCards} ({creditCards.length})
        </button>
        <button onClick={() => setActiveTab("VEHICLE_EMIS")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "VEHICLE_EMIS" ? "bg-amber-600 text-white font-bold" : "bg-slate-800 text-amber-300"}`}>
          <Truck className="w-3.5 h-3.5 inline mr-1" /> {t.tabVehicleEmis} ({vehicleEmis.length})
        </button>
        <button onClick={() => setActiveTab("MARGADARSHI")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "MARGADARSHI" ? "bg-teal-600 text-white font-bold" : "bg-slate-800 text-teal-300"}`}>
          <HandCoins className="w-3.5 h-3.5 inline mr-1" /> {t.tabMargadarshi} ({margadarshiChits.length})
        </button>
        <button onClick={() => setActiveTab("JC_SALARY")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "JC_SALARY" ? "bg-rose-600 text-white font-bold" : "bg-slate-800 text-rose-300"}`}>
          <User className="w-3.5 h-3.5 inline mr-1" /> {t.tabJcSalary} ({salaryRecords.length})
        </button>
        <button onClick={() => setActiveTab("DHARMASTHALA")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "DHARMASTHALA" ? "bg-orange-600 text-white font-bold" : "bg-slate-800 text-orange-300"}`}>
          <Clock className="w-3.5 h-3.5 inline mr-1" /> {t.tabDharmasthala} ({dharmasthalaChits.length})
        </button>
        <button onClick={() => setActiveTab("ANALYTICS")} className={`px-3 py-2 rounded text-xs font-semibold ${activeTab === "ANALYTICS" ? "bg-cyan-500 text-black font-bold" : "bg-slate-800 text-slate-300"}`}>
          <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> {t.tabAnalytics}
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-6xl mx-auto mt-6">
        {activeTab === "ACTIVE" && (
          <SitesKhata
            orders={orders}
            currentUser={currentUser}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
            calculateReturnDateString={calculateReturnDateString}
          />
        )}

        {activeTab === "SETTLE_FORM" && currentUser !== "JC" && (
          <NewDispatch
            currentUser={currentUser}
            onSuccess={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "DAIRY" && (
          <BMCDairy
            records={dairyRecords}
            currentUser={currentUser}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "PAVAN_LEDGER" && (
          <PavanLedger
            expenses={pavanExpenses}
            borrowings={pavanBorrowings}
            currentUser={currentUser}
            availableSources={dynamicSources}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "JC_LEDGER" && (
          <JCLedger
            expenses={jcExpenses}
            borrowings={jcBorrowings}
            currentUser={currentUser}
            availableSources={dynamicSources}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "CREDIT_CARDS" && (
          <CreditCards
            cards={creditCards}
            spends={cardSpends}
            repayments={cardRepayments}
            currentUser={currentUser}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "VEHICLE_EMIS" && (
          <VehicleEMIs
            emis={vehicleEmis}
            currentUser={currentUser}
            availableSources={dynamicSources}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "MARGADARSHI" && (
          <MargadarshiChitSection
            chits={margadarshiChits}
            currentUser={currentUser}
            availableSources={dynamicSources}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "JC_SALARY" && (
          <JCSalarySection
            salaryRecords={salaryRecords}
            currentUser={currentUser}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "DHARMASTHALA" && (
          <DharmasthalaSection
            chits={dharmasthalaChits}
            currentUser={currentUser}
            onRefresh={fetchData}
            formatDate={formatDateWithDay}
          />
        )}

        {activeTab === "ANALYTICS" && (
          <FinancialAnalytics
            orders={orders}
            dairyRecords={dairyRecords}
            pavanExpenses={pavanExpenses}
            pavanRepayments={pavanRepayments}
            jcExpenses={jcExpenses}
            jcRepayments={jcRepayments}
            vehicleEmis={vehicleEmis}
            margadarshiChits={margadarshiChits}
            salaryRecords={salaryRecords}
            dharmasthalaChits={dharmasthalaChits}
            formatDate={formatDateWithDay}
          />
        )}
      </div>
    </div>
  );
}