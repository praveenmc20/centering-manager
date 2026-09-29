"use client";

import React, { useState, useRef } from "react";
import { 
  MapPin, Phone, Calendar, Truck, Edit3, IndianRupee, 
  Receipt, Trash2, Camera, X, Share2, Loader2, Download, 
  CheckCircle2, ShieldCheck, FileText, Sparkles, Check, CheckCheck, Image as ImageIcon
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { Order, Item, Payment, SitePhotoItem } from "../types";

interface SitesKhataProps {
  orders: Order[];
  currentUser: "ADMIN" | "PAVAN" | "JC";
  onRefresh: () => Promise<void>;
  formatDate: (date: string) => string;
  calculateReturnDateString: (startDate: string, days: number) => string;
}

export default function SitesKhata({
  orders,
  currentUser,
  onRefresh,
  formatDate,
  calculateReturnDateString
}: SitesKhataProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settleDays, setSettleDays] = useState("3");
  const [settleItems, setSettleItems] = useState<Item[]>([]);
  const [settledVehicleFee, setSettledVehicleFee] = useState("1000");
  const [isLumpSum, setIsLumpSum] = useState(false);
  const [lumpSumAmount, setLumpSumAmount] = useState("4500");
  const [settlementPayment, setSettlementPayment] = useState("0");

  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [customPayAmount, setCustomPayAmount] = useState("");

  const [billReceiptOrder, setBillReceiptOrder] = useState<Order | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ photos: SitePhotoItem[]; currentIndex: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [photoGenerating, setPhotoGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement | null>(null);

  const getTotalPaid = (payments: Payment[]) => payments.reduce((acc, p) => acc + Number(p.amount), 0);

  const openSettlement = (order: Order) => {
    setSelectedOrder(order);
    setSettleItems(order.items.map(it => ({ ...it })));
    setSettledVehicleFee(String(order.transportSettled || order.transportAgreed));
    setSettleDays(String(order.totalDays || 3));
    setSettlementPayment("0");
  };

  const calculateItemsSubtotal = () => {
    const days = Number(settleDays) || 1;
    return settleItems.reduce((sum, it) => sum + (it.qty * it.finalRate * days), 0);
  };

  const handleSaveSettlement = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    const vehicleFee = Number(settledVehicleFee) || 0;
    const finalBillTotal = isLumpSum ? (Number(lumpSumAmount) || 0) : (calculateItemsSubtotal() + vehicleFee);
    
    const paidToday = Number(settlementPayment) || 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const daysCount = Number(settleDays) || 1;

    try {
      if (paidToday > 0) {
        await supabase.from("order_payments").insert({
          order_id: selectedOrder.id,
          type: "On Return Payment",
          amount: paidToday,
          date: todayStr
        });
      }
      for (const it of settleItems) {
        if (it.id) {
          await supabase.from("order_items").update({ final_rate: it.finalRate }).eq("id", it.id);
        }
      }
      const totalPaidAlready = getTotalPaid(selectedOrder.payments) + paidToday;
      const newStatus = totalPaidAlready >= finalBillTotal ? "COMPLETED" : "PENDING_BALANCE";

      await supabase.from("orders").update({
        return_date: todayStr,
        total_days: daysCount,
        transport_settled: vehicleFee,
        final_lump_sum: finalBillTotal,
        status: newStatus
      }).eq("id", selectedOrder.id);

      await onRefresh();
      setSelectedOrder(null);
    } catch (err: any) {
      alert("Error saving settlement: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModalOrder) return;
    setLoading(true);
    const amountNum = Number(customPayAmount) || 0;
    const todayStr = new Date().toISOString().split("T")[0];

    try {
      if (amountNum > 0) {
        await supabase.from("order_payments").insert({
          order_id: paymentModalOrder.id,
          type: "Partial Payment",
          amount: amountNum,
          date: todayStr
        });
      }

      const totalPaid = getTotalPaid(paymentModalOrder.payments) + amountNum;
      const billTotal = paymentModalOrder.finalLumpSum || 0;
      const updatedStatus = totalPaid >= billTotal ? "COMPLETED" : "PENDING_BALANCE";

      await supabase.from("orders").update({ status: updatedStatus }).eq("id", paymentModalOrder.id);
      await onRefresh();
      setPaymentModalOrder(null);
      setCustomPayAmount("");
    } catch (err: any) {
      alert("Error adding payment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEraseBalance = async (order: Order) => {
    if (!confirm(`Erase pending balance for ${order.customerName} and mark as fully cleared?`)) return;
    setLoading(true);
    try {
      await supabase.from("orders").update({ status: "COMPLETED" }).eq("id", order.id);
      await onRefresh();
    } catch (err: any) {
      alert("Error clearing balance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (currentUser !== "ADMIN") return;
    if (!confirm("Permanently delete this order?")) return;
    setLoading(true);
    try {
      await supabase.from("orders").delete().eq("id", orderId);
      await onRefresh();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateReceiptDiscount = (order: Order) => {
    const days = order.totalDays || 3;
    const initialBoxes = order.items.reduce((acc, it) => acc + (it.qty * it.initialRate * days), 0);
    const initialAgreedTotal = initialBoxes + order.transportAgreed;
    const actualFinalBill = order.finalLumpSum !== null 
      ? order.finalLumpSum 
      : (order.items.reduce((acc, it) => acc + (it.qty * it.finalRate * days), 0) + order.transportSettled);
    const totalSaved = Math.max(0, initialAgreedTotal - actualFinalBill);
    return { initialAgreedTotal, actualFinalBill, totalSaved, showDiscount: totalSaved >= 50, days };
  };

  const getCorrectReturnDateStr = (order: Order, days: number) => {
    if (order.returnDate) return formatDate(order.returnDate);
    if (!order.dispatchDate) return "";
    const d = new Date(order.dispatchDate + "T00:00:00");
    d.setDate(d.getDate() + Math.max(0, days - 1));
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  const downloadPremiumPDF = async (order: Order) => {
    if (!invoiceRef.current) return;
    setPdfGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = invoiceRef.current;
      const opt = {
        margin: [6, 6, 6, 6] as [number, number, number, number],
        filename: `Brothers_Invoice_${order.id}_${order.customerName.replace(/\s+/g, "_")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err: any) {
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  };

  const downloadBillAsPhoto = async (order: Order) => {
    if (!invoiceRef.current) return;
    setPhotoGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imageURL = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = imageURL;
      downloadLink.download = `Brothers_Bill_${order.id}_${order.customerName.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err: any) {
      alert("Error generating bill photo: " + err.message);
    } finally {
      setPhotoGenerating(false);
    }
  };

  const shareReceiptToWhatsApp = async (order: Order) => {
    const { initialAgreedTotal, actualFinalBill, totalSaved, showDiscount, days } = calculateReceiptDiscount(order);
    const totalPaid = getTotalPaid(order.payments);
    const balance = Math.max(0, actualFinalBill - totalPaid);
    const returnDateStr = getCorrectReturnDateStr(order, days);

    await downloadPremiumPDF(order);

    let itemsText = order.items.map(i => `  • ${i.name} [${i.qty} Pcs @ ₹${i.finalRate || i.initialRate}/day]`).join("\n");
    let discountSection = showDiscount ? `\n🏷️ *Initial Value:* ₹${initialAgreedTotal}\n🎉 *Bargain / Discount:* ₹${totalSaved}` : "";

    const message = `🏛️ *BROTHERS CENTERING & TRANSPORT*
_Ashok Leyland Logistics & Building Centering Materials_
------------------------------------------------
📄 *OFFICIAL TAX / RENTAL INVOICE:* #${order.id}
👤 *Client Name:* ${order.customerName}
📍 *Site Destination:* ${order.place}
📅 *Dispatch Date:* ${formatDate(order.dispatchDate)}
🔄 *Return / Settle Date:* ${returnDateStr}
⏳ *Total Days on Site:* ${days} Days
------------------------------------------------
📦 *SUPPLIED MATERIALS:*
${itemsText}
🚚 *Ashok Leyland Site Transport:* ₹${order.transportSettled || order.transportAgreed}
------------------------------------------------${discountSection}
💰 *TOTAL INVOICE:* ₹${actualFinalBill}
✅ *TOTAL RECEIVED:* ₹${totalPaid}
🔴 *BALANCE PAYABLE:* ₹${balance}
------------------------------------------------
📌 *STATUS:* ${balance === 0 ? "PAID IN FULL & SETTLED ✅" : `BALANCE PENDING (₹${balance}) ⏳`}

📞 *Contact:* 8123238826 / 8970685284
_Thank you for choosing Brothers Centering Yard._`;

    const encoded = encodeURIComponent(message);
    const phone = order.customerPhone && order.customerPhone !== "N/A" ? order.customerPhone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-300">Live Sites & Outstanding Collections</h2>

      {orders.length === 0 && (
        <div className="bg-slate-800/60 border border-slate-700 p-8 rounded-lg text-center text-slate-400 text-sm">
          No active orders recorded yet.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {orders.map((ord) => {
          const totalPaid = getTotalPaid(ord.payments);
          const finalBill = ord.finalLumpSum || 0;
          const balanceRemaining = Math.max(0, finalBill - totalPaid);

          return (
            <div key={ord.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row justify-between gap-4 relative shadow-xl">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-lg text-white">{ord.customerName}</span>
                  {ord.status === "ON_SITE" && <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-0.5 rounded-full border border-blue-500/30 font-semibold">ON SITE</span>}
                  {ord.status === "PENDING_BALANCE" && <span className="bg-red-500/20 text-red-400 text-xs px-2.5 py-0.5 rounded-full border border-red-500/30 font-semibold">PENDING ₹{balanceRemaining}</span>}
                  {ord.status === "COMPLETED" && <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-0.5 rounded-full border border-green-500/30 font-semibold">CLEARED</span>}

                  {ord.sitePhotos && ord.sitePhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoModal({ photos: ord.sitePhotos, currentIndex: 0 })}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 transition"
                    >
                      <Camera className="w-3 h-3 text-purple-400" /> View {ord.sitePhotos.length} Proofs
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-500" /> {ord.place}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {ord.customerPhone}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-blue-400" /> Sent: {formatDate(ord.dispatchDate)}</span>
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-400" /> Vehicle: ₹{ord.transportSettled || ord.transportAgreed}</span>
                </div>

                <div className="mt-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block mb-1">Materials Out:</span>
                  {ord.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{it.name} ({it.qty} pcs)</span>
                      <span className="text-amber-400 font-medium">₹{it.finalRate || it.initialRate}/day</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-56 bg-slate-950/40 p-3 rounded-lg border border-slate-700/60 text-xs space-y-1">
                <div className="text-slate-400 font-semibold mb-1">Payments Log:</div>
                {ord.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>{p.type}:</span>
                    <span className="font-semibold text-amber-400">₹{p.amount}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                  <span>Total Paid:</span>
                  <span className="text-emerald-400">₹{totalPaid}</span>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2 min-w-[165px]">
                {currentUser !== "JC" && ord.status === "ON_SITE" && (
                  <button onClick={() => openSettlement(ord)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow">
                    <Edit3 className="w-4 h-4" /> Return & Settle
                  </button>
                )}

                {currentUser !== "JC" && ord.status === "PENDING_BALANCE" && (
                  <>
                    <button
                      onClick={() => {
                        setPaymentModalOrder(ord);
                        setCustomPayAmount(balanceRemaining.toString());
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <IndianRupee className="w-4 h-4" /> Add Payment
                    </button>

                    <button
                      onClick={() => handleEraseBalance(ord)}
                      className="bg-slate-700 hover:bg-red-600/30 text-amber-300 hover:text-red-300 border border-amber-500/40 font-semibold px-3 py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1 transition"
                      title="Erase remaining balance and clear account without changing graph"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-amber-400" /> Erase / Clear Due
                    </button>
                  </>
                )}

                <button 
                  onClick={() => setBillReceiptOrder(ord)} 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black px-3.5 py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xl transition transform hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-black" /> View Digital Bill
                </button>

                {currentUser === "ADMIN" && (
                  <button onClick={() => handleDeleteOrder(ord.id)} className="text-red-400 hover:text-red-300 text-xs py-1 flex items-center justify-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Site
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settle Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 max-w-lg w-full p-5 rounded-xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-white border-b border-slate-700 pb-2">
              Settle Account: {selectedOrder.customerName}
            </h3>

            <div className="bg-slate-950 p-3 rounded-lg text-xs space-y-1 border border-slate-700">
              <div className="text-slate-400">Dispatch Date: <strong className="text-amber-400">{formatDate(selectedOrder.dispatchDate)}</strong></div>
              <div className="text-slate-300">Return Date: <strong className="text-emerald-400">{calculateReturnDateString(selectedOrder.dispatchDate, Number(settleDays) || 1)}</strong></div>
            </div>

            <div className="flex gap-4 text-xs font-semibold">
              <button type="button" onClick={() => setIsLumpSum(false)} className={`flex-1 py-2 rounded-lg ${!isLumpSum ? "bg-amber-500 text-black font-bold" : "bg-slate-700 text-slate-300"}`}>
                Item Rate + Vehicle
              </button>
              <button type="button" onClick={() => setIsLumpSum(true)} className={`flex-1 py-2 rounded-lg ${isLumpSum ? "bg-amber-500 text-black font-bold" : "bg-slate-700 text-slate-300"}`}>
                Direct Lump-Sum Bargain
              </button>
            </div>

            {!isLumpSum ? (
              <div className="space-y-3 bg-slate-900/60 p-3 rounded-lg">
                <div>
                  <label className="text-xs text-slate-400">Total Days Kept</label>
                  <input type="text" value={settleDays} onChange={e => setSettleDays(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Negotiate Daily Rate per Item (if reduced):</label>
                  {settleItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">{item.name} ({item.qty} pcs)</span>
                      <div className="flex items-center gap-1">
                        <span>₹</span>
                        <input
                          type="text"
                          value={item.finalRate}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const updated = [...settleItems];
                            updated[idx].finalRate = Number(val) || 0;
                            setSettleItems(updated);
                          }}
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-right text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-slate-400">Ashok Leyland Vehicle Rent</label>
                  <input type="text" value={settledVehicleFee} onChange={e => setSettledVehicleFee(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 text-white" />
                </div>
                <div className="text-xs font-bold text-amber-400 pt-2 border-t border-slate-800 flex justify-between">
                  <span>Calculated Final Bill:</span>
                  <span>₹{calculateItemsSubtotal() + (Number(settledVehicleFee) || 0)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg">
                <div>
                  <label className="text-xs text-slate-400">Total Days Kept</label>
                  <input type="text" value={settleDays} onChange={e => setSettleDays(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 text-white font-bold" />
                </div>
                <label className="text-xs text-slate-400">Direct Negotiated Lump-sum Total (₹)</label>
                <input type="text" value={lumpSumAmount} onChange={e => setLumpSumAmount(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white" placeholder="e.g. 4500" />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400">Amount Paying on Spot Today (₹)</label>
              <input type="text" value={settlementPayment} onChange={e => setSettlementPayment(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm mt-1 text-white" placeholder="0" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-slate-700 py-2.5 rounded-lg text-sm text-slate-300 font-semibold">Cancel</button>
              <button onClick={handleSaveSettlement} disabled={loading} className="flex-1 bg-amber-500 text-black py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 max-w-sm w-full p-5 rounded-xl space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Record Payment</h3>
            <div className="text-xs text-slate-400">
              Customer: <strong className="text-white">{paymentModalOrder.customerName}</strong>
              <div className="text-red-400 mt-1 font-semibold">
                Total Remaining: ₹{Math.max(0, (paymentModalOrder.finalLumpSum || 0) - getTotalPaid(paymentModalOrder.payments))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Amount Giving Now (₹)</label>
              <input type="text" value={customPayAmount} onChange={e => setCustomPayAmount(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm mt-1 text-white focus:border-emerald-500 outline-none" placeholder="Enter amount given" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPaymentModalOrder(null)} className="flex-1 bg-slate-700 py-2 rounded-lg text-xs text-slate-300">Cancel</button>
              <button onClick={handleRecordPayment} disabled={loading} className="flex-1 bg-emerald-500 text-black font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Modal */}
      {billReceiptOrder && (() => {
        const { initialAgreedTotal, actualFinalBill, totalSaved, showDiscount, days } = calculateReceiptDiscount(billReceiptOrder);
        const totalPaid = getTotalPaid(billReceiptOrder.payments);
        const balance = Math.max(0, actualFinalBill - totalPaid);
        const returnDateStr = getCorrectReturnDateStr(billReceiptOrder, days);

        return (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-1 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-[#ffffff] border-2 border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
              
              <div className="bg-[#0f172a] px-4 sm:px-5 py-3.5 border-b border-slate-800 flex justify-between items-center print:hidden">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Official Corporate Tax Invoice
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => downloadBillAsPhoto(billReceiptOrder)}
                    disabled={photoGenerating}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow"
                  >
                    {photoGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    Send Bill Photo (.png)
                  </button>
                  <button
                    onClick={() => shareReceiptToWhatsApp(billReceiptOrder)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Send WhatsApp
                  </button>
                  <button
                    onClick={() => setBillReceiptOrder(null)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Professional Light Corporate Invoice Template - Exact Original Design with Mobile Horizontal Scroll safety */}
              <div 
                ref={invoiceRef} 
                style={{ backgroundColor: "#ffffff", color: "#1e293b", padding: "32px", fontFamily: "sans-serif", position: "relative" }}
                className="overflow-x-auto overflow-y-auto space-y-6 w-full"
              >
                {/* Top Banner / Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e2e8f0", paddingBottom: "20px", minWidth: "480px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {/* JC Logo without any green border */}
                    <div style={{ width: "54px", height: "54px", borderRadius: "12px", background: "#0f172a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <img src="/icon.png" alt="JC Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div>
                      <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
                        BROTHERS CENTERING & TRANSPORT
                      </h1>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                        Ashok Leyland Logistics & Heavy Column Box Molds
                      </p>
                      <p style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", margin: "2px 0 0 0" }}>
                        Karnataka, India • 📞 8123238826 / 8970685284
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <h2 style={{ fontSize: "26px", fontWeight: "900", color: "#16a34a", margin: 0, letterSpacing: "1px" }}>INVOICE</h2>
                    <p style={{ fontSize: "12px", color: "#0f172a", fontWeight: "bold", margin: "4px 0 2px 0" }}>Invoice Number: <span style={{ fontFamily: "monospace" }}>#{billReceiptOrder.id}</span></p>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Date: {formatDate(new Date().toISOString().split("T")[0])}</p>
                  </div>
                </div>

                {/* Bill To & Invoice From */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", fontSize: "12px", minWidth: "480px" }}>
                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "900", letterSpacing: "1px", color: "#16a34a", display: "block", marginBottom: "4px" }}>Invoice To:</span>
                    <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>{billReceiptOrder.customerName}</h3>
                    <p style={{ color: "#475569", margin: "2px 0" }}>📍 {billReceiptOrder.place}</p>
                    <p style={{ color: "#475569", margin: "2px 0" }}>📞 {billReceiptOrder.customerPhone}</p>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "900", letterSpacing: "1px", color: "#16a34a", display: "block", marginBottom: "4px" }}>Rental Cycle Timeline:</span>
                    <p style={{ color: "#475569", margin: "2px 0" }}>Dispatched: <strong style={{ color: "#0f172a" }}>{formatDate(billReceiptOrder.dispatchDate)}</strong></p>
                    <p style={{ color: "#475569", margin: "2px 0" }}>Return / Settle: <strong style={{ color: "#0f172a" }}>{returnDateStr}</strong></p>
                    <p style={{ color: "#0f172a", fontWeight: "bold", marginTop: "4px" }}>Duration: {days} Days on Site</p>
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #cbd5e1", minWidth: "480px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#16a34a", color: "#ffffff", fontWeight: "bold", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>
                        <th style={{ padding: "10px 14px" }}>No. / Product Description</th>
                        <th style={{ padding: "10px 8px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "10px 8px", textAlign: "right" }}>Rate / Day</th>
                        <th style={{ padding: "10px 8px", textAlign: "center" }}>Days</th>
                        <th style={{ padding: "10px 14px", textAlign: "right" }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontFamily: "monospace", color: "#334155" }}>
                      {billReceiptOrder.items.map((it, idx) => {
                        const rate = it.finalRate || it.initialRate;
                        const lineTotal = it.qty * rate * days;
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#f8fafc" : "#ffffff" }}>
                            <td style={{ padding: "10px 14px", fontFamily: "sans-serif", fontWeight: "600", color: "#0f172a" }}>
                              {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}. {it.name}
                            </td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{it.qty}</td>
                            <td style={{ padding: "10px 8px", textAlign: "right" }}>₹{rate}</td>
                            <td style={{ padding: "10px 8px", textAlign: "center" }}>{days}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: "bold", color: "#0f172a" }}>₹{lineTotal.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}

                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                        <td colSpan={4} style={{ padding: "10px 14px", fontFamily: "sans-serif", fontWeight: "600", color: "#0284c7" }}>
                          🚚 Ashok Leyland Site Delivery Freight
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: "bold", color: "#0284c7" }}>
                          ₹{(billReceiptOrder.transportSettled || billReceiptOrder.transportAgreed).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Subtotals & Grand Total Section */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start", minWidth: "480px" }}>
                  <div>
                    <h4 style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", margin: "0 0 6px 0" }}>Terms & Conditions:</h4>
                    <p style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.4", margin: 0 }}>
                      1. All rental items must be returned in good condition. Damages will be assessed upon return.<br />
                      2. Payment is due immediately upon receipt of this commercial invoice.<br />
                      3. GPS Verified On-Site Proof logged securely in JC Group's system.
                    </p>
                  </div>

                  <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "14px", fontSize: "12px", fontFamily: "monospace" }}>
                    {showDiscount && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontFamily: "sans-serif", marginBottom: "4px" }}>
                          <span>Original Value:</span>
                          <span>₹{initialAgreedTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontWeight: "bold", fontFamily: "sans-serif", marginBottom: "6px" }}>
                          <span>Bargain / Discount:</span>
                          <span>-₹{totalSaved.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#0f172a", fontFamily: "sans-serif", paddingBottom: "6px", borderBottom: "1px solid #cbd5e1" }}>
                      <span>Subtotal:</span>
                      <span>₹{actualFinalBill.toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontFamily: "sans-serif", paddingTop: "6px" }}>
                      <span>Total Paid:</span>
                      <span>-₹{totalPaid.toLocaleString("en-IN")}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#16a34a", color: "#ffffff", padding: "10px 12px", borderRadius: "8px", fontWeight: "900", fontSize: "15px", marginTop: "10px", fontFamily: "sans-serif" }}>
                      <span>{balance === 0 ? "TOTAL PAID" : "BALANCE DUE:"}</span>
                      <span>₹{balance.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Signature & Official JC Seal Section - Exact Original Unified Layout */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "24px", borderTop: "2px solid #e2e8f0", position: "relative", minWidth: "480px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>Payment Method: Cash / Online Transfer</p>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>Thank you for your business!</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                    {/* Official JC Seal Image from public/seal.png */}
                    <div style={{ width: "110px", height: "110px", opacity: 0.92, transform: "rotate(-8deg)", flexShrink: 0 }}>
                      <img 
                        src="/seal.png" 
                        alt="JC Official Seal" 
                        style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply" }} 
                      />
                    </div>

                    {/* Brother's Signature with solid continuous line */}
                    <div style={{ textAlign: "center", width: "180px" }}>
                      <div style={{ height: "48px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2px" }}>
                        <img 
                          src="/signature.png" 
                          alt="Authorized Signature" 
                          style={{ maxHeight: "45px", maxWidth: "100%", objectFit: "contain", filter: "contrast(180%)" }}
                        />
                      </div>
                      <div style={{ width: "100%", borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: "bold", fontSize: "11px", color: "#0f172a", textAlign: "center" }}>
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="bg-[#0f172a] p-4 border-t border-slate-800 flex justify-end gap-3 flex-wrap">
                <button
                  onClick={() => setBillReceiptOrder(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadBillAsPhoto(billReceiptOrder)}
                  disabled={photoGenerating}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black px-4 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-lg transition"
                >
                  {photoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Download Bill Photo (.png)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Multi-Photo Viewer Modal */}
      {previewPhotoModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full p-5 rounded-2xl space-y-3 relative flex flex-col">
            <button onClick={() => setPreviewPhotoModal(null)} className="absolute right-3 top-3 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" /> On-Site GPS Proof Photos
              </h4>
              <span className="text-xs text-amber-400 font-bold">
                Photo {previewPhotoModal.currentIndex + 1} of {previewPhotoModal.photos.length}
              </span>
            </div>
            <div className="max-h-[65vh] overflow-hidden rounded-xl border border-slate-800 flex items-center justify-center bg-black">
              <img src={previewPhotoModal.photos[previewPhotoModal.currentIndex]?.url} alt="Proof" className="w-full h-auto max-h-[65vh] object-contain" />
            </div>
            {previewPhotoModal.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {previewPhotoModal.photos.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewPhotoModal({ ...previewPhotoModal, currentIndex: idx })}
                    className={`w-16 h-12 rounded border overflow-hidden flex-shrink-0 transition ${previewPhotoModal.currentIndex === idx ? "border-amber-500 ring-2 ring-amber-500/50" : "border-slate-700 opacity-60"}`}
                  >
                    <img src={p.url} alt="Spot" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}