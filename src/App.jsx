import { useState, useCallback, useEffect } from "react";

// ── Data Tables ──────────────────────────────────────────────────────────────
const SP_QTY_TIERS = [
  { label: "48–71",     min: 48,   max: 71   },
  { label: "72–143",    min: 72,   max: 143  },
  { label: "144–287",   min: 144,  max: 287  },
  { label: "288–575",   min: 288,  max: 575  },
  { label: "576–999",   min: 576,  max: 999  },
  { label: "1000–2499", min: 1000, max: 2499 },
  { label: "2500–4999", min: 2500, max: 4999 },
  { label: "5000+",     min: 5000, max: Infinity },
];
const SP_PRICES = [
  [ 2.43, 1.71, 1.41, 1.17, 0.93, 0.70, 0.64, 0.58 ],
  [ 3.53, 2.58, 2.03, 1.72, 1.34, 1.04, 0.92, 0.74 ],
  [ 4.75, 3.45, 2.65, 2.21, 1.73, 1.38, 1.02, 0.91 ],
  [ 5.85, 4.06, 3.31, 2.66, 2.04, 1.76, 1.35, 1.07 ],
  [ 7.02, 4.93, 3.93, 3.18, 2.44, 2.10, 1.54, 1.23 ],
  [ 8.17, 5.74, 4.55, 3.70, 2.85, 2.49, 1.79, 1.39 ],
  [ 9.34, 6.51, 5.22, 4.19, 3.19, 2.77, 2.01, 1.55 ],
  [10.44, 7.32, 5.84, 4.68, 3.55, 3.16, 2.21, 1.71 ],
  [11.66, 8.09, 6.46, 5.18, 3.95, 3.50, 2.44, 1.88 ],
  [13.82, 9.96, 8.18, 6.71, 5.36, 4.94, 3.71, 3.09 ],
  [14.98,10.73, 8.80, 7.21, 5.75, 5.27, 3.93, 3.24 ],
  [16.15,11.54, 9.42, 7.70, 6.11, 5.61, 4.15, 3.42 ],
];
const EMB_PRICE_PER_PC = 5.00;
const PUFF_UPCHARGE    = 3.00;
const OVERHEAD_PER_PC  = 1.50;
const CC_FEE           = 0.04;
const LS_KEY           = "hh_saved_quotes";

// DTF pricing — orders under 48 pieces, priced by print size
const DTF_SIZES = [
  { key: "small",    label: 'Small (up to 4"x4")',       price: 3.00 },
  { key: "medium",   label: 'Medium (up to 8"x10")',     price: 5.00 },
  { key: "large",    label: 'Large (up to 12"x16")',     price: 8.50 },
  { key: "fullback", label: 'Full Back (up to 14"x18")', price: 12.00 },
];
function getDtfPrice(sizeKey) {
  return DTF_SIZES.find(s => s.key === sizeKey)?.price ?? 5.00;
}

function getScreenPrintPrice(colors, qty) {
  const col = SP_QTY_TIERS.findIndex(t => qty >= t.min && qty <= t.max);
  if (col === -1) return null;
  return SP_PRICES[Math.min(colors - 1, 11)][col] ?? null;
}
function getEmbroideryPrice() { return EMB_PRICE_PER_PC; }

function loadFromStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveToStorage(quotes) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(quotes)); } catch {}
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #003619; color: #fefbdd; font-family: 'Poppins', sans-serif; min-height: 100vh; }
  .app { max-width: 880px; margin: 0 auto; padding: 36px 24px 80px; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; margin-bottom: 32px; border-bottom: 2px solid rgba(254,251,221,0.12); }
  .logo-lockup { display: flex; flex-direction: column; gap: 4px; }
  .header-logo { height: 52px; width: auto; display: block; }
  .logo-sub { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: #28b571; margin-top: 2px; }
  .header-right { display: flex; align-items: center; gap: 10px; }
  .header-badge { background: #f8a232; color: #003619; font-family: 'Teko', sans-serif; font-weight: 700; font-size: 1rem; letter-spacing: 0.12em; text-transform: uppercase; padding: 6px 16px; border-radius: 4px; }
  .quotes-toggle-btn { background: rgba(0,0,0,0.3); border: 1px solid rgba(254,251,221,0.2); border-radius: 4px; color: #fefbdd; font-family: 'Teko', sans-serif; font-weight: 600; font-size: 1rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
  .quotes-toggle-btn:hover { border-color: #f8a232; color: #f8a232; }
  .quotes-toggle-btn .qtb-count { background: #f8a232; color: #003619; font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 10px; font-family: 'Poppins', sans-serif; }

  /* Saved Quotes Panel */
  .quotes-panel { background: rgba(0,0,0,0.3); border: 1px solid rgba(254,251,221,0.12); border-radius: 10px; margin-bottom: 28px; overflow: hidden; }
  .quotes-panel-header { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(254,251,221,0.08); }
  .quotes-panel-header h3 { font-family: 'Teko', sans-serif; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.12em; text-transform: uppercase; color: #f8a232; }
  .quotes-empty { padding: 24px 20px; text-align: center; color: rgba(254,251,221,0.3); font-size: 0.82rem; letter-spacing: 0.06em; }
  .quote-list { display: flex; flex-direction: column; }
  .quote-item { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 13px 20px; border-bottom: 1px solid rgba(254,251,221,0.06); transition: background 0.15s; }
  .quote-item:last-child { border-bottom: none; }
  .quote-item:hover { background: rgba(254,251,221,0.04); }
  .qi-info {}
  .qi-name { font-weight: 600; font-size: 0.88rem; color: #fefbdd; margin-bottom: 2px; }
  .qi-meta { font-size: 0.72rem; color: rgba(254,251,221,0.4); display: flex; gap: 10px; flex-wrap: wrap; }
  .qi-meta span { display: flex; align-items: center; gap: 3px; }
  .qi-price { font-family: 'Teko', sans-serif; font-weight: 700; font-size: 1.6rem; color: #f8a232; text-align: right; line-height: 1; }
  .qi-price-sub { font-size: 0.65rem; color: rgba(254,251,221,0.3); text-align: right; text-transform: uppercase; letter-spacing: 0.05em; }
  .qi-actions { display: flex; gap: 6px; }
  .qi-btn { border: none; border-radius: 4px; padding: 6px 12px; font-family: 'Poppins', sans-serif; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em; }
  .qi-btn-load { background: rgba(40,181,113,0.15); color: #28b571; border: 1px solid rgba(40,181,113,0.3); }
  .qi-btn-load:hover { background: #28b571; color: #003619; }
  .qi-btn-del { background: rgba(231,76,60,0.1); color: rgba(231,76,60,0.6); border: 1px solid rgba(231,76,60,0.2); }
  .qi-btn-del:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }

  /* Mode Toggle */
  .mode-toggle { display: flex; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 4px; gap: 4px; margin-bottom: 28px; border: 1px solid rgba(254,251,221,0.1); }
  .mode-btn { flex: 1; padding: 11px 20px; border: none; border-radius: 4px; font-family: 'Teko', sans-serif; font-weight: 600; font-size: 1.05rem; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; background: transparent; color: rgba(254,251,221,0.35); }
  .mode-btn.active { background: #f8a232; color: #003619; }

  /* Section Label */
  .section-label { font-family: 'Teko', sans-serif; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #28b571; margin: 28px 0 12px; display: flex; align-items: center; gap: 10px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: rgba(40,181,113,0.25); }

  /* Form */
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; color: rgba(254,251,221,0.45); }
  .field input, .field select { background: rgba(0,0,0,0.25); border: 1px solid rgba(254,251,221,0.15); border-radius: 6px; padding: 10px 14px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; color: #fefbdd; transition: border-color 0.2s; outline: none; width: 100%; }
  .field select option { background: #003619; color: #fefbdd; }
  .field input:focus, .field select:focus { border-color: #f8a232; }
  .field input.error { border-color: #e74c3c; }
  .field .hint { font-size: 0.67rem; color: #f8a232; margin-top: 2px; }

  /* Locations */
  .locations { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .location-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: end; background: rgba(0,0,0,0.2); border: 1px solid rgba(254,251,221,0.1); border-radius: 8px; padding: 14px; }
  .emb-location-row { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 10px; align-items: end; background: rgba(0,0,0,0.2); border: 1px solid rgba(254,251,221,0.1); border-radius: 8px; padding: 14px; }
  .puff-toggle { display: flex; flex-direction: column; align-items: center; gap: 7px; padding-bottom: 3px; }
  .puff-toggle span { font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; color: rgba(254,251,221,0.4); white-space: nowrap; }
  .puff-checkbox { width: 20px; height: 20px; accent-color: #f8a232; cursor: pointer; }
  .remove-btn { background: rgba(0,0,0,0.3); border: 1px solid rgba(254,251,221,0.1); border-radius: 5px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(254,251,221,0.35); font-size: 1.1rem; transition: all 0.2s; align-self: end; }
  .remove-btn:hover { background: #c0392b; border-color: #c0392b; color: #fff; }
  .add-btn { background: transparent; border: 1px dashed rgba(40,181,113,0.4); border-radius: 6px; padding: 9px 16px; font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(40,181,113,0.6); cursor: pointer; transition: all 0.2s; width: 100%; }
  .add-btn:hover { border-color: #28b571; color: #28b571; }

  /* Toggle row */
  .toggle-row { display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); border: 1px solid rgba(254,251,221,0.1); border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; }
  .toggle-label { font-size: 0.78rem; font-weight: 500; color: rgba(254,251,221,0.55); }
  .toggle-right { display: flex; align-items: center; gap: 10px; }
  .toggle-input { background: rgba(0,0,0,0.3) !important; border: 1px solid rgba(254,251,221,0.15) !important; border-radius: 4px !important; padding: 4px 8px !important; width: 80px !important; font-size: 0.85rem !important; text-align: right; color: #fefbdd !important; }
  .toggle-input:focus { border-color: #f8a232 !important; }

  /* Fixed costs */
  .fixed-strip { display: flex; gap: 10px; }
  .fixed-pill { flex: 1; background: rgba(248,162,50,0.1); border: 1px solid rgba(248,162,50,0.25); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; }
  .fp-label { font-size: 0.72rem; color: rgba(254,251,221,0.5); font-weight: 500; }
  .fp-val { font-size: 0.8rem; color: #f8a232; font-weight: 700; }

  /* Save Quote Bar */
  .save-bar { display: flex; gap: 10px; align-items: flex-end; margin-top: 20px; background: rgba(40,181,113,0.08); border: 1px solid rgba(40,181,113,0.2); border-radius: 8px; padding: 14px 16px; }
  .save-bar .field { flex: 1; }
  .save-btn { background: #28b571; color: #003619; border: none; border-radius: 6px; padding: 10px 22px; font-family: 'Teko', sans-serif; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; white-space: nowrap; height: 42px; }
  .save-btn:hover { background: #34d180; }
  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .save-success { color: #28b571; font-size: 0.75rem; font-weight: 600; margin-top: 4px; }

  /* DTF Banner */
  .dtf-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(248,162,50,0.1);
    border: 1px solid rgba(248,162,50,0.35);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 0.8rem;
    color: rgba(254,251,221,0.7);
    line-height: 1.5;
    margin-bottom: 4px;
  }
  .dtf-badge {
    background: #f8a232;
    color: #003619;
    font-family: 'Teko', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* Warning */
  .warning { background: rgba(248,162,50,0.1); border: 1px solid rgba(248,162,50,0.4); border-radius: 6px; padding: 10px 14px; font-size: 0.78rem; color: #f8a232; margin-top: 12px; }

  /* Results */
  .results { margin-top: 32px; background: #fefbdd; border-radius: 12px; overflow: hidden; color: #003619; }
  .results-header { background: #003619; border: 2px solid #f8a232; border-bottom: none; border-radius: 12px 12px 0 0; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  .results-header h2 { font-family: 'Teko', sans-serif; font-weight: 700; font-size: 1.5rem; letter-spacing: 0.08em; text-transform: uppercase; color: #fefbdd; }
  .results-badge { background: #f8a232; color: #003619; font-family: 'Teko', sans-serif; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 4px; }
  .results-body { padding: 24px; }

  /* Per-piece hero */
  .per-piece-hero { background: #003619; border-radius: 8px; padding: 20px 24px; margin-bottom: 22px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .pph-left .pph-label { font-family: 'Teko', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #28b571; margin-bottom: 2px; }
  .pph-left .pph-amount { font-family: 'Teko', sans-serif; font-weight: 700; font-size: 5rem; color: #fefbdd; line-height: 1; }
  .pph-left .pph-note { font-size: 0.65rem; color: rgba(254,251,221,0.35); margin-top: 3px; letter-spacing: 0.06em; text-transform: uppercase; }
  .pph-breakdown { display: flex; flex-direction: column; gap: 3px; text-align: right; min-width: 190px; }
  .pc-line { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 0.76rem; }
  .pc-line .pc-lbl { color: rgba(254,251,221,0.45); }
  .pc-line .pc-val { font-weight: 600; color: rgba(254,251,221,0.8); font-variant-numeric: tabular-nums; min-width: 54px; text-align: right; }
  .pc-line.pc-profit .pc-val { color: #28b571; }
  .pc-line.pc-divider { border-top: 1px solid rgba(254,251,221,0.12); padding-top: 4px; margin-top: 3px; }
  .pc-line.pc-total .pc-lbl { color: #f8a232; font-weight: 600; }
  .pc-line.pc-total .pc-val { color: #f8a232; font-size: 0.85rem; }

  /* Order lines */
  .result-line { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,54,25,0.1); font-size: 0.85rem; color: rgba(0,54,25,0.6); }
  .result-line:last-child { border-bottom: none; }
  .result-line .val { font-weight: 600; color: #003619; font-variant-numeric: tabular-nums; }
  .result-line.rl-subtotal { background: rgba(0,54,25,0.06); padding: 8px 10px; border-radius: 5px; margin: 4px 0; border: none; }
  .result-total { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 2px solid #003619; }
  .result-total .rt-label { font-family: 'Teko', sans-serif; font-weight: 700; font-size: 1.3rem; letter-spacing: 0.1em; text-transform: uppercase; color: #003619; }
  .result-total .rt-amount { font-family: 'Teko', sans-serif; font-weight: 700; font-size: 2.8rem; color: #003619; line-height: 1; }
  .result-total .rt-note { font-size: 0.65rem; color: rgba(0,54,25,0.4); text-align: right; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

  @media (max-width: 620px) {
    .grid, .grid-3 { grid-template-columns: 1fr 1fr; }
    .grid-3 .field:last-child { grid-column: span 2; }
    .per-piece-hero { flex-direction: column; align-items: flex-start; }
    .pph-breakdown { text-align: left; min-width: unset; width: 100%; }
    .logo { font-size: 2.4rem; }
    .fixed-strip { flex-direction: column; }
    .save-bar { flex-direction: column; }
    .quote-item { grid-template-columns: 1fr auto; }
    .qi-price { display: none; }
    .header-right { flex-direction: column; align-items: flex-end; gap: 6px; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => n != null ? `$${n.toFixed(2)}` : "—";
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function PricingCalculator() {
  const [mode, setMode]               = useState("screen");
  const [qty, setQty]                 = useState(72);
  const [garmentCost, setGarmentCost] = useState(8.00);
  const [margin, setMargin]           = useState(40);
  const [spLocations, setSpLocations] = useState([{ name: "Front", colors: 1, size: "medium" }]);
  const [embLocations, setEmbLocations] = useState([{ name: "Left Chest", stitches: 7000, puff: false }]);
  const [includeDigitizing, setIncludeDigitizing] = useState(false);
  const [digitizingFee, setDigitizingFee]         = useState(0);

  // Quote management
  const [savedQuotes, setSavedQuotes] = useState(() => loadFromStorage());
  const [showQuotes, setShowQuotes]   = useState(false);
  const [quoteName, setQuoteName]     = useState("");
  const [saveFlash, setSaveFlash]     = useState(false);

  useEffect(() => { saveToStorage(savedQuotes); }, [savedQuotes]);

  // Location helpers
  const addSpLoc    = () => setSpLocations([...spLocations, { name: "", colors: 1, size: "medium" }]);
  const removeSpLoc = (i) => setSpLocations(spLocations.filter((_, x) => x !== i));
  const updateSpLoc = (i, k, v) => { const n=[...spLocations]; n[i]={...n[i],[k]:v}; setSpLocations(n); };
  const addEmbLoc    = () => setEmbLocations([...embLocations, { name: "", stitches: 7000, puff: false }]);
  const removeEmbLoc = (i) => setEmbLocations(embLocations.filter((_, x) => x !== i));
  const updateEmbLoc = (i, k, v) => { const n=[...embLocations]; n[i]={...n[i],[k]:v}; setEmbLocations(n); };

  // ── Calc ──────────────────────────────────────────────────────────────────
  const calc = useCallback(() => {
    const q  = Math.max(1, parseInt(qty) || 0);
    const gc = parseFloat(garmentCost) || 0;
    const mg = parseFloat(margin) || 0;
    let decorCostPU = 0, warnings = [], decorLines = [];

    if (mode === "screen") {
      if (q >= 5000) warnings.push("Orders over 5,000 pieces — call for a custom quote.");
      if (q < 48) {
        // DTF — priced by size, no minimums
        for (const loc of spLocations) {
          const p = getDtfPrice(loc.size || "medium");
          const sizeLabel = DTF_SIZES.find(s => s.key === (loc.size || "medium"))?.label || "Medium";
          decorCostPU += p;
          decorLines.push({ label: `${loc.name || "DTF"} — ${sizeLabel}`, perUnit: p });
        }
      } else {
        // Screen print
        for (const loc of spLocations) {
          const c = Math.max(1, Math.min(12, parseInt(loc.colors) || 1));
          const p = getScreenPrintPrice(c, q);
          if (p === null) warnings.push(`${loc.name || "Location"}: price not available at qty ${q}.`);
          else { decorCostPU += p; decorLines.push({ label: `${loc.name || "Print"} (${c}c)`, perUnit: p }); }
        }
      }
    } else {
      for (const loc of embLocations) {
        if ((parseInt(loc.stitches)||0) > 7000) warnings.push(`${loc.name || "Location"}: stitch count exceeds 7,000 — custom quote needed.`);
        const lp = getEmbroideryPrice() + (loc.puff ? PUFF_UPCHARGE : 0);
        decorCostPU += lp;
        decorLines.push({ label: `${loc.name || "Embroidery"} (≤7k st)${loc.puff ? " + Puff" : ""}`, perUnit: lp });
      }
      if (includeDigitizing) {
        const df = parseFloat(digitizingFee) || 0;
        decorLines.push({ label: "Digitizing (one-time)", perUnit: df / q, flat: df });
        decorCostPU += df / q;
      }
    }

    const overheadPU = OVERHEAD_PER_PC;
    const costPU     = gc + decorCostPU + overheadPU;
    const totalCost  = costPU * q;
    const preBCC     = totalCost / (1 - mg / 100);
    const grandTotal = preBCC / (1 - CC_FEE);
    const ccFee      = grandTotal - preBCC;
    const perUnit    = grandTotal / q;
    const marginPU   = (preBCC - totalCost) / q;
    const ccFeePU    = ccFee / q;

    return { q, gc, decorLines, decorCostPU, overheadPU, marginPU, ccFeePU,
             totalCost, preBCC, ccFee, grandTotal, perUnit, warnings };
  }, [mode, qty, garmentCost, margin, spLocations, embLocations, includeDigitizing, digitizingFee]);

  const r = calc();

  // ── Quote Actions ─────────────────────────────────────────────────────────
  const saveQuote = () => {
    if (!quoteName.trim()) return;
    const q = {
      id: Date.now().toString(),
      name: quoteName.trim(),
      savedAt: new Date().toISOString(),
      mode, qty, garmentCost, margin,
      spLocations, embLocations, includeDigitizing, digitizingFee,
      perUnit: r.perUnit,
      grandTotal: r.grandTotal,
    };
    setSavedQuotes(prev => [q, ...prev]);
    setQuoteName("");
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const loadQuote = (q) => {
    setMode(q.mode);
    setQty(q.qty);
    setGarmentCost(q.garmentCost);
    setMargin(q.margin);
    setSpLocations(q.spLocations);
    setEmbLocations(q.embLocations);
    setIncludeDigitizing(q.includeDigitizing);
    setDigitizingFee(q.digitizingFee);
    setShowQuotes(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteQuote = (id) => setSavedQuotes(prev => prev.filter(q => q.id !== id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="logo-lockup">
            <img src="/logo.png" alt="Heart & Hook Apparel" className="header-logo" />
            <div className="logo-sub">Pricing Calculator</div>
          </div>
          <div className="header-right">
            <div className="header-badge">2026 Rates</div>
            <button className="quotes-toggle-btn" onClick={() => setShowQuotes(v => !v)}>
              {showQuotes ? "▲" : "▼"} Saved Quotes
              {savedQuotes.length > 0 && <span className="qtb-count">{savedQuotes.length}</span>}
            </button>
          </div>
        </div>

        {/* Saved Quotes Panel */}
        {showQuotes && (
          <div className="quotes-panel">
            <div className="quotes-panel-header">
              <h3>Saved Quotes</h3>
            </div>
            {savedQuotes.length === 0
              ? <div className="quotes-empty">No saved quotes yet. Build a quote below and save it.</div>
              : <div className="quote-list">
                  {savedQuotes.map(q => (
                    <div className="quote-item" key={q.id}>
                      <div className="qi-info">
                        <div className="qi-name">{q.name}</div>
                        <div className="qi-meta">
                          <span>{q.mode === "screen" ? (q.qty < 48 ? "DTF" : "Screen Print") : "Embroidery"}</span>
                          <span>{q.qty} pcs</span>
                          <span>{fmtDate(q.savedAt)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="qi-price">{fmt(q.grandTotal)}</div>
                        <div className="qi-price-sub">{fmt(q.perUnit)}/pc</div>
                      </div>
                      <div className="qi-actions">
                        <button className="qi-btn qi-btn-load" onClick={() => loadQuote(q)}>Load</button>
                        <button className="qi-btn qi-btn-del" onClick={() => deleteQuote(q.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn ${mode==="screen"?"active":""}`} onClick={()=>setMode("screen")}>✦ Screen Printing</button>
          <button className={`mode-btn ${mode==="embroidery"?"active":""}`} onClick={()=>setMode("embroidery")}>✦ Embroidery</button>
        </div>

        {/* Order Details */}
        <div className="section-label">Order Details</div>
        <div className="grid grid-3">
          <div className="field"><label>Quantity</label>
            <input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} /></div>
          <div className="field"><label>Garment Cost / pc</label>
            <input type="number" min="0" step="0.01" value={garmentCost} onChange={e=>setGarmentCost(e.target.value)} /></div>
          <div className="field"><label>Profit Margin %</label>
            <input type="number" min="0" max="99" value={margin} onChange={e=>setMargin(e.target.value)} /></div>
        </div>

        {/* Screen Print / DTF */}
        {mode === "screen" && (<>
          {parseInt(qty) < 48 ? (
            <div className="dtf-banner">
              <span className="dtf-badge">DTF</span>
              Under 48 pieces — pricing automatically switched to Direct to Film (no minimums, no color limits, priced by print size).
            </div>
          ) : null}
          <div className="section-label">{parseInt(qty) < 48 ? "DTF Print Locations" : "Print Locations"}</div>
          <div className="locations">
            {spLocations.map((loc, i) => (
              <div className="location-row" key={i}>
                <div className="field"><label>Location Name</label>
                  <input type="text" placeholder="e.g. Front Chest" value={loc.name} onChange={e=>updateSpLoc(i,"name",e.target.value)} /></div>
                {parseInt(qty) < 48 ? (
                  <div className="field"><label>Print Size</label>
                    <select value={loc.size || "medium"} onChange={e=>updateSpLoc(i,"size",e.target.value)}>
                      {DTF_SIZES.map(s=><option key={s.key} value={s.key}>{s.label} — ${s.price.toFixed(2)}</option>)}
                    </select></div>
                ) : (
                  <div className="field"><label>Colors</label>
                    <select value={loc.colors} onChange={e=>updateSpLoc(i,"colors",parseInt(e.target.value))}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n=><option key={n} value={n}>{n} Color{n>1?"s":""}</option>)}
                    </select></div>
                )}
                {spLocations.length > 1 && <button className="remove-btn" onClick={()=>removeSpLoc(i)}>×</button>}
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={addSpLoc}>+ Add {parseInt(qty) < 48 ? "DTF" : "Print"} Location</button>
        </>)}

        {/* Embroidery */}
        {mode === "embroidery" && (<>
          <div className="section-label">Embroidery Locations</div>
          <div className="locations">
            {embLocations.map((loc, i) => (
              <div className="emb-location-row" key={i}>
                <div className="field"><label>Location Name</label>
                  <input type="text" placeholder="e.g. Left Chest" value={loc.name} onChange={e=>updateEmbLoc(i,"name",e.target.value)} /></div>
                <div className="field"><label>Stitch Count</label>
                  <input type="number" min="500" max="15000" step="500" value={loc.stitches}
                    className={loc.stitches > 7000 ? "error" : ""} onChange={e=>updateEmbLoc(i,"stitches",e.target.value)} />
                  {loc.stitches > 7000 && <span className="hint">Custom quote needed</span>}</div>
                <div className="puff-toggle">
                  <span>Puff +$3</span>
                  <input type="checkbox" className="puff-checkbox" checked={loc.puff}
                    onChange={e=>updateEmbLoc(i,"puff",e.target.checked)} id={`puff-${i}`} />
                </div>
                {embLocations.length > 1 && <button className="remove-btn" onClick={()=>removeEmbLoc(i)}>×</button>}
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={addEmbLoc}>+ Add Embroidery Location</button>
          <div className="section-label">Fees</div>
          <div className="toggle-row">
            <span className="toggle-label">Digitizing Fee (one-time)</span>
            <div className="toggle-right">
              <input type="number" className="toggle-input" min="0" step="0.01" value={digitizingFee}
                onChange={e=>setDigitizingFee(e.target.value)} disabled={!includeDigitizing} style={{opacity: includeDigitizing?1:0.4}} />
              <input type="checkbox" checked={includeDigitizing} onChange={e=>setIncludeDigitizing(e.target.checked)} id="dig-toggle" />
              <label htmlFor="dig-toggle" style={{fontSize:"0.72rem",color:"rgba(254,251,221,0.5)",cursor:"pointer"}}>Include</label>
            </div>
          </div>
        </>)}

        {/* Fixed Costs */}
        <div className="section-label">Applied Automatically</div>
        <div className="fixed-strip">
          {[{l:"Overhead",v:"$1.50 / pc"},{l:"CC Processing",v:"4.0%"}].map(x=>(
            <div className="fixed-pill" key={x.l}><span className="fp-label">{x.l}</span><span className="fp-val">{x.v}</span></div>
          ))}
        </div>

        {/* Warnings */}
        {r.warnings.map((w,i)=><div className="warning" key={i}>⚠ {w}</div>)}

        {/* Results */}
        <div className="results">
          <div className="results-header">
            <h2>{mode==="screen" && r.q < 48 ? "DTF" : mode==="screen" ? "Screen Print" : "Embroidery"} — {r.q} pcs</h2>
            <span className="results-badge">{mode==="screen" ? (r.q < 48 ? "DTF" : "Screen Print") : "Embroidery"}</span>
          </div>
          <div className="results-body">
            <div className="per-piece-hero">
              <div className="pph-left">
                <div className="pph-label">Price Per Piece</div>
                <div className="pph-amount">{fmt(r.perUnit)}</div>
                <div className="pph-note">+ tax added at invoice</div>
              </div>
              <div className="pph-breakdown">
                <div className="pc-line"><span className="pc-lbl">Garment</span><span className="pc-val">{fmt(r.gc)}</span></div>
                {r.decorLines.map((dl,i)=>(
                  <div className="pc-line" key={i}><span className="pc-lbl">{dl.label}</span><span className="pc-val">{fmt(dl.perUnit)}</span></div>
                ))}
                <div className="pc-line"><span className="pc-lbl">Overhead</span><span className="pc-val">{fmt(r.overheadPU)}</span></div>
                <div className="pc-line pc-profit pc-divider"><span className="pc-lbl">Margin ({margin}%)</span><span className="pc-val">+{fmt(r.marginPU)}</span></div>
                <div className="pc-line"><span className="pc-lbl">CC fee (4%)</span><span className="pc-val">+{fmt(r.ccFeePU)}</span></div>
                <div className="pc-line pc-total pc-divider"><span className="pc-lbl">Total / pc</span><span className="pc-val">{fmt(r.perUnit)}</span></div>
              </div>
            </div>
            <div className="result-line"><span>Garment cost ({r.q} × {fmt(r.gc)})</span><span className="val">{fmt(r.gc * r.q)}</span></div>
            {r.decorLines.map((dl,i)=>(
              <div className="result-line" key={i}><span>{dl.label}</span><span className="val">{dl.flat ? fmt(dl.flat) : fmt(dl.perUnit * r.q)}</span></div>
            ))}
            <div className="result-line"><span>Overhead ({r.q} × $1.50)</span><span className="val">{fmt(r.overheadPU * r.q)}</span></div>
            <div className="result-line rl-subtotal"><span>Total cost</span><span className="val">{fmt(r.totalCost)}</span></div>
            <div className="result-line"><span>Profit ({margin}% margin)</span><span className="val">+{fmt(r.preBCC - r.totalCost)}</span></div>
            <div className="result-line"><span>Credit card fee (4%)</span><span className="val">+{fmt(r.ccFee)}</span></div>
            <div className="result-total">
              <span className="rt-label">Order Total</span>
              <div><div className="rt-amount">{fmt(r.grandTotal)}</div><div className="rt-note">+ tax at invoice</div></div>
            </div>
          </div>
        </div>

        {/* Save Quote Bar */}
        <div className="save-bar">
          <div className="field">
            <label>Save This Quote</label>
            <input type="text" placeholder="e.g. Westersen Q2 Tees, Dockside Summer Run…"
              value={quoteName} onChange={e=>setQuoteName(e.target.value)}
              onKeyDown={e=>e.key==="Enter" && saveQuote()} />
            {saveFlash && <div className="save-success">✓ Quote saved!</div>}
          </div>
          <button className="save-btn" onClick={saveQuote} disabled={!quoteName.trim()}>Save Quote</button>
        </div>

      </div>
    </>
  );
}
