import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

export interface PDFGenerationResult {
  blob: Blob;
  base64: string;
  dataUrl: string;
  fileName: string;
}

/**
 * Helper to convert Excel ARGB or RGB color string to [r, g, b]
 */
function parseExcelColor(argb?: string): [number, number, number] | null {
  if (!argb) return null;
  const clean = argb.replace('#', '');
  if (clean.length === 8) {
    // AARRGGBB
    const r = parseInt(clean.substring(2, 4), 16);
    const g = parseInt(clean.substring(4, 6), 16);
    const b = parseInt(clean.substring(6, 8), 16);
    return [r, g, b];
  } else if (clean.length === 6) {
    // RRGGBB
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

// ---------- Arabic support (drawn by the browser canvas, then placed in the PDF) ----------
const AMIRI_BASE = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/';
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_LETTER_RE = /[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const DIGIT_TOKEN_RE = /^[0-9\u0660-\u0669\u06F0-\u06F9]+$/;
// Hidden direction marks (LRM, RLM, embeddings, isolates, ALM) that can silently reorder text
const BIDI_MARKS_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]/g;

// ===== PLATE SETTINGS =====
// Plate letters are drawn one by one, from LEFT to RIGHT, in the order stored in the cell.
// If the plate letters are still the wrong way round, change this ONE value.
const PLATE_REVERSE_LETTERS = false;
// Digits are drawn on the left of the letters. Set to false to put them on the right.
const PLATE_DIGITS_ON_LEFT = true;
// The plate cell in the JobOrder sheet (D8 = row 8, column 4)
const PLATE_ROW = 8;
const PLATE_COL = 4;
// ==========================

const CANVAS_PX_PER_MM = 20; // image sharpness

let arabicFontPromise: Promise<boolean> | null = null;

function loadArabicCanvasFont(): Promise<boolean> {
  if (!arabicFontPromise) {
    arabicFontPromise = (async () => {
      try {
        if (typeof document === 'undefined' || typeof FontFace === 'undefined') return false;
        const regular = new FontFace('AmiriPDF', `url(${AMIRI_BASE}Amiri-Regular.ttf)`, { weight: '400' });
        const bold = new FontFace('AmiriPDF', `url(${AMIRI_BASE}Amiri-Bold.ttf)`, { weight: '700' });
        const loaded = await Promise.all([regular.load(), bold.load()]);
        loaded.forEach((f) => document.fonts.add(f));
        return true;
      } catch (err) {
        console.error('Amiri font failed to load, falling back to system Arabic font:', err);
        return false;
      }
    })();
  }
  return arabicFontPromise;
}

interface PlateInfo {
  digits: string;
  letters: string[];
}

// Detects a car plate such as "ج ك ع 7687" (single Arabic letters + digits)
function parsePlate(text: string, isPlateCell: boolean): PlateInfo | null {
  const clean = text.replace(BIDI_MARKS_RE, '').trim();
  const chars = Array.from(clean);
  const letters = chars.filter((ch) => ARABIC_LETTER_RE.test(ch));
  if (letters.length === 0) return null;

  const digitParts = clean.match(/[0-9\u0660-\u0669\u06F0-\u06F9]+/g) || [];
  const digits = digitParts.join(' ');

  const tokens = clean.split(/\s+/).filter(Boolean);
  const isArabicToken = (t: string) => Array.from(t).some((ch) => ARABIC_LETTER_RE.test(ch));
  const arabicTokens = tokens.filter(isArabicToken);

  // Spaced single letters + digits only, e.g. "ج ك ع 7687"
  const spacedPlate =
    arabicTokens.length >= 2 &&
    tokens.every((t) => (isArabicToken(t) && Array.from(t).length === 1) || DIGIT_TOKEN_RE.test(t));

  // The known plate cell, even if the letters are stored without spaces, e.g. "جكع7687"
  const knownCellPlate = isPlateCell && letters.length >= 1 && letters.length <= 4 && digits.length > 0;

  if (!spacedPlate && !knownCellPlate) return null;
  return { digits, letters };
}

interface ArabicDrawOptions {
  baselineY: number;
  cellX: number;
  cellW: number;
  padding: number;
  align: 'left' | 'center' | 'right';
  fontPt: number;
  bold: boolean;
  color: [number, number, number];
}

// Draws pieces of text on a canvas from left to right and places the image into the PDF.
// Normal Arabic text: one piece, direction 'rtl' (the browser shapes and orders it).
// Plate: several pieces (digits, then single letters), each drawn separately, so nothing can reorder them.
function drawCanvasPieces(
  doc: jsPDF,
  pieces: string[],
  direction: 'rtl' | 'ltr',
  o: ArabicDrawOptions
) {
  const pxPerMm = CANVAS_PX_PER_MM;
  const fontPx = o.fontPt * 0.3528 * pxPerMm;
  const fontCss = `${o.bold ? '700' : '400'} ${fontPx}px AmiriPDF, Amiri, Tahoma, Arial, sans-serif`;

  const scratch = document.createElement('canvas').getContext('2d');
  if (!scratch) return;
  scratch.font = fontCss;
  scratch.direction = direction;
  const widths = pieces.map((p) => scratch.measureText(p).width);
  const gapPx = pieces.length > 1 ? fontPx * 0.35 : 0;
  const textPx = widths.reduce((a, b) => a + b, 0) + gapPx * (pieces.length - 1);

  const padPx = Math.ceil(fontPx * 0.15);
  const ascentPx = fontPx * 1.1;
  const descentPx = fontPx * 0.7;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(textPx + padPx * 2));
  canvas.height = Math.max(1, Math.ceil(ascentPx + descentPx));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.font = fontCss;
  ctx.direction = direction;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgb(${o.color[0]}, ${o.color[1]}, ${o.color[2]})`;

  let cx = padPx;
  pieces.forEach((p, i) => {
    ctx.fillText(p, cx, ascentPx);
    cx += widths[i] + gapPx;
  });

  // Sizes in mm
  const textMm = textPx / pxPerMm;
  const maxW = Math.max(o.cellW - o.padding * 2, 2);
  const k = textMm > maxW ? maxW / textMm : 1; // shrink if too wide for the cell

  const wMm = (canvas.width / pxPerMm) * k;
  const hMm = (canvas.height / pxPerMm) * k;
  const padMm = (padPx / pxPerMm) * k;
  const baselineFromTopMm = (ascentPx / pxPerMm) * k;

  let px: number;
  if (o.align === 'center') {
    px = o.cellX + o.cellW / 2 - wMm / 2;
  } else if (o.align === 'right') {
    px = o.cellX + o.cellW - o.padding - wMm + padMm;
  } else {
    px = o.cellX + o.padding - padMm;
  }
  const py = o.baselineY - baselineFromTopMm;

  doc.addImage(canvas.toDataURL('image/png'), 'PNG', px, py, wMm, hMm);
}
// ------------------------------------------------------------------------------------------

/**
 * Converts the exact completed Job Order Excel workbook directly into a high-fidelity vector PDF.
 * Faithfully preserves:
 * - 1-page fit scaling
 * - Row heights and column width proportions
 * - Merged cell regions
 * - Cell backgrounds and fills
 * - Cell borders (thin, medium, color)
 * - Typography (font size, bold, italic, text color, alignment, wrapping)
 */
export async function convertExcelWorkbookToPDF(
  workbook: ExcelJS.Workbook,
  fileName: string = 'Job_Order.pdf'
): Promise<PDFGenerationResult> {
  console.log('[PDF build] plate-fix v5');

  const ws = workbook.worksheets[0];
  if (!ws) {
    throw new Error('Workbook contains no worksheets to convert to PDF.');
  }

  // Determine orientation & page setup
  const orientation = ws.pageSetup?.orientation === 'landscape' ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  await loadArabicCanvasFont();

  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;

  const margin = 10; // 10mm margins
  const printWidth = pageWidth - margin * 2;
  const printHeight = pageHeight - margin * 2;

  // Determine max rows and cols to render
  const maxRow = Math.min(ws.actualRowCount || ws.rowCount || 28, 32);
  const maxCol = Math.min(ws.actualColumnCount || ws.columnCount || 7, 10);

  // Measure column widths (Excel width unit roughly converts to character width, ~2.1mm)
  const colWidths: number[] = [];
  for (let c = 1; c <= maxCol; c++) {
    const colDef = ws.getColumn(c);
    const rawW = colDef.width || 15;
    colWidths.push(rawW * 2.1);
  }

  // Measure row heights (Excel pt to mm: 1 pt ≈ 0.3527 mm)
  const rowHeights: number[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r);
    const rawH = row.height || 18;
    rowHeights.push(rawH * 0.3528);
  }

  const rawTotalW = colWidths.reduce((a, b) => a + b, 0);
  const rawTotalH = rowHeights.reduce((a, b) => a + b, 0);

  // Compute scale factor to fit exactly within 1 page (like Excel "Fit All Columns / Fit Sheet on One Page")
  const scaleX = printWidth / rawTotalW;
  const scaleY = printHeight / rawTotalH;
  const scale = Math.min(scaleX, scaleY, 1.05);

  const scaledColWidths = colWidths.map((w) => w * scale);
  const scaledRowHeights = rowHeights.map((h) => h * scale);

  // Calculate cumulative X coordinates
  const colX: number[] = [margin];
  for (let c = 0; c < maxCol; c++) {
    colX.push(colX[c] + scaledColWidths[c]);
  }

  // Calculate cumulative Y coordinates
  const rowY: number[] = [margin];
  for (let r = 0; r < maxRow; r++) {
    rowY.push(rowY[r] + scaledRowHeights[r]);
  }

  // Parse merged cells
  interface MergeInfo {
    top: number;
    left: number;
    bottom: number;
    right: number;
  }

  const merges: MergeInfo[] = [];
  const mergesRaw = (ws.model as any).merges || [];
  for (const rangeStr of mergesRaw) {
    try {
      const parts = rangeStr.split(':');
      if (parts.length === 2) {
        const tl = ws.getCell(parts[0]);
        const br = ws.getCell(parts[1]);
        merges.push({
          top: Number(tl.row),
          left: Number(tl.col),
          bottom: Number(br.row),
          right: Number(br.col),
        });
      }
    } catch {
      // Ignore malformed range
    }
  }

  const isChildOfMerge = (r: number, c: number): boolean => {
    return merges.some(
      (m) => r >= m.top && r <= m.bottom && c >= m.left && c <= m.right && !(r === m.top && c === m.left)
    );
  };

  const getMergeMaster = (r: number, c: number): MergeInfo | null => {
    return merges.find((m) => r === m.top && c === m.left) || null;
  };

  // Render every cell
  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r);

    for (let c = 1; c <= maxCol; c++) {
      if (isChildOfMerge(r, c)) {
        continue; // Handled by master cell
      }

      const cell = row.getCell(c);
      const merge = getMergeMaster(r, c);

      let x = colX[c - 1];
      let y = rowY[r - 1];
      let w = scaledColWidths[c - 1];
      let h = scaledRowHeights[r - 1];

      if (merge) {
        const rightCol = Math.min(merge.right, maxCol);
        const bottomRow = Math.min(merge.bottom, maxRow);
        w = colX[rightCol] - colX[merge.left - 1];
        h = rowY[bottomRow] - rowY[merge.top - 1];
      }

      // 1. Draw Background Fill
      if (cell.fill && (cell.fill as any).type === 'pattern') {
        const fgColor = (cell.fill as any).fgColor?.argb;
        const rgb = parseExcelColor(fgColor);
        if (rgb) {
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(x, y, w, h, 'F');
        }
      }

      // 2. Draw Borders
      if (cell.border) {
        const b = cell.border;

        const drawBorderLine = (
          edge: Partial<ExcelJS.Border> | undefined,
          x1: number,
          y1: number,
          x2: number,
          y2: number
        ) => {
          if (!edge || !edge.style) return;
          const colorRgb = parseExcelColor((edge.color as any)?.argb) || [148, 163, 184];
          doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
          const lineW = edge.style === 'medium' || edge.style === 'thick' ? 0.45 : 0.2;
          doc.setLineWidth(lineW);
          doc.line(x1, y1, x2, y2);
        };

        drawBorderLine(b.top, x, y, x + w, y);
        drawBorderLine(b.bottom, x, y + h, x + w, y + h);
        drawBorderLine(b.left, x, y, x, y + h);
        drawBorderLine(b.right, x + w, y, x + w, y + h);
      }

      // 3. Draw Cell Text
      const rawVal = cell.value;
      let text = '';
      if (rawVal !== null && rawVal !== undefined) {
        if (typeof rawVal === 'object') {
          text = String((rawVal as any).text || (rawVal as any).result || '');
        } else {
          text = String(rawVal);
        }
      }

      if (text.trim()) {
        const font = cell.font || {};
        const baseFontSize = (font.size || 9.5) * scale * 0.82;
        const fontPt = Math.max(baseFontSize, 6.5);
        doc.setFontSize(fontPt);

        const isBold = !!font.bold;
        const isItalic = !!font.italic;
        const hasArabic = ARABIC_RE.test(text);

        let plate: PlateInfo | null = null;
        if (hasArabic) {
          // Debug: shows exactly what is stored in the cell. Open the browser console (F12).
          console.log(
            '[PDF Arabic] cell R' + r + 'C' + c,
            JSON.stringify(text),
            Array.from(text).map((ch) => ch.codePointAt(0)!.toString(16)).join(' ')
          );
          text = text.replace(BIDI_MARKS_RE, '');
          plate = parsePlate(text, r === PLATE_ROW && c === PLATE_COL);
          if (plate) {
            console.log('[PDF Arabic] plate detected:', plate);
          }
        }

        if (isBold && isItalic) {
          doc.setFont('helvetica', 'bolditalic');
        } else if (isBold) {
          doc.setFont('helvetica', 'bold');
        } else if (isItalic) {
          doc.setFont('helvetica', 'italic');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        const textColor = parseExcelColor(font.color?.argb) || [15, 23, 42];
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        const alignH = (cell.alignment?.horizontal || 'left') as string;
        const alignV = cell.alignment?.vertical || 'middle';
        const wrap = cell.alignment?.wrapText || false;

        const cellPadding = 1.5;
        const maxTextW = Math.max(w - cellPadding * 2, 2);

        // Split text for wrapping or newlines
        let lines: string[] = [];
        if (plate) {
          lines = [text]; // the plate is always a single line
        } else {
          const rawLines = text.split('\n');
          for (const l of rawLines) {
            if (hasArabic) {
              lines.push(l); // Arabic lines are shrunk to fit instead of wrapped
            } else if (wrap || l.length > 30) {
              lines.push(...doc.splitTextToSize(l, maxTextW));
            } else {
              lines.push(l);
            }
          }
        }

        const lineHeightMm = doc.getTextDimensions('M').h * 1.25;
        const totalTextHeight = lines.length * lineHeightMm;

        let startY = y + cellPadding + lineHeightMm * 0.8;
        if (alignV === 'middle') {
          startY = y + (h - totalTextHeight) / 2 + lineHeightMm * 0.8;
        } else if (alignV === 'bottom') {
          startY = y + h - cellPadding - totalTextHeight + lineHeightMm * 0.8;
        }

        const drawOpts = (curY: number): ArabicDrawOptions => ({
          baselineY: curY,
          cellX: x,
          cellW: w,
          padding: cellPadding,
          align: alignH === 'center' ? 'center' : alignH === 'right' ? 'right' : 'left',
          fontPt,
          bold: isBold,
          color: textColor,
        });

        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          const curY = startY + i * lineHeightMm;

          if (curY > y + h - 0.5) break; // Don't overflow out of cell boundary

          if (plate) {
            // Letters are drawn left -> right in the stored order (or reversed if PLATE_REVERSE_LETTERS).
            const letters = PLATE_REVERSE_LETTERS ? [...plate.letters].reverse() : plate.letters;
            const pieces: string[] = [];
            if (plate.digits && PLATE_DIGITS_ON_LEFT) pieces.push(plate.digits);
            pieces.push(...letters);
            if (plate.digits && !PLATE_DIGITS_ON_LEFT) pieces.push(plate.digits);
            drawCanvasPieces(doc, pieces, 'ltr', drawOpts(curY));
            continue;
          }

          if (hasArabic) {
            if (!lineText.trim()) continue;
            drawCanvasPieces(doc, [lineText], 'rtl', drawOpts(curY));
            continue;
          }

          if (alignH === 'center') {
            doc.text(lineText, x + w / 2, curY, { align: 'center' });
          } else if (alignH === 'right') {
            doc.text(lineText, x + w - cellPadding, curY, { align: 'right' });
          } else {
            doc.text(lineText, x + cellPadding, curY, { align: 'left' });
          }
        }
      }
    }
  }

  const pdfArrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  const dataUrl = doc.output('dataurlstring');
  const base64 = dataUrl.split(',')[1] || '';

  return {
    blob,
    base64,
    dataUrl,
    fileName,
  };
}