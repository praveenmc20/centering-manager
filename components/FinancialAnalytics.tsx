"use client";

import React, { useState } from "react";
import { 
  Wallet, BarChart3, ChevronRight, Info, X, 
  Filter, Layers, User, Calendar
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Legend, CartesianGrid 
} from "recharts";
import { 
  Order, DairyRecord, PavanExpense, BorrowingRepayment, 
  JCExpense, VehicleEMI, MargadarshiChit, JCSalaryRecord, DharmasthalaChit 
} from "../types";

interface FinancialAnalyticsProps {
  orders: Order[];
  dairyRecords: DairyRecord[];
  pavanExpenses: PavanExpense[];
  pavanRepayments: BorrowingRepayment[];
  jcExpenses: JCExpense[];
  jcRepayments: BorrowingRepayment[];
  vehicleEmis: VehicleEMI[];
  margadarshiChits: MargadarshiChit[];
  salaryRecords: JCSalaryRecord[];
  dharmasthalaChits: DharmasthalaChit[];
  formatDate: (date: string) => string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function FinancialAnalytics({
  orders,
  dairyRecords,
  pavanExpenses,
  pavanRepayments,
  jcExpenses,
  jcRepayments,
  vehicleEmis,
  margadarshiChits,
  salaryRecords,
  dharmasthalaChits,
  formatDate
}: FinancialAnalyticsProps) {
  const [filterMode, setFilterMode] = useState<"MONTHLY" | "YEARLY" | "ALL_TIME">("MONTHLY");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [streamModalType, setStreamModalType] = useState<"CENTERING" | "TRANSPORT" | "DAIRY" | "SALARY" | "LIFTED" | "OUTFLOWS" | null>(null);
  const [showUncollectedModal, setShowUncollectedModal] = useState(false);

  const getAvailableYears = () => {
    const yearSet = new Set<string>();
    yearSet.add("2026");
    yearSet.add(new Date().getFullYear().toString());
    orders.forEach((o) => o.dispatchDate && yearSet.add(o.dispatchDate.slice(0, 4)));
    dairyRecords.forEach((d) => d.received_date && yearSet.add(d.received_date.slice(0, 4)));
    pavanExpenses.forEach((p) => p.expense_date && yearSet.add(p.expense_date.slice(0, 4)));
    jcExpenses.forEach((j) => j.expense_date && yearSet.add(j.expense_date.slice(0, 4)));
    salaryRecords.forEach((s) => s.credited_date && yearSet.add(s.credited_date.slice(0, 4)));
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  };

  const matchesScope = (dateStr: string) => {
    if (!dateStr) return false;
    if (filterMode === "ALL_TIME") return true;
    if (filterMode === "YEARLY") return true;
    if (filterMode === "MONTHLY") {
      if (!dateStr.startsWith(selectedYear)) return false;
      if (selectedMonth !== "ALL") return dateStr.startsWith(`${selectedYear}-${selectedMonth}`);
      return true;
    }
    return true;
  };

  const processOrderEarnings = (o: Order) => {
    const paid = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const days = o.totalDays || 3;
    const itemsSub = o.items.reduce((s, it) => s + (it.qty * it.initialRate * days), 0);
    const transportVal = o.transportSettled || o.transportAgreed || 0;
    const totalBill = o.finalLumpSum !== null ? o.finalLumpSum : (itemsSub + transportVal);
    const debt = Math.max(0, totalBill - paid);

    if (totalBill <= 0) return { boxesEarned: 0, transportEarned: 0, debt, totalBill, paid };

    const vProp = transportVal / totalBill;
    const transportEarned = paid * vProp;
    const boxesEarned = paid * (1 - vProp);

    return { boxesEarned, transportEarned, debt, totalBill, paid };
  };

  // Compile full detailed outflow logs for tracing
  interface OutflowLogItem {
    id: string;
    person: "Pavan" | "JC";
    title: string;
    amount: number;
    source: string;
    date: string;
  }

  const allOutflowItems: OutflowLogItem[] = [];

  pavanExpenses.forEach((e) => {
    if (matchesScope(e.expense_date)) {
      allOutflowItems.push({
        id: `pe-${e.id}`,
        person: "Pavan",
        title: "Direct Expense / Spend",
        amount: Number(e.amount || 0),
        source: e.source,
        date: e.expense_date
      });
    }
  });

  jcExpenses.forEach((e) => {
    if (matchesScope(e.expense_date)) {
      allOutflowItems.push({
        id: `je-${e.id}`,
        person: "JC",
        title: "Direct Expense / Spend",
        amount: Number(e.amount || 0),
        source: e.source,
        date: e.expense_date
      });
    }
  });

  pavanRepayments.forEach((r) => {
    if (matchesScope(r.repaid_date)) {
      allOutflowItems.push({
        id: `pr-${r.id}`,
        person: "Pavan",
        title: `Loan Repayment (${r.payment_type})`,
        amount: Number(r.amount || 0),
        source: r.source,
        date: r.repaid_date
      });
    }
  });

  jcRepayments.forEach((r) => {
    if (matchesScope(r.repaid_date)) {
      allOutflowItems.push({
        id: `jr-${r.id}`,
        person: "JC",
        title: `Loan Repayment (${r.payment_type})`,
        amount: Number(r.amount || 0),
        source: r.source,
        date: r.repaid_date
      });
    }
  });

  vehicleEmis.forEach((v) => {
    (v.payments || []).forEach((vp) => {
      if (matchesScope(vp.paid_date)) {
        allOutflowItems.push({
          id: `vep-${vp.id}`,
          person: "Pavan",
          title: `Vehicle EMI (${v.vehicle_name})`,
          amount: Number(vp.amount || 0),
          source: vp.source,
          date: vp.paid_date
        });
      }
    });
  });

  margadarshiChits.forEach((m) => {
    (m.payments || []).forEach((mp) => {
      if (matchesScope(mp.paid_date)) {
        allOutflowItems.push({
          id: `mp-${mp.id}`,
          person: "JC",
          title: `Margadarshi Chit Installment (${m.member_name})`,
          amount: Number(mp.installment_amount || 0),
          source: mp.source,
          date: mp.paid_date
        });
      }
    });
  });

  dharmasthalaChits.forEach((d) => {
    (d.payments || []).forEach((dp) => {
      if (matchesScope(dp.paid_date)) {
        allOutflowItems.push({
          id: `dp-${dp.id}`,
          person: "JC",
          title: `Dharmasthala Kanth #${dp.kanth_number}`,
          amount: Number(dp.amount || 0),
          source: dp.source,
          date: dp.paid_date
        });
      }
    });
  });

  // Calculate stream-specific totals
  const calculateTotals = () => {
    let boxesGross = 0;
    let transportGross = 0;
    let dairyGross = 0;
    let salaryGross = 0;
    let liftedGross = 0;
    let totalDebt = 0;

    orders.forEach((o) => {
      if (matchesScope(o.dispatchDate)) {
        const res = processOrderEarnings(o);
        boxesGross += res.boxesEarned;
        transportGross += res.transportEarned;
        totalDebt += res.debt;
      }
    });

    dairyRecords.forEach((d) => {
      if (matchesScope(d.received_date)) dairyGross += Number(d.amount || 0);
    });

    salaryRecords.forEach((s) => {
      if (matchesScope(s.credited_date)) salaryGross += Number(s.net_credited || 0);
    });

    margadarshiChits.forEach((m) => {
      if (m.is_lifted && m.lifted_date && matchesScope(m.lifted_date)) {
        liftedGross += Number(m.lifted_amount || 0);
      }
    });

    const isCentering = (src: string) => src && (src.includes("Centering") || src === "Centering Cash");
    const isDairy = (src: string) => src && (src.includes("Dairy") || src === "BMC Dairy Cash");
    const isSalary = (src: string) => src && (src.includes("Salary") || src === "JC Salary Cash");
    const isLifted = (src: string) => src && (src.includes("Lifted") || src === "Margadarshi Lifted Cash");

    let centeringSpent = 0;
    let dairySpent = 0;
    let salarySpent = 0;
    let liftedSpent = 0;
    let totalOutflows = 0;

    allOutflowItems.forEach((item) => {
      totalOutflows += item.amount;
      if (isCentering(item.source)) centeringSpent += item.amount;
      else if (isDairy(item.source)) dairySpent += item.amount;
      else if (isSalary(item.source)) salarySpent += item.amount;
      else if (isLifted(item.source)) liftedSpent += item.amount;
    });

    const centeringInflow = Math.round(boxesGross + transportGross);
    const centeringRemaining = Math.round(centeringInflow - centeringSpent);
    const dairyRemaining = Math.round(dairyGross - dairySpent);
    const salaryRemaining = Math.round(salaryGross - salarySpent);
    const liftedRemaining = Math.round(liftedGross - liftedSpent);

    const totalInflow = Math.round(boxesGross + transportGross + dairyGross + salaryGross + liftedGross);
    const netCashInHand = totalInflow - Math.round(totalOutflows);

    return {
      boxesGross: Math.round(boxesGross),
      transportGross: Math.round(transportGross),
      centeringInflow,
      centeringSpent: Math.round(centeringSpent),
      centeringRemaining,

      dairyGross: Math.round(dairyGross),
      dairySpent: Math.round(dairySpent),
      dairyRemaining,

      salaryGross: Math.round(salaryGross),
      salarySpent: Math.round(salarySpent),
      salaryRemaining,

      liftedGross: Math.round(liftedGross),
      liftedSpent: Math.round(liftedSpent),
      liftedRemaining,

      totalDebt: Math.round(totalDebt),
      totalInflow,
      totalOutflow: Math.round(totalOutflows),
      netCashInHand
    };
  };

  const totals = calculateTotals();

  // Drilldown Filter for Modal
  const getModalLogs = () => {
    if (!streamModalType) return [];
    if (streamModalType === "OUTFLOWS") return allOutflowItems;

    return allOutflowItems.filter((item) => {
      if (streamModalType === "CENTERING" || streamModalType === "TRANSPORT") {
        return item.source && (item.source.includes("Centering") || item.source === "Centering Cash");
      }
      if (streamModalType === "DAIRY") {
        return item.source && (item.source.includes("Dairy") || item.source === "BMC Dairy Cash");
      }
      if (streamModalType === "SALARY") {
        return item.source && (item.source.includes("Salary") || item.source === "JC Salary Cash");
      }
      if (streamModalType === "LIFTED") {
        return item.source && (item.source.includes("Lifted") || item.source === "Margadarshi Lifted Cash");
      }
      return false;
    });
  };

  const modalLogs = getModalLogs();

  const uncollectedOrders = orders
    .map((o) => {
      const res = processOrderEarnings(o);
      return { order: o, ...res };
    })
    .filter((o) => o.debt > 0);

  // Generate Recharts Bars
  const generateChartData = () => {
    if (filterMode === "MONTHLY") {
      if (selectedMonth === "ALL") {
        return MONTH_NAMES.map((name, idx) => {
          const mStr = String(idx + 1).padStart(2, "0");
          const prefix = `${selectedYear}-${mStr}`;

          let centering = 0;
          let transport = 0;
          let dairy = 0;
          let salary = 0;
          let outflows = 0;
          let pendingDebt = 0;

          orders.forEach((o) => {
            if (o.dispatchDate && o.dispatchDate.startsWith(prefix)) {
              const res = processOrderEarnings(o);
              centering += res.boxesEarned;
              transport += res.transportEarned;
              pendingDebt += res.debt;
            }
          });

          dairyRecords.forEach((d) => {
            if (d.received_date && d.received_date.startsWith(prefix)) dairy += Number(d.amount || 0);
          });

          salaryRecords.forEach((s) => {
            if (s.credited_date && s.credited_date.startsWith(prefix)) salary += Number(s.net_credited || 0);
          });

          allOutflowItems.forEach((it) => {
            if (it.date && it.date.startsWith(prefix)) outflows += it.amount;
          });

          return {
            label: name,
            centering: Math.round(centering),
            transport: Math.round(transport),
            dairy: Math.round(dairy),
            salary: Math.round(salary),
            outflows: Math.round(outflows),
            pendingDebt: Math.round(pendingDebt),
            netProfit: Math.round(centering + transport + dairy + salary - outflows)
          };
        });
      } else {
        const mStr = selectedMonth;
        const prefix = `${selectedYear}-${mStr}`;
        const name = MONTH_NAMES[Number(selectedMonth) - 1];

        let centering = 0;
        let transport = 0;
        let dairy = 0;
        let salary = 0;
        let outflows = 0;
        let pendingDebt = 0;

        orders.forEach((o) => {
          if (o.dispatchDate && o.dispatchDate.startsWith(prefix)) {
            const res = processOrderEarnings(o);
            centering += res.boxesEarned;
            transport += res.transportEarned;
            pendingDebt += res.debt;
          }
        });

        dairyRecords.forEach((d) => {
          if (d.received_date && d.received_date.startsWith(prefix)) dairy += Number(d.amount || 0);
        });

        salaryRecords.forEach((s) => {
          if (s.credited_date && s.credited_date.startsWith(prefix)) salary += Number(s.net_credited || 0);
        });

        allOutflowItems.forEach((it) => {
          if (it.date && it.date.startsWith(prefix)) outflows += it.amount;
        });

        return [{
          label: `${name} ${selectedYear}`,
          centering: Math.round(centering),
          transport: Math.round(transport),
          dairy: Math.round(dairy),
          salary: Math.round(salary),
          outflows: Math.round(outflows),
          pendingDebt: Math.round(pendingDebt),
          netProfit: Math.round(centering + transport + dairy + salary - outflows)
        }];
      }
    }

    const years = getAvailableYears().sort((a, b) => a.localeCompare(b));
    return years.map((yr) => {
      let centering = 0;
      let transport = 0;
      let dairy = 0;
      let salary = 0;
      let outflows = 0;
      let pendingDebt = 0;

      orders.forEach((o) => {
        if (o.dispatchDate && o.dispatchDate.startsWith(yr)) {
          const res = processOrderEarnings(o);
          centering += res.boxesEarned;
          transport += res.transportEarned;
          pendingDebt += res.debt;
        }
      });

      dairyRecords.forEach((d) => {
        if (d.received_date && d.received_date.startsWith(yr)) dairy += Number(d.amount || 0);
      });

      salaryRecords.forEach((s) => {
        if (s.credited_date && s.credited_date.startsWith(yr)) salary += Number(s.net_credited || 0);
      });

      allOutflowItems.forEach((it) => {
        if (it.date && it.date.startsWith(yr)) outflows += it.amount;
      });

      return {
        label: `Year ${yr}`,
        centering: Math.round(centering),
        transport: Math.round(transport),
        dairy: Math.round(dairy),
        salary: Math.round(salary),
        outflows: Math.round(outflows),
        pendingDebt: Math.round(pendingDebt),
        netProfit: Math.round(centering + transport + dairy + salary - outflows)
      };
    });
  };

  const chartData = generateChartData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* 1. FILTER BAR */}
      <div className="bg-[#0b1329] border border-cyan-500/40 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">FINANCIAL VIEW SELECTOR</h3>
            <p className="text-[11px] text-slate-400">
              Active: <strong className="text-cyan-400">
                {filterMode === "MONTHLY" 
                  ? (selectedMonth === "ALL" ? `All 12 Months of ${selectedYear}` : `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`)
                  : filterMode === "YEARLY" ? "Year-on-Year Growth" : "All-Time Lifetime Totals"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              type="button"
              onClick={() => setFilterMode("MONTHLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterMode === "MONTHLY" ? "bg-cyan-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
            >
              Month-wise
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("YEARLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterMode === "YEARLY" ? "bg-cyan-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
            >
              Year-wise
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("ALL_TIME")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterMode === "ALL_TIME" ? "bg-cyan-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
            >
              All Time
            </button>
          </div>

          {filterMode === "MONTHLY" && (
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                {getAvailableYears().map((y) => (
                  <option key={y} value={y} className="bg-slate-900">Year {y}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All 12 Months</option>
                {MONTH_NAMES.map((m, idx) => {
                  const val = String(idx + 1).padStart(2, "0");
                  return <option key={val} value={val} className="bg-slate-900">{m}</option>;
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP HERO CASH IN HAND SUMMARY */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b1329] to-slate-900 border-2 border-cyan-500/40 p-5 rounded-2xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              True Net Cash Balance (Total Earned minus All Spends & Repayments)
            </span>
            <div className="flex items-center gap-3 mt-1">
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-400">
                <Wallet className="w-7 h-7" />
              </div>
              <div>
                <h2 className={`text-3xl sm:text-4xl font-black ${totals.netCashInHand >= 0 ? "text-white" : "text-red-400"}`}>
                  ₹{totals.netCashInHand.toLocaleString("en-IN")}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  <span>Total Inflows: <strong className="text-emerald-400">₹{totals.totalInflow.toLocaleString("en-IN")}</strong></span>
                  <span>•</span>
                  <span>Total Outflows: <strong className="text-red-400">₹{totals.totalOutflow.toLocaleString("en-IN")}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowUncollectedModal(true)}
            className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 p-2.5 rounded-xl transition text-right group"
            title="Click to view full uncollected sites list"
          >
            <div className="flex items-center justify-end gap-1">
              <span className="text-[11px] text-red-300 uppercase font-extrabold">Market Balance Due</span>
              <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition" />
            </div>
            <span className="text-2xl font-black text-red-400">₹{totals.totalDebt.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-red-400/80 block underline">{uncollectedOrders.length} Sites Pending • View</span>
          </div>
        </div>

        {/* 6 SECTION AUDIT CARDS WITH DETAILED MODALS ON CLICK */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Centering Boxes */}
          <div 
            onClick={() => setStreamModalType("CENTERING")}
            className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/40 hover:border-amber-400 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase text-amber-400 font-bold">1. Centering</span>
              <span className="text-[10px] text-slate-500 group-hover:text-amber-400">Details →</span>
            </div>
            <h4 className="text-lg font-black text-white mt-1">₹{totals.boxesGross.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] text-slate-400 block">Remaining: <strong className="text-emerald-400">₹{totals.centeringRemaining.toLocaleString("en-IN")}</strong></span>
          </div>

          {/* Card 2: Ashok Leyland */}
          <div 
            onClick={() => setStreamModalType("TRANSPORT")}
            className="bg-slate-950/80 p-3 rounded-xl border border-blue-500/40 hover:border-blue-400 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase text-blue-400 font-bold">2. Transport</span>
              <span className="text-[10px] text-slate-500 group-hover:text-blue-400">Details →</span>
            </div>
            <h4 className="text-lg font-black text-white mt-1">₹{totals.transportGross.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] text-slate-400 block">Trip delivery fees</span>
          </div>

          {/* Card 3: BMC Dairy */}
          <div 
            onClick={() => setStreamModalType("DAIRY")}
            className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/40 hover:border-emerald-400 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase text-emerald-400 font-bold">3. BMC Dairy</span>
              <span className="text-[10px] text-slate-500 group-hover:text-emerald-400">Details →</span>
            </div>
            <h4 className="text-lg font-black text-white mt-1">₹{totals.dairyGross.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] text-slate-400 block">Remaining: <strong className="text-emerald-400">₹{totals.dairyRemaining.toLocaleString("en-IN")}</strong></span>
          </div>

          {/* Card 4: JC Salary */}
          <div 
            onClick={() => setStreamModalType("SALARY")}
            className="bg-slate-950/80 p-3 rounded-xl border border-indigo-500/40 hover:border-indigo-400 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase text-indigo-400 font-bold">4. JC Salary</span>
              <span className="text-[10px] text-slate-500 group-hover:text-indigo-400">Details →</span>
            </div>
            <h4 className="text-lg font-black text-white mt-1">₹{totals.salaryGross.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] text-slate-400 block">Remaining: <strong className="text-emerald-400">₹{totals.salaryRemaining.toLocaleString("en-IN")}</strong></span>
          </div>

          {/* Card 5: Margadarshi Lifted */}
          <div 
            onClick={() => setStreamModalType("LIFTED")}
            className="bg-slate-950/80 p-3 rounded-xl border border-teal-500/40 hover:border-teal-400 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase text-teal-400 font-bold">5. Chit Lifted</span>
              <span className="text-[10px] text-slate-500 group-hover:text-teal-400">Details →</span>
            </div>
            <h4 className="text-lg font-black text-white mt-1">₹{totals.liftedGross.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] text-slate-400 block">Remaining: <strong className="text-emerald-400">₹{totals.liftedRemaining.toLocaleString("en-IN")}</strong></span>
          </div>

          {/* Card 6: Total Outflows */}
          <div 
            onClick={() => setStreamModalType("OUTFLOWS")}
            className="bg-slate-950/80 p-3 rounded-xl border border-purple-500/40 hover:border-purple-400 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase text-purple-400 font-bold">6. Outflows</span>
              <span className="text-[10px] text-slate-500 group-hover:text-purple-400">Details →</span>
            </div>
            <h4 className="text-lg font-black text-red-400 mt-1">₹{totals.totalOutflow.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] text-slate-500 block">EMIs, Chits, Spends</span>
          </div>
        </div>
      </div>

      {/* 3. RECHARTS MULTI-STREAM BAR VISUALIZER */}
      <div className="bg-[#0b1329] p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" /> Revenue & Outflow Visualizer
          </h3>
          <span className="text-[11px] text-slate-400">Compare earnings vs spends dynamically</span>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#020617", borderColor: "#38bdf8", borderRadius: 10, color: "#fff", fontSize: 12 }}
                formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString("en-IN")}`, name]}
              />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />

              <Bar dataKey="centering" name="Centering Boxes (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="transport" name="Ashok Leyland (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dairy" name="BMC Milk Dairy (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="salary" name="JC Salary (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflows" name="Total Outflows (₹)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendingDebt" name="Pending Balance Due (₹)" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. EXECUTIVE FINANCIAL STATEMENT MATRIX TABLE */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-2xl space-y-4">
        <div className="border-b border-slate-700 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" /> Executive Financial Statement Matrix
          </h3>
          <p className="text-xs text-slate-400">Full audit breakdown of Inflow, Outflow, and Net Profit across periods</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-3 font-sans">Period</th>
                <th className="p-3 text-right">Centering</th>
                <th className="p-3 text-right">Transport</th>
                <th className="p-3 text-right">Dairy</th>
                <th className="p-3 text-right">JC Salary</th>
                <th className="p-3 text-right text-red-400">Outflows</th>
                <th className="p-3 text-right text-emerald-400">Net Profit</th>
                <th className="p-3 text-right text-purple-400">Market Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 transition">
                  <td className="p-3 font-sans font-bold text-white">{row.label}</td>
                  <td className="p-3 text-right text-amber-400">₹{row.centering.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-blue-400">₹{row.transport.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-emerald-400">₹{row.dairy.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-indigo-400">₹{row.salary.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right text-red-400 font-bold">-₹{row.outflows.toLocaleString("en-IN")}</td>
                  <td className={`p-3 text-right font-black ${row.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ₹{row.netProfit.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-right text-purple-400 font-bold">₹{row.pendingDebt.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. AUDIT DETAILS DRILLDOWN MODAL (EXACT LOG TRACING) */}
      {streamModalType && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-slate-700 max-w-2xl w-full p-6 rounded-2xl space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setStreamModalType(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                {streamModalType === "CENTERING" && "🏗️ Centering Boxes Rental Stream Audit"}
                {streamModalType === "TRANSPORT" && "🚚 Ashok Leyland Transport Stream Audit"}
                {streamModalType === "DAIRY" && "🥛 BMC Milk Dairy Stream Audit"}
                {streamModalType === "SALARY" && "💼 JC Salary Inflow & Spend Audit"}
                {streamModalType === "LIFTED" && "💰 Margadarshi Lifted Chit Cash Audit"}
                {streamModalType === "OUTFLOWS" && "📉 All Business Outflows (Where money went)"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Full breakdown showing total earned, where each rupee went, who spent it, and remaining cash.
              </p>
            </div>

            {/* Inflow vs Outflow vs Remaining Card */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Total Inflow:</span>
                <strong className="text-white text-sm">
                  ₹{streamModalType === "CENTERING" ? totals.boxesGross.toLocaleString("en-IN")
                    : streamModalType === "TRANSPORT" ? totals.transportGross.toLocaleString("en-IN")
                    : streamModalType === "DAIRY" ? totals.dairyGross.toLocaleString("en-IN")
                    : streamModalType === "SALARY" ? totals.salaryGross.toLocaleString("en-IN")
                    : streamModalType === "LIFTED" ? totals.liftedGross.toLocaleString("en-IN")
                    : totals.totalInflow.toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Total Spent:</span>
                <strong className="text-red-400 text-sm">
                  -₹{streamModalType === "CENTERING" || streamModalType === "TRANSPORT" ? totals.centeringSpent.toLocaleString("en-IN")
                    : streamModalType === "DAIRY" ? totals.dairySpent.toLocaleString("en-IN")
                    : streamModalType === "SALARY" ? totals.salarySpent.toLocaleString("en-IN")
                    : streamModalType === "LIFTED" ? totals.liftedSpent.toLocaleString("en-IN")
                    : totals.totalOutflow.toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">Remaining in Hand:</span>
                <strong className="text-emerald-400 text-sm">
                  ₹{streamModalType === "CENTERING" || streamModalType === "TRANSPORT" ? totals.centeringRemaining.toLocaleString("en-IN")
                    : streamModalType === "DAIRY" ? totals.dairyRemaining.toLocaleString("en-IN")
                    : streamModalType === "SALARY" ? totals.salaryRemaining.toLocaleString("en-IN")
                    : streamModalType === "LIFTED" ? totals.liftedRemaining.toLocaleString("en-IN")
                    : totals.netCashInHand.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            {/* Detailed Itemized Outflow Logs */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 text-xs">
              <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                Where Did This Money Go? (ಹಣ ಎಲ್ಲಿ ಖರ್ಚಾಯ್ತು / ಯಾರಿಂದ ಹೋಯ್ತು):
              </span>

              {modalLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-6 italic">No outflow spends logged from this source in the selected period.</p>
              ) : (
                modalLogs.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{item.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.person === "Pavan" ? "bg-purple-500/20 text-purple-300" : "bg-indigo-500/20 text-indigo-300"}`}>
                          Spent by: {item.person}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Fund Source: {item.source}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-red-400 text-sm block">-₹{item.amount.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(item.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStreamModalType(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. UNCOLLECTED SITES MODAL */}
      {showUncollectedModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-red-500/40 max-w-2xl w-full p-6 rounded-2xl space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowUncollectedModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Pending Market Collections Due
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Total Uncollected: <strong className="text-red-400 font-bold">₹{totals.totalDebt.toLocaleString("en-IN")}</strong> across <strong className="text-white">{uncollectedOrders.length} sites</strong>.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 text-xs">
              {uncollectedOrders.map(({ order, totalBill, paid, debt }) => (
                <div key={order.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white text-sm block">{order.customerName}</span>
                    <span className="text-[11px] text-slate-400">Place: {order.place} • Phone: {order.customerPhone}</span>
                    <span className="text-[10px] text-slate-500 block">Total Bill: ₹{totalBill} | Paid: ₹{paid}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-red-400 block">₹{debt.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] text-slate-500">{formatDate(order.dispatchDate)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowUncollectedModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}