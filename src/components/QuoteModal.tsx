import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Building2,
  FileCheck,
  Calendar,
  MapPin,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import { CalculationResult } from '../types';
import { RAL_COLORS } from '../utils/calculations';
import { useAppContext } from '../context/AppContext';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  klijent: string;
  klijentTelefon?: string;
  klijentEmail?: string;
  lokacija: string;
  napomena?: string;
  brojPonude: string;
  kalkulacija: CalculationResult;
  onSaveToOrders?: () => void;
  isAlreadySaved?: boolean;
}

// Keširani Base64 TTF fontovi za punu UTF-8 podršku bosanskih slova (č, ć, ž, š, đ) u jsPDF-u
let cachedRobotoRegularBase64: string | null = null;
let cachedRobotoBoldBase64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

async function registerBosnianTtfFont(doc: jsPDF): Promise<string> {
  try {
    if (!cachedRobotoRegularBase64) {
      const regRes = await fetch(
        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf'
      );
      if (regRes.ok) {
        const buf = await regRes.arrayBuffer();
        cachedRobotoRegularBase64 = arrayBufferToBase64(buf);
      }
    }

    if (!cachedRobotoBoldBase64) {
      const boldRes = await fetch(
        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf'
      );
      if (boldRes.ok) {
        const buf = await boldRes.arrayBuffer();
        cachedRobotoBoldBase64 = arrayBufferToBase64(buf);
      }
    }

    if (cachedRobotoRegularBase64) {
      doc.addFileToVFS('Roboto-Regular.ttf', cachedRobotoRegularBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

      if (cachedRobotoBoldBase64) {
        doc.addFileToVFS('Roboto-Bold.ttf', cachedRobotoBoldBase64);
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      } else {
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
      }
      return 'Roboto';
    }
  } catch {
    // Fallback na ugrađeni font ako nema internet konekcije
  }
  return 'helvetica';
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  klijent,
  klijentTelefon,
  klijentEmail,
  lokacija,
  napomena,
  brojPonude,
  kalkulacija,
  onSaveToOrders,
  isAlreadySaved = false,
}) => {
  const { companySettings, showToast } = useAppContext();
  const [savedNotice, setSavedNotice] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printComponentRef = useRef<HTMLDivElement>(null);

  const handleReactToPrint = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: `Ponuda_${brojPonude}_${klijent.replace(/\s+/g, '_')}`,
    onAfterPrint: () => {
      showToast(
        `Dokument Ponuda #${brojPonude} poslan na štampu / PDF.`,
        'info'
      );
    },
  });

  if (!isOpen) return null;

  const ralInfo =
    RAL_COLORS.find((r) => r.value === kalkulacija.bojaRal) || RAL_COLORS[0];

  const danasnjiDatum = new Date().toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handleDownloadPdfFile = async () => {
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const activeFont = await registerBosnianTtfFont(doc);

      // Zaglavlje firme
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 14, 182, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(15);
      doc.text(companySettings.nazivFirme, 20, 24);

      doc.setFont(activeFont, 'normal');
      doc.setFontSize(9);
      doc.text(companySettings.podnaslov, 20, 30.5);
      doc.text(
        `${companySettings.adresa}, ${companySettings.grad} | Tel: ${companySettings.telefon}`,
        20,
        36.5
      );

      // Desni ugao: Broj ponude
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(12);
      doc.text(`PONUDA #${brojPonude}`, 190, 24, {
        align: 'right',
      });
      doc.setFont(activeFont, 'normal');
      doc.setFontSize(9);
      doc.text(`Datum: ${danasnjiDatum}`, 190, 30.5, { align: 'right' });
      doc.text(
        `JIB: ${companySettings.jibBroj} | PDV: ${companySettings.pdvBroj}`,
        190,
        36.5,
        { align: 'right' }
      );

      // Podaci o kupcu (CRM) i tehnički sažetak
      doc.setTextColor(15, 23, 42);
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(10);
      doc.text('NARUČILAC / KUPAC (CRM):', 14, 52);
      doc.text('TEHNIČKA SPECIFIKACIJA PROIZVODA:', 110, 52);

      doc.setFont(activeFont, 'normal');
      doc.setFontSize(9);
      doc.text(klijent || 'Kupac — Maloprodaja', 14, 58.5);
      doc.text(`Lokacija: ${lokacija || 'Bosna i Hercegovina'}`, 14, 64);
      if (klijentTelefon || klijentEmail) {
        doc.text(
          `Kontakt: ${[klijentTelefon, klijentEmail].filter(Boolean).join(' | ')}`,
          14,
          69.5
        );
      }
      if (napomena) {
        doc.text(`Napomena: ${napomena.slice(0, 52)}`, 14, 75);
      }

      doc.text(`Tip proizvoda: ${kalkulacija.tipProizvoda}`, 110, 58.5);
      doc.text(`Boja (RAL): ${kalkulacija.bojaRal}`, 110, 64);
      doc.text(
        `Dimenzije (Š x V): ${kalkulacija.sirinaMm} x ${kalkulacija.visinaMm} mm (${kalkulacija.kolicina} kom)`,
        110,
        69.5
      );
      doc.text(
        `Površina: ${(kalkulacija.potrebnaMrezicaM2 * kalkulacija.kolicina).toFixed(2)} m² | Rad: ${kalkulacija.laborCostPerM2KM} KM/m²`,
        110,
        75
      );

      // Tabela 1: Finansijska specifikacija stavki (`SpecItem`)
      let y = 84;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(8);
      doc.text('Šifra', 16, y + 5.5);
      doc.text('Naziv komponente / profila', 36, y + 5.5);
      doc.text('Krojna mjera / Utrošak', 100, y + 5.5);
      doc.text('Kol.', 140, y + 5.5);
      doc.text('Jed. cijena', 155, y + 5.5);
      doc.text('Materijal (KM)', 193, y + 5.5, { align: 'right' });

      y += 12.5;
      doc.setFont(activeFont, 'normal');
      for (const st of kalkulacija.stavke) {
        const kolText = st.kolicinaBroj
          ? `${st.kolicinaBroj}`
          : `${kalkulacija.kolicina}`;
        const jedCijenaText = st.jedinicnaCijenaKM
          ? `${st.jedinicnaCijenaKM.toFixed(2)}`
          : `${st.cijenaKM.toFixed(2)}`;

        doc.text(st.sifra, 16, y);
        doc.text(st.naziv.slice(0, 38), 36, y);
        doc.text(st.dimenzijaOpis.slice(0, 26), 100, y);
        doc.text(kolText, 140, y);
        doc.text(jedCijenaText, 155, y);
        doc.text(`${st.cijenaKM.toFixed(2)} KM`, 193, y, { align: 'right' });
        doc.setDrawColor(226, 232, 240);
        doc.line(14, y + 2.5, 196, y + 2.5);
        y += 7.5;
      }

      // Tabela 2: Radionička Krojna Lista (`CutListItem`) prema Lyctum / Excel normativu
      y += 3;
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(8.5);
      doc.text('RADIONIČKA KROJNA LISTA (BOM SPECIFIKACIJA ZA REZANJE):', 14, y);
      y += 3;

      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFontSize(7.5);
      doc.text('Komponenta', 16, y + 4.8);
      doc.text('Kategorija', 68, y + 4.8);
      doc.text('Izračunata mjera', 112, y + 4.8);
      doc.text('Ukupno kom / polja', 193, y + 4.8, { align: 'right' });

      y += 11;
      doc.setFont(activeFont, 'normal');
      for (const cut of kalkulacija.krojnaLista) {
        const isBrojPolja = cut.kodKomponente === 'HARMO_BROJ_POLJA_MREZICE';
        doc.text(cut.nazivKomponente.slice(0, 32), 16, y);
        doc.text(cut.kategorija, 68, y);
        doc.text(cut.prikazMjere.slice(0, 36), 112, y);
        doc.text(
          isBrojPolja ? `${cut.mjeraMm} polja` : `${cut.ukupnoKomada} kom`,
          193,
          y,
          { align: 'right' }
        );
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + 2, 196, y + 2);
        y += 6.5;
      }

      // Detaljan obračun sa troškom materijala, rada, maržom, osnovicom i PDV-om (17%) u feningima
      y += 4;
      doc.setFont(activeFont, 'normal');
      doc.setFontSize(9);

      doc.text('1. Ukupan trošak materijala:', 115, y);
      doc.text(`${kalkulacija.materijalKM.toFixed(2)} KM`, 193, y, {
        align: 'right',
      });

      y += 5.5;
      doc.text(
        `2. Trošak rada (${kalkulacija.laborCostPerM2KM.toFixed(2)} KM/m²):`,
        115,
        y
      );
      doc.text(`${kalkulacija.radKM.toFixed(2)} KM`, 193, y, {
        align: 'right',
      });

      y += 5.5;
      doc.text(`3. Obračunata marža (${kalkulacija.marginPercent}%):`, 115, y);
      doc.text(`+${kalkulacija.marzaKM.toFixed(2)} KM`, 193, y, {
        align: 'right',
      });

      y += 6;
      doc.setFont(activeFont, 'bold');
      doc.text(
        `Ukupna porezna osnovica (${kalkulacija.kolicina} kom):`,
        115,
        y
      );
      doc.text(`${kalkulacija.osnovicaKM.toFixed(2)} KM`, 193, y, {
        align: 'right',
      });

      y += 5.5;
      doc.setFont(activeFont, 'normal');
      doc.text('PDV po stopi u BiH (17%):', 115, y);
      doc.text(`${kalkulacija.pdvKM.toFixed(2)} KM`, 193, y, {
        align: 'right',
      });

      y += 7.5;
      doc.setFillColor(239, 246, 255);
      doc.rect(113, y - 5.5, 83, 9, 'F');
      doc.setFont(activeFont, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(29, 78, 216);
      doc.text('UKUPNO ZA UPLATU:', 115, y);
      doc.text(`${kalkulacija.ukupnoSaPdvKM.toFixed(2)} KM`, 193, y, {
        align: 'right',
      });

      // Podnožje i potpis
      y += 14;
      doc.setTextColor(100, 116, 139);
      doc.setFont(activeFont, 'normal');
      doc.setFontSize(8.5);
      doc.text(
        `Žiro račun: ${companySettings.ziroRacun} (${companySettings.banka})`,
        14,
        y
      );
      doc.text(
        `Za ${companySettings.nazivFirme}: ${companySettings.ovlastenoLice}`,
        14,
        y + 5
      );

      doc.save(`Ponuda_${brojPonude}.pdf`);
      showToast(
        `Ponuda #${brojPonude}.pdf (sa Lyctum krojnom listom i obračunom u feningima) je preuzeta!`,
        'success'
      );
    } catch {
      showToast('Greška pri generisanju PDF dokumenta.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleConfirmOrder = () => {
    if (onSaveToOrders) {
      onSaveToOrders();
      setSavedNotice(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-ponuda-naslov"
    >
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Top Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <h2
                id="modal-ponuda-naslov"
                className="text-sm font-semibold tracking-tight"
              >
                PDF Generator Ponude — #{brojPonude}
              </h2>
              <p className="text-xs text-slate-400">
                Ugrađen UTF-8 TTF font, Lyctum BOM krojna lista i obračun u feningima
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveToOrders && !isAlreadySaved && !savedNotice && (
              <button
                type="button"
                onClick={handleConfirmOrder}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sačuvaj nalog
              </button>
            )}
            {(isAlreadySaved || savedNotice) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                U aktivnim nalozima
              </span>
            )}

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdfFile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Učitavanje TTF i generisanje...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Preuzmi PDF (.pdf)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleReactToPrint()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              Štampaj
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Zatvori prikaz ponude"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable A4-styled Sheet */}
        <div
          ref={printComponentRef}
          id="printable-quote-modal"
          className="p-6 sm:p-10 bg-white text-slate-900 max-h-[78vh] overflow-y-auto"
        >
          {/* Header with Dynamic Company Settings & Logo */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-start gap-4">
              {companySettings.logoUrl ? (
                <img
                  src={companySettings.logoUrl}
                  alt={companySettings.nazivFirme}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1 bg-white shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-900 flex flex-col items-center justify-center p-2.5 shrink-0 border border-slate-800">
                  <div className="w-full h-1.5 bg-blue-500 rounded-xs mb-1" />
                  <div className="w-full h-1 bg-slate-200 rounded-xs mb-1" />
                  <div className="w-full h-1 bg-slate-300 rounded-xs mb-1" />
                  <div className="w-full h-1 bg-slate-400 rounded-xs mb-1" />
                  <div className="w-3/4 h-1.5 bg-blue-400 rounded-xs" />
                </div>
              )}
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  {companySettings.nazivFirme}
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {companySettings.podnaslov}
                </p>
                <div className="mt-2 text-xs text-slate-500 space-y-0.5 font-mono tabular-nums">
                  <p>
                    {companySettings.adresa}, {companySettings.grad}
                  </p>
                  <p>
                    ID/JIB: {companySettings.jibBroj} · PDV broj:{' '}
                    {companySettings.pdvBroj}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {companySettings.telefon}
                    </span>
                    <span>·</span>
                    <span>{companySettings.email}</span>
                  </p>
                  <p>
                    Žiro račun: {companySettings.ziroRacun} (
                    {companySettings.banka})
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                PONUDA / PREDRAČUN
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                #{brojPonude}
              </p>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p className="flex sm:justify-end items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Datum izdavanja:</span>
                  <strong className="font-mono tabular-nums text-slate-800">
                    {danasnjiDatum}
                  </strong>
                </p>
                <p>
                  Opcija ponude: <strong className="text-slate-700">15 dana</strong>
                </p>
                <p>
                  Paritet isporuke:{' '}
                  <strong className="text-slate-700">FCO Kupac / BiH</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Client (CRM) & Technical Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">
                Naručilac / Kupac (CRM evidencija)
              </p>
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900">
                    {klijent || 'Kupac — Maloprodaja'}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {lokacija || 'Sarajevo, Bosna i Hercegovina'}
                  </p>
                  {klijentTelefon && (
                    <p className="text-xs text-slate-600 flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {klijentTelefon}
                    </p>
                  )}
                  {klijentEmail && (
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {klijentEmail}
                    </p>
                  )}
                  {napomena && (
                    <p className="text-xs text-slate-500 pt-1">
                      Napomena: {napomena}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-800 mb-2">
                Tehnička specifikacija proizvoda
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                <span className="text-slate-500">Tip sistema:</span>
                <span className="font-semibold text-slate-900">
                  {kalkulacija.tipProizvoda}
                </span>

                <span className="text-slate-500">Boja (RAL karta):</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-xs inline-block border"
                    style={{
                      backgroundColor: ralInfo.hex,
                      borderColor: ralInfo.borderHex,
                    }}
                  />
                  {kalkulacija.bojaRal}
                </span>

                <span className="text-slate-500">Dimenzije (Š × V):</span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {kalkulacija.sirinaMm} × {kalkulacija.visinaMm} mm (
                  {kalkulacija.kolicina} kom)
                </span>

                <span className="text-slate-500">Površina po komadu:</span>
                <span className="font-mono font-semibold tabular-nums text-blue-700">
                  {kalkulacija.potrebnaMrezicaM2} m²
                </span>
              </div>
            </div>
          </div>

          {/* Specification Items Table (`SpecItem`) */}
          <div className="py-5">
            <h3 className="text-xs font-semibold text-slate-700 mb-2.5">
              Finansijska specifikacija utroška materijala (`SpecItem`)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <th className="py-2.5 px-3">Šifra</th>
                    <th className="py-2.5 px-3">Naziv komponente / profila</th>
                    <th className="py-2.5 px-3">Krojna mjera / Utrošak</th>
                    <th className="py-2.5 px-3 text-center">Kol.</th>
                    <th className="py-2.5 px-3 text-right">Jed. cijena (KM)</th>
                    <th className="py-2.5 px-3 text-right">Materijal (KM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {kalkulacija.stavke.map((st) => (
                    <tr key={st.sifra} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                        {st.sifra}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {st.naziv}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                        {st.dimenzijaOpis} ({st.kolicinaOpis})
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 tabular-nums">
                        {st.kolicinaBroj || kalkulacija.kolicina}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {(
                          st.jedinicnaCijenaKM ??
                          st.cijenaKM / (st.kolicinaBroj || 1)
                        ).toFixed(2)}{' '}
                        KM
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {st.cijenaKM.toFixed(2)} KM
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Radionička Krojna Lista (`CutListItem`) */}
          <div className="pb-5">
            <h3 className="text-xs font-semibold text-slate-700 mb-2.5">
              Radionička krojna lista (`CutListItem` — Zvanični Lyctum / Excel BOM normativ)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2 px-3">Komponenta</th>
                    <th className="py-2 px-3">Kategorija</th>
                    <th className="py-2 px-3">Izračunata mjera / Normativ</th>
                    <th className="py-2 px-3 text-center">Kom / jed.</th>
                    <th className="py-2 px-3 text-right">Ukupno za nalog</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {kalkulacija.krojnaLista.map((cut) => {
                    const isBrojPolja =
                      cut.kodKomponente === 'HARMO_BROJ_POLJA_MREZICE';
                    return (
                      <tr key={cut.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {cut.nazivKomponente}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {cut.kategorija}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-blue-700 tabular-nums">
                          {cut.prikazMjere}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600 tabular-nums">
                          {isBrojPolja ? '—' : `${cut.komadaPoJedinici} kom`}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {isBrojPolja
                            ? `${cut.mjeraMm} polja`
                            : `${cut.ukupnoKomada} kom`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals with Material + Labor + Margin + VAT 17% */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 items-end">
            <div className="text-xs text-slate-500 space-y-2">
              <p>
                <strong className="text-slate-700">Garancija:</strong> 5 godina na
                aluminijske profile i postojanost boje, 2 godine na mehanizam i mrežicu.
              </p>
              <p>
                <strong className="text-slate-700">Način plaćanja:</strong> 50%
                avansno po prihvatanju ponude, 50% po završenoj isporuci/montaži.
              </p>
              <div className="pt-4 flex items-center gap-8">
                <div>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Za {companySettings.nazivFirme} (M.P.)
                  </p>
                  <div className="w-44 border-b border-slate-300 pb-1 font-medium text-slate-700 italic">
                    {companySettings.ovlastenoLice}
                  </div>
                </div>
                <div className="px-3 py-1.5 border border-blue-300 rounded text-[11px] font-mono text-blue-700 tracking-wider">
                  DOKUMENT VERIFIKOVAN
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>1. Ukupan trošak materijala:</span>
                <span className="font-mono tabular-nums">
                  {kalkulacija.materijalKM.toFixed(2)} KM
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>
                  2. Trošak rada ({kalkulacija.laborCostPerM2KM.toFixed(2)}{' '}
                  KM/m²):
                </span>
                <span className="font-mono tabular-nums">
                  {kalkulacija.radKM.toFixed(2)} KM
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>3. Marža ({kalkulacija.marginPercent}%):</span>
                <span className="font-mono font-medium tabular-nums">
                  +{kalkulacija.marzaKM.toFixed(2)} KM
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between text-slate-700">
                <span>
                  Ukupna porezna osnovica ({kalkulacija.kolicina} kom):
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {kalkulacija.osnovicaKM.toFixed(2)} KM
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PDV po stopi u BiH (17%):</span>
                <span className="font-mono tabular-nums">
                  {kalkulacija.pdvKM.toFixed(2)} KM
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">
                  UKUPNO ZA UPLATU:
                </span>
                <span className="text-lg font-bold font-mono tabular-nums text-blue-700">
                  {kalkulacija.ukupnoSaPdvKM.toFixed(2)} KM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
