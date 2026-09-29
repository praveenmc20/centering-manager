"use client";

import React, { useState, useRef } from "react";
import { PlusCircle, Calendar, Camera, Plus, Trash2, Loader2, X } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { SitePhotoItem } from "../types";

interface NewDispatchProps {
  currentUser: "ADMIN" | "PAVAN" | "JC";
  onSuccess: () => Promise<void>;
  formatDate: (date: string) => string;
}

export default function NewDispatch({ currentUser, onSuccess, formatDate }: NewDispatchProps) {
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custPlace, setCustPlace] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [transportFee, setTransportFee] = useState("1000");
  const [advancePaid, setAdvancePaid] = useState("");
  const [dispatchItems, setDispatchItems] = useState([
    { name: "4x4 Column Box", qty: "4", rate: "100" }
  ]);

  const [capturedPhotos, setCapturedPhotos] = useState<Array<{ blob: Blob; url: string; address: string; lat: string; lng: string }>>([]);
  const [liveGpsInfo, setLiveGpsInfo] = useState<{ lat: string; lng: string; address: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) return data.display_name;
    } catch (e) {
      console.warn("Geocoding notice:", e);
    }
    return custPlace ? `${custPlace}, Karnataka, India` : "Site Location, Karnataka";
  };

  const openLiveCamera = async () => {
    setGpsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const fullAddr = await reverseGeocode(lat, lng);
          setLiveGpsInfo({ lat: lat.toFixed(6), lng: lng.toFixed(6), address: fullAddr });
        },
        () => {
          setLiveGpsInfo({ lat: "12.328400", lng: "76.612600", address: custPlace ? `${custPlace}, Karnataka` : "Karnataka" });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: currentUser === "ADMIN" ? "user" : { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraOpen(true);
      setGpsLoading(false);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 250);
    } catch (err: any) {
      setGpsLoading(false);
      alert("Camera access denied: " + err.message);
    }
  };

  const closeLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureFrameFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const stampHeight = Math.max(105, Math.round(canvas.height * 0.16));
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
    ctx.fillRect(0, canvas.height - stampHeight, canvas.width, stampHeight);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(0, canvas.height - stampHeight, canvas.width, 3);

    const titleSize = Math.max(16, Math.round(stampHeight * 0.20));
    ctx.fillStyle = "#f59e0b";
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.fillText(`📍 BROTHERS CENTERING & TRANSPORT • SITE DISPATCH PROOF`, 24, canvas.height - stampHeight + titleSize + 8);

    const addrSize = Math.max(12, Math.round(stampHeight * 0.15));
    ctx.fillStyle = "#ffffff";
    ctx.font = `500 ${addrSize}px sans-serif`;
    const fullAddress = liveGpsInfo?.address || (custPlace ? `${custPlace}, Karnataka, India` : "Site Location, Karnataka");
    const displayAddr = fullAddress.length > 95 ? fullAddress.substring(0, 92) + "..." : fullAddress;
    ctx.fillText(`🏠 Address: ${displayAddr}`, 24, canvas.height - stampHeight + titleSize + addrSize + 16);

    ctx.fillStyle = "#38bdf8";
    ctx.font = `bold ${Math.max(11, Math.round(addrSize * 0.95))}px monospace`;
    const dateStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" });
    const gpsCoord = liveGpsInfo ? `Lat: ${liveGpsInfo.lat}° N | Lng: ${liveGpsInfo.lng}° E` : "Lat: 12.328400° N | Lng: 76.612600° E";
    ctx.fillText(`🌐 ${gpsCoord} • 📅 ${dateStr}`, 24, canvas.height - 12);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedPhotos(prev => [...prev, {
          blob,
          url: URL.createObjectURL(blob),
          address: fullAddress,
          lat: liveGpsInfo?.lat || "12.328400",
          lng: liveGpsInfo?.lng || "76.612600"
        }]);
      }
      closeLiveCamera();
    }, "image/jpeg", 0.88);
  };

  const uploadSitePhotosToSupabase = async (photos: Array<{ blob: Blob; address: string; lat: string; lng: string }>) => {
    const uploadedArray: SitePhotoItem[] = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const fileName = `site_${Date.now()}_${i}.jpg`;
      const { error } = await supabase.storage.from("site_proofs").upload(fileName, p.blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("site_proofs").getPublicUrl(fileName);
      uploadedArray.push({ url: data.publicUrl, address: p.address, lat: p.lat, lng: p.lng, timestamp: new Date().toISOString() });
    }
    return uploadedArray;
  };

  const handleAddItemRow = () => setDispatchItems([...dispatchItems, { name: "", qty: "1", rate: "100" }]);
  const handleRemoveItemRow = (index: number) => {
    if (dispatchItems.length === 1) return;
    setDispatchItems(dispatchItems.filter((_, i) => i !== index));
  };
  const handleItemChange = (index: number, field: string, value: string) => {
    const updated: any = [...dispatchItems];
    updated[index][field] = value;
    setDispatchItems(updated);
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const orderId = `ORD-${Date.now().toString().slice(-4)}`;
    const agreedTransport = Number(transportFee) || 0;
    const advance = Number(advancePaid) || 0;

    try {
      let uploadedPhotoObjects: SitePhotoItem[] = [];
      if (capturedPhotos.length > 0) uploadedPhotoObjects = await uploadSitePhotosToSupabase(capturedPhotos);

      const { error: orderErr } = await supabase.from("orders").insert({
        id: orderId,
        customer_name: custName,
        customer_phone: custPhone || "N/A",
        place: custPlace,
        dispatch_date: dispatchDate,
        total_days: 3,
        site_photo_url: uploadedPhotoObjects[0]?.url || null,
        site_photos: uploadedPhotoObjects,
        site_full_address: uploadedPhotoObjects[0]?.address || null,
        site_lat: uploadedPhotoObjects[0]?.lat || null,
        site_lng: uploadedPhotoObjects[0]?.lng || null,
        transport_agreed: agreedTransport,
        transport_settled: agreedTransport,
        status: "ON_SITE"
      });
      if (orderErr) throw orderErr;

      const itemsToInsert = dispatchItems.map(it => ({
        order_id: orderId,
        name: it.name,
        qty: Number(it.qty) || 1,
        initial_rate: Number(it.rate) || 0,
        final_rate: Number(it.rate) || 0
      }));

      await supabase.from("order_items").insert(itemsToInsert);
      if (advance > 0) {
        await supabase.from("order_payments").insert({ order_id: orderId, type: "Advance", amount: advance, date: dispatchDate });
      }

      await onSuccess();
      setCustName("");
      setCustPhone("");
      setCustPlace("");
      setAdvancePaid("");
      setCapturedPhotos([]);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateDispatch} className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-3xl mx-auto space-y-5 shadow-xl">
      <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
        <PlusCircle className="w-5 h-5" /> Send Boxes to Site
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400">Customer / Contractor Name *</label>
          <input required value={custName} onChange={e => setCustName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm mt-1 focus:border-amber-500 outline-none text-white" placeholder="e.g. Manjunath" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Phone Number (Optional)</label>
          <input value={custPhone} onChange={e => setCustPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm mt-1 focus:border-amber-500 outline-none text-white" placeholder="9876543210" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400">Site Place / Delivery Location *</label>
          <input required value={custPlace} onChange={e => setCustPlace(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm mt-1 focus:border-amber-500 outline-none text-white" placeholder="e.g. RR Nagar, 2nd Stage" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Dispatch Date</label>
          <input type="date" required value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm mt-1 text-white cursor-pointer" />
        </div>
      </div>

      <div className="bg-[#020617] p-4 rounded-xl border-2 border-dashed border-amber-500/40 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Camera className="w-4 h-4 text-amber-400" /> On-Site GPS Proof Photos ({capturedPhotos.length})
          </label>
        </div>

        {capturedPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {capturedPhotos.map((photo, pIdx) => (
              <div key={pIdx} className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                <img src={photo.url} alt="Spot" className="w-full h-24 object-cover" />
                <button type="button" onClick={() => setCapturedPhotos(capturedPhotos.filter((_, i) => i !== pIdx))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs shadow">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={openLiveCamera} disabled={gpsLoading} className="w-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition">
          <Camera className="w-4 h-4" /> {capturedPhotos.length === 0 ? "Open Camera & Snap First Site Photo" : "+ Add Another Spot Photo"}
        </button>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Materials Sent</label>
          <button type="button" onClick={handleAddItemRow} className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded flex items-center gap-1 border border-amber-500/40">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        {dispatchItems.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6">
              <input required value={item.name} onChange={e => handleItemChange(index, "name", e.target.value)} placeholder="Item name" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white" />
            </div>
            <div className="col-span-2">
              <input type="text" required value={item.qty} onChange={e => handleItemChange(index, "qty", e.target.value.replace(/[^0-9]/g, ''))} placeholder="Qty" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white text-center" />
            </div>
            <div className="col-span-3">
              <input type="text" required value={item.rate} onChange={e => handleItemChange(index, "rate", e.target.value.replace(/[^0-9]/g, ''))} placeholder="₹/day" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white text-right" />
            </div>
            <div className="col-span-1 flex justify-center">
              {dispatchItems.length > 1 && (
                <button type="button" onClick={() => handleRemoveItemRow(index)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400">Ashok Leyland Vehicle Rent (₹)</label>
          <input type="text" value={transportFee} onChange={e => setTransportFee(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm mt-1 focus:border-amber-500 outline-none text-white" placeholder="1000" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Advance Paid Now (₹)</label>
          <input type="text" value={advancePaid} onChange={e => setAdvancePaid(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm mt-1 focus:border-amber-500 outline-none text-white" placeholder="0" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold py-3 rounded mt-2 transition flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Dispatch Items to Site
      </button>

      {/* Live Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full p-4 rounded-2xl space-y-3 relative flex flex-col items-center shadow-2xl">
            <button type="button" onClick={closeLiveCamera} className="absolute right-4 top-4 text-slate-400 hover:text-white p-1">
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            </div>
            <button type="button" onClick={captureFrameFromVideo} className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-6 py-2.5 rounded-full text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" /> Snap Spot #{capturedPhotos.length + 1}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}