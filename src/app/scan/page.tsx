"use client";

import Link from "next/link";
import { useState } from "react";
import { createWorker } from "tesseract.js";
import AppHeader from "@/components/app-header";
import ServiceWorkerRegistration from "../service-worker-registration";
import { parseReceiptText, RECEIPT_ITEMS_STORAGE_KEY, type ReceiptLineItem } from "@/lib/receipt-parser";

export default function ReceiptScanPage() {
  const [items, setItems] = useState<ReceiptLineItem[]>([]);
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  async function scanReceipt(file: File) {
    setBusy(true); setStatus("Loading on-device OCR…"); setProgress(0); setItems([]);
    try {
      const worker = await createWorker("eng", 1, { logger: (message) => setProgress(Math.round(message.progress * 100)) });
      const result = await worker.recognize(file);
      await worker.terminate();
      setRawText(result.data.text);
      const parsed = parseReceiptText(result.data.text);
      setItems(parsed);
      setStatus(parsed.length > 0 ? `Found ${parsed.length} likely line items. Check them before using the split.` : "No priced line items found. You can still add them manually below.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Receipt scan failed. Try a clearer photo.");
    } finally { setBusy(false); }
  }

  function updateItem(index: number, patch: Partial<ReceiptLineItem>) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function sendToSplit() { window.localStorage.setItem(RECEIPT_ITEMS_STORAGE_KEY, JSON.stringify(items)); }

  return <main className="app-shell"><ServiceWorkerRegistration /><div className="app-container narrow-container"><AppHeader />
    <section className="hero-copy compact-hero" aria-labelledby="scan-title"><p className="eyebrow accent">Private receipt scan</p><h1 id="scan-title">Point, scan,<br /><em>split.</em></h1><p>OCR runs in your browser. The photo and receipt text are not uploaded to Tipwell.</p></section>
    <Link className="back-link" href="/split">← Back to itemized split</Link>
    <section className="calculator-card scan-card" aria-labelledby="scan-card-title"><div className="section-heading"><div><p className="eyebrow">On-device OCR</p><h2 id="scan-card-title">Add a receipt photo</h2></div><span className="privacy-pill">No upload</span></div>
      <label className="scan-dropzone" htmlFor="receipt-image"><span className="scan-icon" aria-hidden="true">＋</span><strong>{busy ? "Reading receipt…" : "Choose or take a photo"}</strong><span>JPG, PNG, or HEIC supported by your browser</span><input id="receipt-image" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanReceipt(file); }} disabled={busy} /></label>
      {busy && <div className="scan-progress" aria-label={`OCR ${progress}% complete`}><span style={{ width: `${progress}%` }} /></div>}
      {status && <p className="page-notice" role="status">{status}</p>}
      {items.length > 0 && <div className="scan-results"><div className="section-heading compact"><div><p className="eyebrow">Review before splitting</p><h3>Extracted items</h3></div><button className="secondary-button" type="button" onClick={() => setItems((current) => [...current, { name: "New item", price: "0.00" }])}>+ Add item</button></div>{items.map((item, index) => <div className="scan-item" key={`${item.name}-${index}`}><input aria-label={`Extracted item ${index + 1} name`} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} /><div className="money-input"><span aria-hidden="true">$</span><input aria-label={`Extracted item ${index + 1} price`} inputMode="decimal" value={item.price} onChange={(event) => updateItem(index, { price: event.target.value })} /></div><button className="text-button danger-text" type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}<Link className="primary-button inline-button" href="/split" onClick={sendToSplit}>Use these items in itemized split</Link></div>}
      {rawText && <details className="ocr-details"><summary>Show detected text</summary><pre>{rawText}</pre></details>}
    </section>
    <footer className="app-footer"><Link href="/split">Itemized split</Link><Link href="/">Diner calculator</Link></footer>
  </div></main>;
}
