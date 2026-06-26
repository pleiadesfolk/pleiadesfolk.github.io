/* toolkit-draw.js
 * pdf-lib drawing layer for the CCH Crisis Toolkits.
 * Requires /assets/js/pdf-lib.min.js to be loaded first.
 *
 * Template PDFs live at:
 *   /assets/pdf/template-psych.pdf
 *   /assets/pdf/template-sish.pdf
 *   /assets/pdf/template-relapse.pdf
 *
 * Templates carry all visual chrome: borders, fold/cut guides, staple marks,
 * page numbers, prompt headings, and scale bars. This script overlays only
 * the user's typed answers on top.
 *
 * ─── COORDINATE REFERENCE ─────────────────────────────────────────────────────
 * Coordinates below are panel-local mm from the reading-frame TOP-LEFT of each
 * mini-page (74.25 mm wide × 105 mm tall).
 *
 * PANEL LAYOUT (A4 landscape, 4 cols × 2 rows):
 *   Bottom row (not rotated): col 0 = p8, col 1 = p1, col 2 = p2, col 3 = p3
 *   Top row (rotated 180°):   col 0 = p7, col 1 = p6, col 2 = p5, col 3 = p4
 *
 * USER TEXT PLACEMENT in the template (leave these areas blank):
 *   Cover (p1)      — owner name       x=5,   y=82     size=7pt
 *   Scale (p2)      — label for row n  x=18.5, y=20+n×7.4  (n=0..10)  size=5.5pt
 *                     answer column: x=17.4→66.7mm, bars 7.4mm tall starting at y=16.3
 *   Prompts (p3–7)  — free text        x=5,   y=36     wraps at x=69.25, stops at y=100
 *   Back cover (p8) — (nothing; all template)
 */

// ─── Layout constants (mm) ────────────────────────────────────────────────────
const TK = { W: 74.25, H: 105, M: 5 };
const PT = 72 / 25.4; // mm → points

// ─── Imposition ───────────────────────────────────────────────────────────────
// Confirmed from .ai file: bottom row 8,1,2,3 — top row (rotated 180°) 7,6,5,4
const IMPOSITION = {
  1: { col:1, row:1, rotated:false },
  2: { col:2, row:1, rotated:false },
  3: { col:3, row:1, rotated:false },
  4: { col:3, row:0, rotated:true  },
  5: { col:2, row:0, rotated:true  },
  6: { col:1, row:0, rotated:true  },
  7: { col:0, row:0, rotated:true  },
  8: { col:0, row:1, rotated:false },
};

// ─── Toolkit definitions ──────────────────────────────────────────────────────
const TOOLKITS = {
  psych: {
    templatePath: '/assets/pdf/template-psych.pdf',
    scalePage:    2,
    promptPages:  [3, 4, 5, 6, 7],
  },
  sish: {
    templatePath: '/assets/pdf/template-sish.pdf',
    scalePage:    2,
    promptPages:  [3, 4, 5, 6, 7],
  },
  relapse: {
    templatePath: '/assets/pdf/template-relapse.pdf',
    scalePage:    null,
    promptPages:  [2, 3, 4, 5, 6, 7],
  },
};

// ─── Panel coordinate transform (pdf-lib uses points, y-up from page bottom) ─
function panelTF(pageNum) {
  const { col, row, rotated } = IMPOSITION[pageNum];
  return { col, row, r: rotated };
}

// Panel-local mm (reading frame, y-down from top-left) → pdf-lib page points
function _pdfX(tf, lx) {
  return tf.r
    ? ((tf.col + 1) * TK.W - lx) * PT
    : (tf.col * TK.W + lx) * PT;
}
function _pdfY(tf, ly) {
  return tf.r
    ? (TK.H + ly) * PT         // row 0 (top half): panel bottom is TK.H from page bottom
    : (TK.H - ly) * PT;        // row 1 (bottom half): panel bottom is 0 from page bottom
}

// ─── Color helper ─────────────────────────────────────────────────────────────
function rgb255(r, g, b) { return PDFLib.rgb(r / 255, g / 255, b / 255); }

const COLOR = {
  text: rgb255(35, 31, 32),
  link: rgb255(60, 80, 160),
};

// Splits any word longer than maxChars into hyphenated chunks, preserving \n.
function breakLongWords(text, maxChars) {
  return String(text).split('\n').map(para =>
    para.split(' ').map(word => {
      if (word.length <= maxChars) return word;
      const parts = [];
      for (let i = 0; i < word.length; i += maxChars) {
        const chunk = word.slice(i, i + maxChars);
        parts.push(i + maxChars < word.length ? chunk + '-' : chunk);
      }
      return parts.join(' ');
    }).join(' ')
  ).join('\n');
}

// ─── Word-wrap helper ─────────────────────────────────────────────────────────
// Returns an array of strings that each fit within maxWidthPt at the given size.
// Respects \n line breaks in the source text.
function wrapText(font, text, size, maxWidthPt) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidthPt) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}

// ─── Text drawing ─────────────────────────────────────────────────────────────
// Draw a single string at panel-local (lx, ly). For rotated panels the text is
// drawn at 180° so it reads correctly after the physical flip.
// align: 'left' (default) or 'right'
function drawText(page, tf, font, str, lx, ly, size, color, align) {
  if (!str) return;
  const w  = font.widthOfTextAtSize(str, size);
  let x = _pdfX(tf, lx);
  const y = _pdfY(tf, ly);

  if (tf.r) {
    // With 180° rotation text flows LEFT from anchor; right-align: shift right by w
    if (align === 'right') x += w;
    page.drawText(str, { x, y, size, font, color: color || COLOR.text, rotate: PDFLib.degrees(180) });
  } else {
    // Standard y-down reading frame: left-align at lx; right-align: shift left by w
    if (align === 'right') x -= w;
    page.drawText(str, { x, y, size, font, color: color || COLOR.text });
  }
}

// Draw multiple lines of text, advancing downward in the reading frame.
// lineHeightPt: spacing between baselines in points.
function drawLines(page, tf, font, lines, lx, ly, size, color, lineHeightPt) {
  const lhMm = lineHeightPt / PT;
  lines.forEach((line, i) => {
    if (line !== undefined && line !== '') {
      drawText(page, tf, font, line, lx, ly + i * lhMm, size, color);
    }
  });
}

// ─── Font loading ─────────────────────────────────────────────────────────────
async function tryEmbedFont(pdfDoc, path) {
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    return await pdfDoc.embedFont(await r.arrayBuffer());
  } catch (_) { return null; }
}

async function loadFonts(pdfDoc) {
  const mono  = '/assets/gitbook/fonts/IBM_Plex_Mono/IBMPlexMono-';
  const story = '/assets/gitbook/fonts/Story_Script/StoryScript-Regular.ttf';
  const [
    StoryScript,
    PlexLight,
    PlexLightItalic,
    PlexRegular,
    PlexMedium,
    PlexMediumItalic,
  ] = await Promise.all([
    tryEmbedFont(pdfDoc, story),
    tryEmbedFont(pdfDoc, mono + 'Light.ttf'),
    tryEmbedFont(pdfDoc, mono + 'LightItalic.ttf'),
    tryEmbedFont(pdfDoc, mono + 'Regular.ttf'),
    tryEmbedFont(pdfDoc, mono + 'Medium.ttf'),
    tryEmbedFont(pdfDoc, mono + 'MediumItalic.ttf'),
  ]);
  // Fall back to a standard font if a TTF wasn't found
  const fallback = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  return {
    story:        StoryScript      || fallback,
    light:        PlexLight        || fallback,
    lightItalic:  PlexLightItalic  || fallback,
    regular:      PlexRegular      || fallback,
    bold:         PlexMedium       || fallback,
    boldItalic:   PlexMediumItalic || fallback,
  };
}

// ─── Cover overlay (page 1): owner name only ──────────────────────────────────
const OWNER_NAME_X  = 9.5;     // mm from panel left
const OWNER_NAME_Y  = 85;    // mm from panel top
const OWNER_NAME_PT = 12;

function drawCoverOverlay(page, fonts, ownerName, tf) {
  if (!ownerName || !ownerName.trim()) return;
  const maxWidthPt = (TK.W - OWNER_NAME_X - TK.M) * PT;
  const lines = wrapText(fonts.regular, ownerName.trim(), OWNER_NAME_PT, maxWidthPt);
  drawLines(page, tf, fonts.regular, lines, OWNER_NAME_X, OWNER_NAME_Y,
            OWNER_NAME_PT, COLOR.text, OWNER_NAME_PT * 1.25);
}

// ─── Scale overlay (page 2): user labels for each level 0–10 ─────────────────
const SCALE_START_Y   = 15.0;  // mm from panel top to first bar's top edge
const SCALE_ROW_H     = 7.4;   // mm between bars
const SCALE_LABEL_X   = 18.5;  // mm: label starts after the number + color column
const SCALE_LABEL_W   = 45.6;  // mm: max label width (right padding ~5mm)
const SCALE_LABEL_PT  = 7.5;

function drawScaleOverlay(page, fonts, scaleLabels, tf) {
  if (!scaleLabels) return;
  scaleLabels.forEach((label, n) => {
    if (!label || !label.trim()) return;
    const ly    = SCALE_START_Y + n * SCALE_ROW_H + SCALE_ROW_H * 0.5;
    const lines   = wrapText(fonts.regular, breakLongWords(label.trim(), 34), SCALE_LABEL_PT, SCALE_LABEL_W * PT);
    const maxRows = Math.floor(SCALE_ROW_H / (SCALE_LABEL_PT * 1.25 / PT));
    drawLines(page, tf, fonts.regular, lines.slice(0, maxRows),
              SCALE_LABEL_X, ly, SCALE_LABEL_PT, COLOR.text, SCALE_LABEL_PT * 1.25);
  });
}

// ─── Prompt overlay (pages 3–7 / 2–7): user free text ────────────────────────
const PROMPT_START_X  = 7.5;  // mm from panel left (TK.M - 2.5)
const PROMPT_START_Y  = 36;   // mm from panel top where user text begins
const PROMPT_MAX_Y    = 95;   // mm — stop here to avoid running off-panel
const PROMPT_FONT_PT  = 8;

function drawPromptOverlay(page, fonts, userText, tf) {
  if (!userText || !userText.trim()) return;

  const maxWidthPt = 59 * PT;
  const lineHeight = PROMPT_FONT_PT * 1.25;  // points
  const lines      = wrapText(fonts.regular, breakLongWords(userText.trim(), 45), PROMPT_FONT_PT, maxWidthPt);
  const maxLines   = Math.floor((PROMPT_MAX_Y - PROMPT_START_Y) / (lineHeight / PT));
  drawLines(page, tf, fonts.regular, lines.slice(0, maxLines),
            PROMPT_START_X, PROMPT_START_Y, PROMPT_FONT_PT, COLOR.text, lineHeight);
}

// ─── Main export ──────────────────────────────────────────────────────────────
// data = { ownerName: string, scaleLabels: string[11], pages: { [n]: string } }
// Opens the generated PDF as a blob URL in a new tab.
async function generateZine(toolkitKey, data) {
  const { PDFDocument } = PDFLib;
  const toolkit = TOOLKITS[toolkitKey];

  // Load template
  let templateBytes;
  try {
    const res = await fetch(toolkit.templatePath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    templateBytes = await res.arrayBuffer();
  } catch (err) {
    alert(`Could not load template PDF (${toolkit.templatePath}).\n${err.message}\n\nDesign and export the template first, then try again.`);
    return;
  }

  const pdfDoc = await PDFDocument.load(templateBytes);
  const fonts  = await loadFonts(pdfDoc);
  const page   = pdfDoc.getPages()[0];

  // Cover — owner name
  drawCoverOverlay(page, fonts, data.ownerName || '', panelTF(1));

  // Scale labels
  if (toolkit.scalePage != null) {
    drawScaleOverlay(page, fonts, data.scaleLabels || [], panelTF(toolkit.scalePage));
  }

  // Prompt pages
  toolkit.promptPages.forEach(n => {
    const userText = data.pages && data.pages[n] ? data.pages[n] : '';
    drawPromptOverlay(page, fonts, userText, panelTF(n));
  });

  const bytes = await pdfDoc.save();
  const blob  = new Blob([bytes], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}
