import React, { useRef, useState } from 'react';
import { RABPlan, RABItemPriority } from '../../types';
import { calculateRABSummary, formatAmountK, formatRupiah } from '../../lib/storage';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Download,
  Image as ImageIcon,
  Copy,
  Receipt,
  Printer,
  CheckCircle2,
  Calendar,
  MapPin,
  UserCheck,
  Zap,
  RotateCcw,
  Tag,
} from 'lucide-react';

interface RABDocumentViewProps {
  rab: RABPlan;
  treasurerName?: string;
  onShowToast: (msg: string) => void;
  onOpenExecuteModal?: () => void;
  onOpenRefundModal?: () => void;
  availableCashBalance?: number;
}

const PRIORITY_BADGE_STYLE: Record<
  RABItemPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  wajib: { label: 'Wajib', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  sekunder: { label: 'Sekunder', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  opsional: { label: 'Opsional', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  cadangan: { label: 'Cadangan', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

const padR = (str: string, length: number) => {
  if (str.length >= length) return str.slice(0, length);
  return str + ' '.repeat(length - str.length);
};

const padL = (str: string, length: number) => {
  if (str.length >= length) return str.slice(0, length);
  return ' '.repeat(length - str.length) + str;
};

export const RABDocumentView: React.FC<RABDocumentViewProps> = ({
  rab,
  treasurerName = 'Bendahara Tongkrongan',
  onShowToast,
  onOpenExecuteModal,
  onOpenRefundModal,
  availableCashBalance = 0,
}) => {
  const docRef = useRef<HTMLDivElement>(null);
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);

  const summary = calculateRABSummary(rab);

  // Generate clean fixed-width Monospace WhatsApp message
  const generateWhatsAppText = (): string => {
    let text = `*📋 RANCANGAN ANGGARAN BIAYA (RAB)*\n`;
    text += `*Rencana:* ${rab.name.toUpperCase()}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *PJ (Penanggung Jawab):* ${rab.pic_name || '-'}\n`;
    text += `📅 *Waktu:* ${rab.event_date || '-'}\n`;
    text += `📍 *Tempat:* ${rab.location || '-'}\n`;
    text += `📌 *Status:* ${rab.status.toUpperCase()} (${summary.allocationPercentage}% Kas)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `*DETAIL ITEM BIAYA (${rab.items.length} Barang):*\n`;
    text += `\`\`\`\n`;
    text += `==============================================\n`;
    text += `NO BARANG           QTY SAT  HARGA   TOTAL PRI\n`;
    text += `==============================================\n`;

    if (rab.items.length === 0) {
      text += `(Belum ada item rancangan biaya)\n`;
    } else {
      rab.items.forEach((item, idx) => {
        const noStr = padR(`${idx + 1}.`, 3);
        const nameStr = padR(item.name.trim(), 16);
        const qtyStr = padL(String(item.qty), 3);
        const unitStr = padR(item.unit.slice(0, 3), 4);
        const priceStr = padL(formatAmountK(item.unit_price), 6);
        const subStr = padL(formatAmountK(item.subtotal), 7);
        const prioStr = padR(item.priority.slice(0, 3).toUpperCase(), 3);

        text += `${noStr}${nameStr}${qtyStr} ${unitStr}${priceStr} ${subStr} ${prioStr}\n`;
      });
    }

    text += `==============================================\n`;
    text += `TOTAL ANGGARAN    : ${padL(formatAmountK(summary.totalBudget), 24)}\n`;
    text += `DANA KAS TERSEDIA : ${padL(formatAmountK(summary.allocatedAmount), 24)}\n`;
    text += `KEKURANGAN / SISA : ${padL(formatAmountK(summary.remainingNeeded), 24)}\n`;
    text += `==============================================\n`;
    text += `* Satuan: k (ribu rupiah) | WAJ=Wajib, SEK=Sekunder\n`;
    text += `\`\`\`\n\n`;

    // Priority breakdown
    text += `*📊 RINGKASAN PRIORITAS:*\n`;
    text += `• Wajib    : ${formatAmountK(summary.priorityTotals.wajib)} (${summary.priorityCounts.wajib} item)\n`;
    text += `• Sekunder : ${formatAmountK(summary.priorityTotals.sekunder)} (${summary.priorityCounts.sekunder} item)\n`;
    text += `• Opsional : ${formatAmountK(summary.priorityTotals.opsional)} (${summary.priorityCounts.opsional} item)\n`;
    text += `• Cadangan : ${formatAmountK(summary.priorityTotals.cadangan)} (${summary.priorityCounts.cadangan} item)\n\n`;

    if (rab.notes) {
      text += `📝 *Catatan Rencana:*\n${rab.notes}\n\n`;
    }

    text += `_Disusun oleh: ${rab.pic_name} | Diverifikasi: ${treasurerName}_\n`;
    return text;
  };

  const handleCopyWA = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    onShowToast('📋 Dokumen RAB (Font Monospace) disalin! Rapi & sejajar di WhatsApp.');
  };

  // Export as PNG
  const handleExportPNG = async () => {
    if (!docRef.current) return;
    try {
      setIsExportingPNG(true);
      onShowToast('⏳ Merender dokumen RAB ke gambar PNG...');
      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = await toPng(docRef.current, {
        cacheBust: true,
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      const cleanName = rab.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `RAB_${cleanName}_${new Date().toISOString().slice(0, 10)}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast(`✅ RAB berhasil diunduh sebagai gambar PNG: ${filename}`);
    } catch (err) {
      console.error('Failed to export RAB PNG:', err);
      onShowToast('❌ Gagal mengekspor PNG. Silakan coba kembali.');
    } finally {
      setIsExportingPNG(false);
    }
  };

  // Export as PDF
  const handleExportPDF = async () => {
    if (!docRef.current) return;
    try {
      setIsExportingPDF(true);
      onShowToast('⏳ Memproses dokumen PDF formal RAB...');
      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = await toPng(docRef.current, {
        cacheBust: true,
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      if (imgHeight > pdfHeight - margin * 2) {
        // Multi-page or scale to fit
        const scaleFactor = (pdfHeight - margin * 2) / imgHeight;
        const scaledWidth = contentWidth * scaleFactor;
        const scaledHeight = imgHeight * scaleFactor;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(dataUrl, 'PNG', xOffset, margin, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, imgHeight);
      }

      const cleanName = rab.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `RAB_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      onShowToast(`✅ Dokumen RAB berhasil diunduh sebagai PDF: ${filename}`);
    } catch (err) {
      console.error('Failed to export RAB PDF:', err);
      onShowToast('❌ Gagal memproses PDF. Silakan coba kembali.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Action Bar */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold tracking-tight">Dokumen Cetak & Ekspor RAB</h4>
            <p className="text-[11px] text-slate-400">
              Font JetBrains Mono | Tampilan Presisi Anti-Terpotong
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Cash Allocation Actions */}
          {onOpenExecuteModal && (
            <button
              type="button"
              onClick={onOpenExecuteModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm"
              title="Alokasikan Saldo Kas Utama ke RAB ini"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Eksekusi Kas</span>
            </button>
          )}

          {onOpenRefundModal && (rab.allocated_amount || 0) > 0 && (
            <button
              type="button"
              onClick={onOpenRefundModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm"
              title="Kembalikan Sisa Dana ke Kas Utama"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan Dana</span>
            </button>
          )}

          {/* Export Actions */}
          <button
            type="button"
            onClick={handleExportPNG}
            disabled={isExportingPNG || isExportingPDF}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-slate-700"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingPNG ? 'PNG...' : 'PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPNG || isExportingPDF}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{isExportingPDF ? 'PDF...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyWA}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin WA</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWAPreview(!showWAPreview)}
            className={`p-1.5 rounded-xl border transition-colors ${
              showWAPreview
                ? 'bg-white text-slate-900 border-white'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Pratinjau Format WhatsApp"
          >
            <Receipt className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WhatsApp Monospace Live Preview Box */}
      {showWAPreview && (
        <div className="p-3.5 bg-slate-950 text-emerald-400 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 pb-1 border-b border-slate-800 font-sans font-bold">
            <span>Pratinjau Pesan Grup WhatsApp (Monospace Fixed Column):</span>
            <button
              type="button"
              onClick={handleCopyWA}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px]"
            >
              Salin Sekarang
            </button>
          </div>
          <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre p-2 bg-slate-900 rounded-lg">
            {generateWhatsAppText()}
          </pre>
        </div>
      )}

      {/* PRINTABLE / EXPORTABLE CANVAS */}
      <div
        ref={docRef}
        id="printable-rab-document"
        className="bg-white border-2 border-slate-800 rounded-2xl p-4 sm:p-7 text-slate-900 space-y-5 font-mono shadow-xs overflow-hidden"
        style={{ width: '100%', maxWidth: '100%' }}
      >
        {/* Document Header / Kop */}
        <div className="border-b-2 border-slate-800 pb-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                DOKUMEN RESMI KEUANGAN TONGKRONGAN
              </span>
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                RANCANGAN ANGGARAN BIAYA (RAB)
              </h2>
            </div>
            <div className="text-left sm:text-right">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${
                  rab.status === 'dialokasikan'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : rab.status === 'selesai'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : rab.status === 'dibatalkan'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                STATUS: {rab.status}
              </span>
            </div>
          </div>

          {/* Event Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-200">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">NAMA RENCANA:</span>
              <span className="font-bold text-slate-900 line-clamp-1">{rab.name}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">PENANGGUNG JAWAB (PJ):</span>
              <span className="font-bold text-slate-900 line-clamp-1">{rab.pic_name || '-'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">WAKTU KEGIATAN:</span>
              <span className="font-semibold text-slate-900 line-clamp-1">{rab.event_date || '-'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">LOKASI / TEMPAT:</span>
              <span className="font-semibold text-slate-900 line-clamp-1">{rab.location || '-'}</span>
            </div>
          </div>
        </div>

        {/* Budget Execution Metric Strip */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-500 block font-sans font-bold">TOTAL ESTIMASI RAB</span>
            <span className="text-sm sm:text-base font-black text-slate-900">
              {formatAmountK(summary.totalBudget)}
            </span>
            <span className="block text-[9px] text-slate-400">Rp {formatRupiah(summary.totalBudget)}</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5">
            <span className="text-[10px] text-emerald-800 block font-sans font-bold">DANA KAS TERVERIFIKASI</span>
            <span className="text-sm sm:text-base font-black text-emerald-700">
              {formatAmountK(summary.allocatedAmount)}
            </span>
            <span className="block text-[9px] text-emerald-600 font-bold">{summary.allocationPercentage}% Teralokasi</span>
          </div>

          <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5">
            <span className="text-[10px] text-amber-800 block font-sans font-bold">SISA KEKURANGAN</span>
            <span className="text-sm sm:text-base font-black text-amber-700">
              {formatAmountK(summary.remainingNeeded)}
            </span>
            <span className="block text-[9px] text-amber-600">Rp {formatRupiah(summary.remainingNeeded)}</span>
          </div>
        </div>

        {/* ITEMS TABLE (Mobile-Safe, Table-Fixed, No Overflow Cut) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              DAFTAR RANCANGAN ANGGARAN ({rab.items.length} ITEM)
            </span>
            <span className="text-[10px] text-slate-400">* Satuan: k (ribu rupiah)</span>
          </div>

          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse table-fixed font-mono">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px]">
                  <th className="py-2 px-1.5 w-[8%] text-center">NO</th>
                  <th className="py-2 px-2 w-[34%]">NAMA BARANG</th>
                  <th className="py-2 px-1 w-[13%] text-center">QTY</th>
                  <th className="py-2 px-1.5 w-[16%] text-right">HARGA</th>
                  <th className="py-2 px-1.5 w-[17%] text-right">SUBTOTAL</th>
                  <th className="py-2 px-1 w-[12%] text-center">PRIO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {rab.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Belum ada rincian item barang pada rencana ini.
                    </td>
                  </tr>
                ) : (
                  rab.items.map((item, idx) => {
                    const prioStyle = PRIORITY_BADGE_STYLE[item.priority || 'wajib'];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-1.5 text-center text-slate-500 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 font-bold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </td>
                        <td className="py-2 px-1 text-center whitespace-nowrap text-slate-700 text-[10px]">
                          <span className="font-bold">{item.qty}</span>{' '}
                          <span className="text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-2 px-1.5 text-right font-medium text-slate-600 whitespace-nowrap">
                          {formatAmountK(item.unit_price)}
                        </td>
                        <td className="py-2 px-1.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatAmountK(item.subtotal)}
                        </td>
                        <td className="py-2 px-1 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-1 py-0.5 rounded text-[9px] font-bold border ${prioStyle.bg} ${prioStyle.text} ${prioStyle.border}`}
                          >
                            {prioStyle.label.slice(0, 3)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-800 font-bold text-xs">
                  <td colSpan={4} className="py-2 px-2 text-right text-slate-700 font-sans font-bold">
                    TOTAL KESELURUHAN (RAB):
                  </td>
                  <td className="py-2 px-1.5 text-right font-black text-slate-900 text-sm">
                    {formatAmountK(summary.totalBudget)}
                  </td>
                  <td className="py-2 px-1 text-center text-[10px] text-slate-500">
                    {rab.items.length} item
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Priority Breakdown Cards */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 block uppercase">
            AKUMULASI BIAYA PER SKALA PRIORITAS:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2 rounded-lg border border-rose-200">
              <span className="text-[10px] text-rose-700 font-bold block">1. Wajib (Esensial):</span>
              <span className="font-bold text-slate-900">{formatAmountK(summary.priorityTotals.wajib)}</span>
              <span className="text-[10px] text-slate-400 block">{summary.priorityCounts.wajib} item</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-amber-200">
              <span className="text-[10px] text-amber-800 font-bold block">2. Sekunder:</span>
              <span className="font-bold text-slate-900">{formatAmountK(summary.priorityTotals.sekunder)}</span>
              <span className="text-[10px] text-slate-400 block">{summary.priorityCounts.sekunder} item</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold block">3. Opsional:</span>
              <span className="font-bold text-slate-900">{formatAmountK(summary.priorityTotals.opsional)}</span>
              <span className="text-[10px] text-slate-400 block">{summary.priorityCounts.opsional} item</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-300">
              <span className="text-[10px] text-slate-700 font-bold block">4. Cadangan / Buffer:</span>
              <span className="font-bold text-slate-900">{formatAmountK(summary.priorityTotals.cadangan)}</span>
              <span className="text-[10px] text-slate-400 block">{summary.priorityCounts.cadangan} item</span>
            </div>
          </div>
        </div>

        {/* Notes / Remarks if any */}
        {rab.notes && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <span className="font-bold block text-[10px] text-slate-400 uppercase">CATATAN KHUSUS:</span>
            <span>{rab.notes}</span>
          </div>
        )}

        {/* Signatures / Verifications Footer */}
        <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-end text-xs text-center">
          <div className="space-y-8">
            <p className="text-[10px] text-slate-500 font-bold">Disusun Oleh (PJ Acara),</p>
            <div>
              <p className="font-bold text-slate-900 underline">{rab.pic_name || 'PJ Rencana'}</p>
              <p className="text-[10px] text-slate-500">Penanggung Jawab</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center max-w-[200px] hidden sm:block">
            <p>Sistem Kas Tongkrongan</p>
            <p>Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
          </div>

          <div className="space-y-8">
            <p className="text-[10px] text-slate-500 font-bold">Diverifikasi Oleh,</p>
            <div>
              <p className="font-bold text-slate-900 underline">{treasurerName}</p>
              <p className="text-[10px] text-slate-500">Bendahara Tongkrongan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
