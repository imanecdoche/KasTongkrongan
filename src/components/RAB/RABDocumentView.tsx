import React, { useRef, useState, useEffect } from 'react';
import { RABPlan } from '../../types';
import { calculateRABSummary, formatAmountK } from '../../lib/storage';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface RABDocumentViewProps {
  rab: RABPlan;
  treasurerName?: string;
  onShowToast: (msg: string) => void;
  onOpenExecuteModal?: () => void;
  onOpenRefundModal?: () => void;
  availableCashBalance?: number;
  onBack?: () => void;
  onEdit?: () => void;
}

type TUITheme = 'matrix' | 'amber' | 'cyan' | 'dracula';

interface ThemeColor {
  id: TUITheme;
  name: string;
  bg: string;
  text: string;
  dim: string;
  bright: string;
  border: string;
  accent: string;
  headerBg: string;
  tableHeadBg: string;
  tableHeadText: string;
  wajibText: string;
  sekText: string;
  opsText: string;
  cadText: string;
  highlightText: string;
}

const THEMES: Record<TUITheme, ThemeColor> = {
  matrix: {
    id: 'matrix',
    name: 'MATRIX-GREEN',
    bg: '#0c0c0c',
    text: '#22c55e',
    dim: '#15803d',
    bright: '#4ade80',
    border: '#22c55e',
    accent: '#86efac',
    headerBg: '#05200f',
    tableHeadBg: '#0f3318',
    tableHeadText: '#4ade80',
    wajibText: '#f87171',
    sekText: '#fbbf24',
    opsText: '#38bdf8',
    cadText: '#94a3b8',
    highlightText: '#ffffff',
  },
  amber: {
    id: 'amber',
    name: 'AMBER-CRT',
    bg: '#0c0c0c',
    text: '#f59e0b',
    dim: '#b45309',
    bright: '#fbbf24',
    border: '#f59e0b',
    accent: '#fde68a',
    headerBg: '#231402',
    tableHeadBg: '#382004',
    tableHeadText: '#fde68a',
    wajibText: '#f87171',
    sekText: '#fbbf24',
    opsText: '#fb923c',
    cadText: '#94a3b8',
    highlightText: '#ffffff',
  },
  cyan: {
    id: 'cyan',
    name: 'CYAN-TURBO',
    bg: '#0c0c0c',
    text: '#06b6d4',
    dim: '#0e7490',
    bright: '#22d3ee',
    border: '#06b6d4',
    accent: '#67e8f9',
    headerBg: '#041d24',
    tableHeadBg: '#083344',
    tableHeadText: '#a5f3fc',
    wajibText: '#f87171',
    sekText: '#facc15',
    opsText: '#38bdf8',
    cadText: '#94a3b8',
    highlightText: '#ffffff',
  },
  dracula: {
    id: 'dracula',
    name: 'DRACULA-TERM',
    bg: '#11111b',
    text: '#cdd6f4',
    dim: '#6c7086',
    bright: '#cba6f7',
    border: '#cba6f7',
    accent: '#89b4fa',
    headerBg: '#1e1e2e',
    tableHeadBg: '#313244',
    tableHeadText: '#f5c2e7',
    wajibText: '#f38ba8',
    sekText: '#fab387',
    opsText: '#89dceb',
    cadText: '#6c7086',
    highlightText: '#ffffff',
  },
};

const padR = (str: string, length: number) => {
  if (str.length >= length) return str.slice(0, length);
  return str + ' '.repeat(length - str.length);
};

const padL = (str: string, length: number) => {
  if (str.length >= length) return str.slice(0, length);
  return ' '.repeat(length - str.length) + str;
};

// Generates retro terminal ASCII progress bar
const renderAsciiProgressBar = (percent: number, totalSlots = 14): string => {
  const clamped = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((clamped / 100) * totalSlots);
  const emptyCount = totalSlots - filledCount;
  return `[${'='.repeat(filledCount)}${'░'.repeat(emptyCount)}] ${clamped}%`;
};

export const RABDocumentView: React.FC<RABDocumentViewProps> = ({
  rab,
  treasurerName = 'BENDAHARA TONGKRONGAN',
  onShowToast,
  onOpenExecuteModal,
  onOpenRefundModal,
  onBack,
  onEdit,
}) => {
  const docRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState<TUITheme>('matrix');
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showRawAscii, setShowRawAscii] = useState(false);

  const summary = calculateRABSummary(rab);
  const theme = THEMES[selectedTheme];

  // Global Keyboard Hotkeys (F1, F2, F3, F4, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleExportPDF();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleExportPNG();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleCopyAscii();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (onEdit) onEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (onBack) onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rab, selectedTheme, summary]);

  // Full Raw Monospace ASCII generator for clipboard & WhatsApp
  const generateAsciiDocumentText = (): string => {
    const divider = '─'.repeat(72);
    const doubleDivider = '═'.repeat(72);
    let text = `┌${divider}┐\n`;
    text += `│ kas-tongkrongan@cli: ~/rab/${rab.id}                        [X][^][-] │\n`;
    text += `├${divider}┤\n`;
    text += `│ > TARGET: ${padR(rab.name.toUpperCase(), 28)} │ PJ: ${padR(rab.pic_name.toUpperCase(), 14)} │ STATUS: [${padR(rab.status.toUpperCase(), 8)}] │\n`;
    text += `├${divider}┤\n`;
    text += `│ WAKTU : ${padR(rab.event_date || '-', 28)} │ TEMPAT: ${padR(rab.location || '-', 27)} │\n`;
    text += `├${divider}┤\n`;

    // 3 Stat Panels in ASCII
    text += `│ ┌─[ TOTAL ESTIMASI ]──────┐ ┌─[ DANA TERALOKASI ]─────┐ ┌─[ SISA KEKURANGAN ]─────┐ │\n`;
    const totStr = padR(`Rp ${summary.totalBudget.toLocaleString('id-ID')}`, 23);
    const aloStr = padR(`Rp ${summary.allocatedAmount.toLocaleString('id-ID')}`, 23);
    const remStr = padR(`Rp ${summary.remainingNeeded.toLocaleString('id-ID')}`, 23);
    text += `│ │ ${totStr} │ │ ${aloStr} │ │ ${remStr} │ │\n`;

    const barStr = padR(renderAsciiProgressBar(summary.allocationPercentage, 10), 23);
    const itmStr = padR(`Terpenuhi: ${rab.items.length} Items`, 23);
    const staStr = padR(`Status: [${summary.remainingNeeded === 0 ? 'LUNAS/100%' : 'DEFICIT'}]`, 23);
    text += `│ │ ${barStr} │ │ ${itmStr} │ │ ${staStr} │ │\n`;
    text += `│ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘ │\n`;
    text += `├${divider}┤\n`;

    // Strict Grid Table Header
    text += `│ ┌────┬────────────────────────┬─────────┬───────────┬───────────┬────────┐ │\n`;
    text += `│ │ NO │ NAMA LOGISTIK / JASA   │ QTY/SAT │ HARGA/SAT │  SUBTOTAL │ PRIO   │ │\n`;
    text += `│ ├────┼────────────────────────┼─────────┼───────────┼───────────┼────────┤ │\n`;

    if (rab.items.length === 0) {
      text += `│ │ -- │ (Belum ada item rincian anggaran)                      │ [---]  │ │\n`;
    } else {
      rab.items.forEach((it, idx) => {
        const no = padR(String(idx + 1).padStart(2, '0'), 2);
        const name = padR(it.name.trim(), 22);
        const qtySat = padR(`${it.qty} ${it.unit}`.trim(), 7);
        const price = padL(it.unit_price.toLocaleString('id-ID'), 9);
        const sub = padL(it.subtotal.toLocaleString('id-ID'), 9);
        let prio = '[WAJ]';
        if (it.priority === 'sekunder') prio = '[SEK]';
        if (it.priority === 'opsional') prio = '[OPS]';
        if (it.priority === 'cadangan') prio = '[CAD]';

        text += `│ │ ${no} │ ${name} │ ${qtySat} │ ${price} │ ${sub} │ ${prio}  │ │\n`;
      });
    }

    text += `│ ├────┴────────────────────────┴─────────┴───────────┼───────────┴────────┤ │\n`;
    const grandTotStr = padR(`Rp ${summary.totalBudget.toLocaleString('id-ID')} (${rab.items.length} ITM)`, 32);
    text += `│ │ TOTAL BUDGET ESTIMATION                           │ ${grandTotStr}│ │\n`;
    text += `│ └───────────────────────────────────────────────────┴────────────────────┘ │\n`;
    text += `├${divider}┤\n`;

    // Priority Matrix
    const pW = formatAmountK(summary.priorityTotals.wajib);
    const pS = formatAmountK(summary.priorityTotals.sekunder);
    const pO = formatAmountK(summary.priorityTotals.opsional);
    const pC = formatAmountK(summary.priorityTotals.cadangan);
    text += `│ [1] WAJIB: ${padR(pW, 6)} │ [2] SEKUNDER: ${padR(pS, 6)} │ [3] OPSIONAL: ${padR(pO, 6)} │ [4] BUFFER: ${padR(pC, 6)}│\n`;
    text += `├${divider}┤\n`;

    // Notes if exists
    if (rab.notes) {
      text += `│ > NOTES: ${padR(rab.notes, 61)} │\n`;
      text += `├${divider}┤\n`;
    }

    // Signatures block
    text += `│ ┌─────────────────────────┐          ┌─────────────────────────┐ │\n`;
    text += `│ │ DISUSUN OLEH (PJ):      │          │ DIVERIFIKASI OLEH:      │ │\n`;
    text += `│ │                         │          │                         │ │\n`;
    const pjName = padR(`[ ${rab.pic_name.toUpperCase()} ]`, 23);
    const trName = padR(`[ ${treasurerName.toUpperCase()} ]`, 23);
    text += `│ │ ${pjName} │          │ ${trName} │ │\n`;
    const dStr = padR(`Date: ${rab.created_at.slice(0, 10)}`, 23);
    const sStr = padR(`Status: [${rab.status === 'dialokasikan' ? 'VERIFIED' : 'PENDING'}]`, 23);
    text += `│ │ ${dStr} │          │ ${sStr} │ │\n`;
    text += `│ └─────────────────────────┘          └─────────────────────────┘ │\n`;
    text += `└${divider}┘\n`;
    text += `[HOTKEYS]: F1:PDF | F2:PNG | F3:Copy ASCII | F4:Edit | ESC:Back\n`;

    return text;
  };

  const handleCopyAscii = () => {
    const text = generateAsciiDocumentText();
    navigator.clipboard.writeText(text);
    onShowToast('📋 ASCII Grid TUI RAB disalin ke clipboard!');
  };

  const handleExportPNG = async () => {
    if (!docRef.current) return;
    try {
      setIsExportingPNG(true);
      onShowToast('⏳ Merender Flat TUI Terminal ke file PNG...');
      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = await toPng(docRef.current, {
        cacheBust: true,
        backgroundColor: theme.bg,
        pixelRatio: 2,
      });

      const cleanName = rab.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `TUI_RAB_${cleanName}_${new Date().toISOString().slice(0, 10)}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast(`✅ TUI RAB berhasil diekspor ke ${filename}`);
    } catch (err) {
      console.error(err);
      onShowToast('❌ Gagal mengekspor PNG.');
    } finally {
      setIsExportingPNG(false);
    }
  };

  const handleExportPDF = async () => {
    if (!docRef.current) return;
    try {
      setIsExportingPDF(true);
      onShowToast('⏳ Memproses PDF TUI CLI...');
      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = await toPng(docRef.current, {
        cacheBust: true,
        backgroundColor: theme.bg,
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pdfWidth - margin * 2;

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      if (imgHeight > pdfHeight - margin * 2) {
        const scaleFactor = (pdfHeight - margin * 2) / imgHeight;
        const scaledWidth = contentWidth * scaleFactor;
        const scaledHeight = imgHeight * scaleFactor;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(dataUrl, 'PNG', xOffset, margin, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, imgHeight);
      }

      const cleanName = rab.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `TUI_RAB_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      onShowToast(`✅ Dokumen PDF TUI RAB berhasil diunduh: ${filename}`);
    } catch (err) {
      console.error(err);
      onShowToast('❌ Gagal mengekspor PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div
      className="w-full select-none"
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', Courier, monospace",
        borderRadius: 0,
      }}
    >
      {/* Top Retro Mode Bar (Theme Selection & Raw View Switch) */}
      <div
        className="p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs border"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
          borderRadius: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider">
            [MODE: RETRO-TUI GUI]
          </span>
          <span style={{ color: theme.dim }}>|</span>
          <span className="text-[11px]" style={{ color: theme.bright }}>
            TERM: {theme.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span style={{ color: theme.dim }}>THEME:</span>
          {(Object.keys(THEMES) as TUITheme[]).map((tKey) => {
            const isSel = selectedTheme === tKey;
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setSelectedTheme(tKey)}
                className="px-2 py-0.5 font-bold border transition-none uppercase"
                style={{
                  backgroundColor: isSel ? theme.text : 'transparent',
                  color: isSel ? theme.bg : theme.text,
                  borderColor: theme.border,
                  borderRadius: 0,
                }}
              >
                [{THEMES[tKey].name.split('-')[0]}]
              </button>
            );
          })}

          <span style={{ color: theme.dim }}>|</span>

          {onOpenExecuteModal && (
            <button
              type="button"
              onClick={onOpenExecuteModal}
              className="px-2 py-0.5 font-bold border transition-none"
              style={{
                backgroundColor: '#f59e0b',
                color: '#000000',
                borderColor: '#f59e0b',
                borderRadius: 0,
              }}
            >
              [⚡ EKSEKUSI KAS]
            </button>
          )}

          {onOpenRefundModal && (rab.allocated_amount || 0) > 0 && (
            <button
              type="button"
              onClick={onOpenRefundModal}
              className="px-2 py-0.5 font-bold border transition-none"
              style={{
                backgroundColor: '#22c55e',
                color: '#000000',
                borderColor: '#22c55e',
                borderRadius: 0,
              }}
            >
              [↺ KEMBALIKAN SALDO]
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowRawAscii(!showRawAscii)}
            className="px-2 py-0.5 font-bold border transition-none"
            style={{
              backgroundColor: showRawAscii ? theme.text : 'transparent',
              color: showRawAscii ? theme.bg : theme.text,
              borderColor: theme.border,
              borderRadius: 0,
            }}
          >
            [{showRawAscii ? 'VIEW: GUI' : 'VIEW: RAW ASCII'}]
          </button>
        </div>
      </div>

      {/* Raw ASCII Text Preview Toggle */}
      {showRawAscii ? (
        <div
          className="p-4 border mb-4 overflow-x-auto text-[11px] leading-tight"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.border,
            color: theme.text,
            borderRadius: 0,
          }}
        >
          <div className="flex justify-between items-center pb-2 mb-2 border-b" style={{ borderColor: theme.dim }}>
            <span className="font-bold uppercase">[RAW MONOSPACE ASCII BUFFER]</span>
            <button
              type="button"
              onClick={handleCopyAscii}
              className="px-2 py-0.5 font-bold border"
              style={{ borderColor: theme.border, backgroundColor: theme.text, color: theme.bg, borderRadius: 0 }}
            >
              [COPY BUFFER]
            </button>
          </div>
          <pre className="whitespace-pre font-mono leading-relaxed">
            {generateAsciiDocumentText()}
          </pre>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* STRICT GUI CLI / TUI DOCUMENT CANVAS (NO BORDER-RADIUS, NO SHADOW, NO SANS) */}
      {/* ========================================================================= */}
      <div
        ref={docRef}
        id="strict-tui-rab-canvas"
        className="w-full border-2 overflow-x-auto text-xs leading-relaxed transition-none"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
          borderRadius: 0,
          boxShadow: 'none',
        }}
      >
        {/* 1. Terminal Window Header */}
        <div
          className="px-3 py-1.5 border-b flex items-center justify-between font-bold text-xs"
          style={{
            backgroundColor: theme.headerBg,
            borderColor: theme.border,
            borderRadius: 0,
          }}
        >
          <div className="flex items-center gap-1 truncate">
            <span>┌─[</span>
            <span style={{ color: theme.highlightText }}>
              kas-tongkrongan@cli: ~/rab/{rab.id}
            </span>
            <span>]</span>
          </div>

          <div className="flex items-center gap-1 font-bold shrink-0">
            <span style={{ color: theme.dim }}>──────────────────</span>
            <span className="cursor-pointer" onClick={onBack} title="Close">[X]</span>
            <span className="cursor-pointer" onClick={() => window.scrollTo(0, 0)} title="Maximize">[^]</span>
            <span className="cursor-pointer" title="Minimize">[-]</span>
            <span>─┐</span>
          </div>
        </div>

        {/* 2. Status Bar Prompt */}
        <div
          className="px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-bold"
          style={{
            borderColor: theme.dim,
            backgroundColor: theme.bg,
            borderRadius: 0,
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: theme.bright }}>&gt; TARGET:</span>
            <span style={{ color: theme.highlightText }} className="uppercase font-bold">
              {rab.name}
            </span>
            <span style={{ color: theme.dim }}>|</span>
            <span style={{ color: theme.bright }}>PJ:</span>
            <span style={{ color: theme.accent }}>{rab.pic_name.toUpperCase()}</span>
            <span style={{ color: theme.dim }}>|</span>
            <span style={{ color: theme.bright }}>STATUS:</span>
            <span
              style={{
                color:
                  rab.status === 'dialokasikan'
                    ? '#4ade80'
                    : rab.status === 'selesai'
                    ? '#38bdf8'
                    : '#fbbf24',
              }}
            >
              [{rab.status.toUpperCase()}]
            </span>
          </div>

          <div className="text-[11px]" style={{ color: theme.dim }}>
            WAKTU: {rab.event_date || '-'} | VENUE: {rab.location || '-'}
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3.5">
          {/* 3. TUI Stat Metric Panels (Strict ASCII Boxes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Box 1: Total Estimasi */}
            <div
              className="border p-2.5 space-y-1"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.headerBg,
                borderRadius: 0,
              }}
            >
              <div className="text-[11px] font-bold" style={{ color: theme.bright }}>
                ┌─[ TOTAL ESTIMASI ]───────────────────┐
              </div>
              <div className="text-base sm:text-lg font-black" style={{ color: theme.highlightText }}>
                Rp {summary.totalBudget.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-bold" style={{ color: theme.accent }}>
                {renderAsciiProgressBar(summary.allocationPercentage, 10)}
              </div>
              <div className="text-[10px] text-right font-mono" style={{ color: theme.dim }}>
                └──────────────────────────────────────┘
              </div>
            </div>

            {/* Box 2: Dana Teralokasi */}
            <div
              className="border p-2.5 space-y-1"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.headerBg,
                borderRadius: 0,
              }}
            >
              <div className="text-[11px] font-bold" style={{ color: theme.bright }}>
                ┌─[ DANA TERALOKASI ]──────────────────┐
              </div>
              <div className="text-base sm:text-lg font-black" style={{ color: theme.bright }}>
                Rp {summary.allocatedAmount.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-bold" style={{ color: theme.text }}>
                Terpenuhi: {rab.items.length} Items ({formatAmountK(summary.allocatedAmount)})
              </div>
              <div className="text-[10px] text-right font-mono" style={{ color: theme.dim }}>
                └──────────────────────────────────────┘
              </div>
            </div>

            {/* Box 3: Kekurangan Biaya */}
            <div
              className="border p-2.5 space-y-1"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.headerBg,
                borderRadius: 0,
              }}
            >
              <div className="text-[11px] font-bold" style={{ color: theme.bright }}>
                ┌─[ KEKURANGAN BIAYA ]─────────────────┐
              </div>
              <div
                className="text-base sm:text-lg font-black"
                style={{ color: summary.remainingNeeded > 0 ? theme.wajibText : theme.bright }}
              >
                Rp {summary.remainingNeeded.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-bold">
                Status:{' '}
                <span
                  style={{
                    color: summary.remainingNeeded === 0 ? theme.bright : theme.wajibText,
                  }}
                >
                  [{summary.remainingNeeded === 0 ? 'LUNAS / TERCUKUPI' : 'DEFICIT'}]
                </span>
              </div>
              <div className="text-[10px] text-right font-mono" style={{ color: theme.dim }}>
                └──────────────────────────────────────┘
              </div>
            </div>
          </div>

          {/* 4. Strict ASCII Grid Table */}
          <div
            className="border overflow-x-auto"
            style={{
              borderColor: theme.border,
              borderRadius: 0,
            }}
          >
            <table
              className="w-full text-left text-xs border-collapse table-fixed"
              style={{
                borderColor: theme.border,
                borderRadius: 0,
              }}
            >
              <thead>
                <tr
                  className="font-bold border-b"
                  style={{
                    backgroundColor: theme.tableHeadBg,
                    color: theme.tableHeadText,
                    borderColor: theme.border,
                  }}
                >
                  <th className="py-2 px-2.5 w-[7%] text-center border-r" style={{ borderColor: theme.border }}>
                    NO
                  </th>
                  <th className="py-2 px-3 w-[36%] border-r" style={{ borderColor: theme.border }}>
                    NAMA LOGISTIK / JASA
                  </th>
                  <th className="py-2 px-2.5 w-[14%] text-center border-r" style={{ borderColor: theme.border }}>
                    QTY/SAT
                  </th>
                  <th className="py-2 px-3 w-[15%] text-right border-r" style={{ borderColor: theme.border }}>
                    HARGA/SAT
                  </th>
                  <th className="py-2 px-3 w-[16%] text-right border-r" style={{ borderColor: theme.border }}>
                    SUBTOTAL
                  </th>
                  <th className="py-2 px-2 w-[12%] text-center">
                    PRIO
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {rab.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center italic"
                      style={{ color: theme.dim }}
                    >
                      // NULL: Belum ada rincian anggaran dalam dokumen ini.
                    </td>
                  </tr>
                ) : (
                  rab.items.map((item, idx) => {
                    let prioBadge = '[WAJ]';
                    let prioColor = theme.wajibText;

                    if (item.priority === 'sekunder') {
                      prioBadge = '[SEK]';
                      prioColor = theme.sekText;
                    } else if (item.priority === 'opsional') {
                      prioBadge = '[OPS]';
                      prioColor = theme.opsText;
                    } else if (item.priority === 'cadangan') {
                      prioBadge = '[CAD]';
                      prioColor = theme.cadText;
                    }

                    return (
                      <tr
                        key={item.id}
                        className="border-b transition-none hover:bg-white/5"
                        style={{ borderColor: theme.dim }}
                      >
                        {/* NO */}
                        <td
                          className="py-1.5 px-2.5 text-center font-bold border-r"
                          style={{ borderColor: theme.dim, color: theme.dim }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </td>

                        {/* NAMA LOGISTIK */}
                        <td
                          className="py-1.5 px-3 font-bold border-r truncate"
                          style={{ borderColor: theme.dim }}
                          title={item.name}
                        >
                          <span style={{ color: theme.highlightText }}>{item.name}</span>
                          {item.notes && (
                            <span className="block text-[10px] font-normal" style={{ color: theme.dim }}>
                              // {item.notes}
                            </span>
                          )}
                        </td>

                        {/* QTY/SAT */}
                        <td
                          className="py-1.5 px-2.5 text-center border-r whitespace-nowrap"
                          style={{ borderColor: theme.dim }}
                        >
                          <span style={{ color: theme.accent }} className="font-bold">
                            {item.qty}
                          </span>{' '}
                          <span style={{ color: theme.dim }}>{item.unit}</span>
                        </td>

                        {/* HARGA/SAT */}
                        <td
                          className="py-1.5 px-3 text-right border-r whitespace-nowrap"
                          style={{ borderColor: theme.dim, color: theme.dim }}
                        >
                          {item.unit_price.toLocaleString('id-ID')}
                        </td>

                        {/* SUBTOTAL */}
                        <td
                          className="py-1.5 px-3 text-right font-black border-r whitespace-nowrap"
                          style={{ borderColor: theme.dim, color: theme.highlightText }}
                        >
                          {item.subtotal.toLocaleString('id-ID')}
                        </td>

                        {/* PRIORITY TAG */}
                        <td className="py-1.5 px-2 text-center whitespace-nowrap font-bold">
                          <span style={{ color: prioColor }}>{prioBadge}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr
                  className="font-bold border-t-2"
                  style={{
                    backgroundColor: theme.headerBg,
                    borderColor: theme.border,
                  }}
                >
                  <td
                    colSpan={4}
                    className="py-2 px-3 text-right border-r uppercase"
                    style={{ borderColor: theme.border, color: theme.bright }}
                  >
                    TOTAL BUDGET ESTIMATION :
                  </td>
                  <td
                    className="py-2 px-3 text-right font-black text-sm border-r"
                    style={{ borderColor: theme.border, color: theme.highlightText }}
                  >
                    Rp {summary.totalBudget.toLocaleString('id-ID')}
                  </td>
                  <td
                    className="py-2 px-2 text-center text-[10px]"
                    style={{ color: theme.dim }}
                  >
                    {rab.items.length} ITM
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Priority Matrix Summary */}
          <div
            className="p-2 border text-xs flex flex-wrap items-center justify-between gap-2 font-bold"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.headerBg,
              borderRadius: 0,
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ color: theme.bright }}>[PRIORITY MATRIX]:</span>
              <span style={{ color: theme.wajibText }}>
                [1] WAJIB: {formatAmountK(summary.priorityTotals.wajib)} ({summary.priorityCounts.wajib} itm)
              </span>
              <span style={{ color: theme.dim }}>|</span>
              <span style={{ color: theme.sekText }}>
                [2] SEKUNDER: {formatAmountK(summary.priorityTotals.sekunder)} ({summary.priorityCounts.sekunder} itm)
              </span>
              <span style={{ color: theme.dim }}>|</span>
              <span style={{ color: theme.opsText }}>
                [3] OPSIONAL: {formatAmountK(summary.priorityTotals.opsional)} ({summary.priorityCounts.opsional} itm)
              </span>
              <span style={{ color: theme.dim }}>|</span>
              <span style={{ color: theme.cadText }}>
                [4] BUFFER: {formatAmountK(summary.priorityTotals.cadangan)} ({summary.priorityCounts.cadangan} itm)
              </span>
            </div>
          </div>

          {/* System Remarks / Notes */}
          {rab.notes && (
            <div
              className="p-2.5 border text-xs"
              style={{
                borderColor: theme.dim,
                backgroundColor: theme.bg,
                borderRadius: 0,
              }}
            >
              <span style={{ color: theme.dim }} className="block font-bold">
                // SYSTEM_REMARKS / CATATAN KHUSUS:
              </span>
              <p style={{ color: theme.highlightText }}>{rab.notes}</p>
            </div>
          )}

          {/* 6. Console Stamp Signatures Panel */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
            {/* PJ Signature Box */}
            <div
              className="w-full sm:w-64 border p-2.5 space-y-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.headerBg,
                borderRadius: 0,
              }}
            >
              <div className="text-[11px] font-bold" style={{ color: theme.dim }}>
                ┌─────────────────────────────────┐
              </div>
              <div className="text-xs font-bold" style={{ color: theme.bright }}>
                │ DISUSUN OLEH (PJ):
              </div>
              <div className="font-black text-sm uppercase py-1" style={{ color: theme.highlightText }}>
                │ [ {rab.pic_name.toUpperCase()} ]
              </div>
              <div className="text-[10px] space-y-0.5" style={{ color: theme.dim }}>
                <div>│ Date: {rab.created_at.slice(0, 10)}</div>
                <div>│ Status: [SUBMITTED]</div>
              </div>
              <div className="text-[11px] font-bold" style={{ color: theme.dim }}>
                └─────────────────────────────────┘
              </div>
            </div>

            {/* Middle System Telemetry Hash */}
            <div className="text-center text-[10px] hidden md:block" style={{ color: theme.dim }}>
              <div>KAS-TONGKRONGAN TUI ENGINE v3.0</div>
              <div>DOC_HASH: {rab.id.slice(0, 20)}...</div>
              <div>RENDER: FLAT_MONOSPACE_TURBO</div>
            </div>

            {/* Treasurer Signature Box */}
            <div
              className="w-full sm:w-64 border p-2.5 space-y-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.headerBg,
                borderRadius: 0,
              }}
            >
              <div className="text-[11px] font-bold" style={{ color: theme.dim }}>
                ┌─────────────────────────────────┐
              </div>
              <div className="text-xs font-bold" style={{ color: theme.bright }}>
                │ DIVERIFIKASI OLEH:
              </div>
              <div className="font-black text-sm uppercase py-1" style={{ color: theme.highlightText }}>
                │ [ {treasurerName.toUpperCase()} ]
              </div>
              <div className="text-[10px] space-y-0.5" style={{ color: theme.dim }}>
                <div>│ Role: Bendahara Kas</div>
                <div>
                  │ Status:{' '}
                  <span
                    style={{
                      color: rab.status === 'dialokasikan' ? theme.bright : theme.wajibText,
                    }}
                  >
                    [{rab.status === 'dialokasikan' ? 'VERIFIED' : 'UNVERIFIED'}]
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-bold" style={{ color: theme.dim }}>
                └─────────────────────────────────┘
              </div>
            </div>
          </div>
        </div>

        {/* 7. Action Hotkeys Bar (CLI Footer Bar) */}
        <div
          className="p-2 border-t flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold"
          style={{
            backgroundColor: theme.tableHeadBg,
            borderColor: theme.border,
            color: theme.tableHeadText,
            borderRadius: 0,
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF || isExportingPNG}
              className="px-2 py-0.5 border cursor-pointer hover:opacity-80 transition-none"
              style={{
                backgroundColor: theme.bg,
                color: theme.bright,
                borderColor: theme.border,
                borderRadius: 0,
              }}
            >
              [F1: Export PDF]
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              disabled={isExportingPDF || isExportingPNG}
              className="px-2 py-0.5 border cursor-pointer hover:opacity-80 transition-none"
              style={{
                backgroundColor: theme.bg,
                color: theme.bright,
                borderColor: theme.border,
                borderRadius: 0,
              }}
            >
              [F2: Export PNG]
            </button>

            <button
              type="button"
              onClick={handleCopyAscii}
              className="px-2 py-0.5 border cursor-pointer hover:opacity-80 transition-none"
              style={{
                backgroundColor: theme.bg,
                color: theme.bright,
                borderColor: theme.border,
                borderRadius: 0,
              }}
            >
              [F3: Copy ASCII Text]
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-2 py-0.5 border cursor-pointer hover:opacity-80 transition-none"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.bright,
                  borderColor: theme.border,
                  borderRadius: 0,
                }}
              >
                [F4: Edit RAB]
              </button>
            )}

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-2 py-0.5 border cursor-pointer hover:opacity-80 transition-none"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.bright,
                  borderColor: theme.border,
                  borderRadius: 0,
                }}
              >
                [ESC: Back]
              </button>
            )}
          </div>

          <div className="text-[11px]" style={{ color: theme.accent }}>
            ● CLI_SESSION_ONLINE [TTY_1]
          </div>
        </div>
      </div>
    </div>
  );
};
