import { jsPDF } from "jspdf";
import { captureFromBoxAsync } from "../three/capture";

/** Convertit une ressource du dossier /public en DataURL (logo, etc.) */
async function asPngDataURL(publicPath) {
  const res = await fetch(publicPath);
  const blob = await res.blob(); // image/webp, png, etc.

  // Convertir en PNG via un canvas
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(bmp, 0, 0);
  return c.toDataURL("image/png");
}

async function sectionHeader(
  doc,
  { logo, title, marginX = 20, top = 18, logoW = 110, lineY = 85 }
) {
  const pageW = doc.internal.pageSize.width;

  // Logo (converti en PNG pour jsPDF)
  try {
    const logoData = await asPngDataURL(logo);
    const img = new Image();
    await new Promise((r) => {
      img.onload = r;
      img.src = logoData;
    });
    const ratio = img.height / img.width;
    doc.addImage(logoData, "PNG", marginX, top, logoW, logoW * ratio);
  } catch {}

  // Titre
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  const tW = doc.getTextWidth(title);
  doc.text(title, (pageW - tW) / 2, top + 35);

  // Date à droite
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  const now = new Date();
  const meta = `Le ${now.toLocaleDateString(
    "fr-FR"
  )} à ${now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  doc.text(meta, pageW - marginX - doc.getTextWidth(meta), top + 60);

  // Trait séparateur
  doc.setDrawColor(0);
  doc.setLineWidth(3);
  doc.line(marginX, lineY, pageW - marginX, lineY);

  return lineY;
}

export async function sectionConfig(
  pageW,
  afterHeaderY,
  dims,
  doc,
  y,
  pName,
  totalHeight,
  totalWidth,
  leavesCount
) {
  const shot = await captureFromBoxAsync({
    width: dims.width, // mm
    height: dims.height, // mm
    unitScale: dims.unitScale ?? 0.001, // mm -> m
    padding: 1.5,
    azimuthDeg: 20,
    elevationDeg: 12,
    distanceScale: 0.8,
    panRight: 0.06,
    panDown: 0.04,
  });

  const marginX = 20;
  const contentW = pageW - marginX * 2;

  y = afterHeaderY + 20;

  if (shot && shot.dataURL) {
    const { dataURL, width: cw, height: ch } = shot;

    // largeur max = 1/2 de la zone imprimable
    const maxW = Math.floor(contentW / 2);
    const scale = Math.min(maxW / cw, 1); // pas d'upscale
    const imgW = Math.floor(cw * scale);
    const imgH = Math.floor(ch * scale);

    // Image (gauche)
    const imgX = marginX;
    const imgY = y;
    doc.addImage(dataURL, "PNG", imgX, imgY, imgW, imgH);

    // --------- Colonne d'infos (droite) ---------
    const gap = 12; // espace entre image et colonne
    const cardX = marginX + maxW + gap; // début de la carte
    const cardY = y; // alignée sur le haut de l’image
    const cardW = contentW - (maxW + gap); // largeur restante
    const cardMaxH = imgH; // ne pas dépasser la hauteur de l’image

    // Style carte
    const headerH = 15; // hauteur d'en-tête
    const pad = 8; // padding interne
    const radius = 2; // coins arrondis
    const strokeW = 0.4; // épaisseur bordure

    // Helpers
    const mm = (v) => (v == null ? "-" : `${Math.round(v)} mm`);
    const safe = (v) => (v == null || v === "" ? "-" : String(v));

    // Données
    const name = pName;
    const hMm = totalHeight;
    const wMm = totalWidth;
    const leaves = leavesCount;

    // Contenu
    const lines = [
      `Projet : ${name}`,
      `Dimension :`,
      `  • Hauteur : ${mm(hMm)}`,
      `  • Largeur : ${mm(wMm)}`,
      `Nombre de vantaux : ${safe(leaves)}`,
    ];

    // Préparation texte auto-ajusté dans la carte
    let fontSize = 12;
    const minFont = 8;
    const bodyW = cardW - pad * 2; // largeur de texte utile
    const bodyMaxH = cardMaxH - headerH - pad * 2; // hauteur utile sous l’en-tête

    doc.setFont("Helvetica", "normal");

    function measure(fs) {
      doc.setFontSize(fs);
      const wrapped = lines.flatMap((ln) => doc.splitTextToSize(ln, bodyW));
      const lineH = fs * 0.42 + 10; // interligne doux
      const totalH = wrapped.length * lineH;
      return { wrapped, lineH, totalH };
    }

    let wrappedInfo = null;
    let lineH = 0;

    while (fontSize >= minFont) {
      const m = measure(fontSize);
      if (m.totalH <= bodyMaxH) {
        wrappedInfo = m.wrapped;
        lineH = m.lineH;
        break;
      }
      fontSize -= 1;
    }

    // Si ça dépasse encore, tronque proprement
    if (!wrappedInfo) {
      const m = measure(minFont);
      let acc = [];
      let h = 0;
      for (const ln of m.wrapped) {
        if (h + m.lineH > bodyMaxH) break;
        acc.push(ln);
        h += m.lineH;
      }
      if (acc.length < m.wrapped.length) {
        const last = acc.pop() ?? "";
        acc.push(last.replace(/\s*$/, "") + " …");
      }
      wrappedInfo = acc;
      lineH = m.lineH;
      fontSize = minFont;
    }

    // Hauteur réelle de contenu pour dessiner la carte au plus juste
    const contentH = Math.min(bodyMaxH, wrappedInfo.length * lineH);
    const cardH = headerH + pad * 2 + contentH + 8;

    // Dessin de la carte
    doc.setLineWidth(strokeW);
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    // Corps (fond blanc)
    doc.roundedRect(cardX, cardY, cardW, cardH, radius, radius, "FD");

    // En-tête (fond noir)
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(cardX, cardY, cardW, headerH, radius, radius, "F");

    // Titre en-tête
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(fontSize + 1);
    const title = "Informations";
    const tAscent = fontSize + 1;
    doc.text(title, cardX + pad, cardY + headerH / 2 + tAscent * 0.35);

    // Corps : texte
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(fontSize);

    let cursorY = cardY + headerH + pad;
    for (const ln of wrappedInfo) {
      if (cursorY + lineH > cardY + cardH - pad + 0.01) break;
      doc.text(ln, cardX + pad, cursorY + lineH);
      cursorY += lineH;
    }
    // --------------------------------------------

    y = imgY + imgH + 18; // on descend sous le bloc image+infos
  }

  return y;
}

function sectionTitle(doc, text, y) {
  const w = doc.internal.pageSize.width;
  const titleH = 16;
  doc.setFillColor(0);
  doc.rect(12, y, w - 24, titleH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  const tw = doc.getTextWidth(text);
  const baselineAdjust = doc.getFontSize() * 0.35;
  doc.text(text, 12 + (w - 24 - tw) / 2, y + titleH / 2 + baselineAdjust - 1);
  doc.setTextColor(0, 0, 0);
  return y + titleH;
}

function fitText(doc, text, maxWidth) {
  const ell = "…";
  let t = String(text ?? "");
  if (doc.getTextWidth(t) <= maxWidth) return t;
  while (t && doc.getTextWidth(t + ell) > maxWidth) t = t.slice(0, -1);
  return t + ell;
}

function drawTable(doc, { y, columns, rows, getCells, options = {} }) {
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const left = 12,
    right = pageW - 12;
  const tableW = right - left;

  const headerH = options.headerHeight ?? 18;
  const rowH = options.rowHeight ?? 18;
  const padX = options.paddingX ?? 6;
  const bottom = pageH - 40;

  // --- En-tête
  doc.setFillColor(245); // gris clair
  doc.rect(left, y, tableW, headerH, "F");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  const headBase = y + headerH / 2 + doc.getFontSize() * 0.35 - 1;

  columns.forEach((col) => {
    const label = String(col.label ?? "");
    const maxW = (col.width ?? 0) - padX * 2;
    const txt = maxW > 0 ? fitText(doc, label, maxW) : label;

    // placement horizontal selon align
    let x = col.x + padX;
    const wTxt = doc.getTextWidth(txt);
    if (col.align === "center" && col.width)
      x = col.x + col.width / 2 - wTxt / 2;
    else if (col.align === "right" && col.width)
      x = col.x + col.width - padX - wTxt;

    doc.text(txt, x, headBase);
  });

  // ligne sous l'en-tête
  doc.setDrawColor(200);
  doc.setLineWidth(0.6);
  doc.line(left, y + headerH, right, y + headerH);

  // --- Lignes
  let yRowTop = y + headerH;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);

  rows.forEach((row, i) => {
    // saut de page si besoin
    if (yRowTop + rowH > bottom) {
      doc.addPage();
      // réimprimer l'en-tête
      y = 24;
      doc.setFillColor(245);
      doc.rect(left, y, tableW, headerH, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      const headBase2 = y + headerH / 2 + doc.getFontSize() * 0.35 - 1;
      columns.forEach((col) => {
        const txt = String(col.label ?? "");
        const maxW = (col.width ?? 0) - padX * 2;
        const lab = maxW > 0 ? fitText(doc, txt, maxW) : txt;
        let x = col.x + padX;
        const wTxt = doc.getTextWidth(lab);
        if (col.align === "center" && col.width)
          x = col.x + col.width / 2 - wTxt / 2;
        else if (col.align === "right" && col.width)
          x = col.x + col.width - padX - wTxt;
        doc.text(lab, x, headBase2);
      });
      doc.setDrawColor(200);
      doc.setLineWidth(0.6);
      doc.line(left, y + headerH, right, y + headerH);

      yRowTop = y + headerH;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
    }

    // zébrage
    const fill = i % 2 === 0 ? 255 : 245;
    doc.setFillColor(fill);
    doc.rect(left, yRowTop, tableW, rowH, "F");

    // texte centré verticalement
    const base = yRowTop + rowH / 2 + doc.getFontSize() * 0.35 - 1;

    const cells = getCells(row);
    columns.forEach((col, idx) => {
      const raw = cells[idx] ?? "";
      const maxW = (col.width ?? 0) - padX * 2;
      const txt = maxW > 0 ? fitText(doc, raw, maxW) : String(raw);
      let x = col.x + padX;
      const wTxt = doc.getTextWidth(txt);

      if (col.align === "center" && col.width)
        x = col.x + col.width / 2 - wTxt / 2;
      else if (col.align === "right" && col.width)
        x = col.x + col.width - padX - wTxt;

      doc.text(txt, x, base);
    });

    yRowTop += rowH;
  });

  // ligne de fin
  doc.setDrawColor(220);
  doc.setLineWidth(0.6);
  doc.line(left, yRowTop, right, yRowTop);

  return yRowTop + 12;
}

export async function generateRecapPDF({
  renderer,
  dims,
  profileRows = [],
  accessoryRows = [],
  fillingRows = [],
  logo = "/img/logo.webp",
  title = "Portes coulissantes",
  pName,
  totalHeight,
  totalWidth,
  leavesCount,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  // --- HEADER
  const afterHeaderY = await sectionHeader(doc, { logo, title });
  let y = afterHeaderY + 230;

  y = await sectionConfig(
    pageW,
    afterHeaderY,
    dims,
    doc,
    y,
    pName,
    totalHeight,
    totalWidth,
    leavesCount
  );

  // === TABLEAU 1 : Profils (d’après ton composant Vue)
  y = sectionTitle(doc, "Profils", y);
  y = drawTable(doc, {
    y,
    columns: [
      { label: "Référence", x: 18, width: 90, align: "left" },
      { label: "Désignation", x: 150, width: 210, align: "left" },
      { label: "Finition", x: 325, width: 110, align: "left" },
      { label: "Quantité", x: 420, width: 70, align: "right" },
      { label: "Longueur", x: 515, width: 68, align: "right" },
    ],
    rows: profileRows,
    getCells: (r) => {
      const ref = String(r.ref ?? "");
      const desc = String(r.description ?? "—");
      const finish = String(r.finishLabel || r.finishCode || "—");
      const qty = String(r.qty ?? 0);
      const len = (r.length ?? 0) + " mm";
      return [ref, desc, finish, qty, len];
    },
    options: { headerHeight: 18, rowHeight: 18, paddingX: 6 },
  });

  // === TABLEAU 2 : Accessoires
  y = sectionTitle(doc, "Accessoires", y);
  y = drawTable(doc, {
    y,
    columns: [
      { label: "Référence", x: 18, width: 110, align: "left" },
      { label: "Désignation", x: 150, width: 210, align: "left" },
      { label: "Finition", x: 325, width: 110, align: "left" },
      { label: "Quantité", x: 420, width: 70, align: "right" },
      { label: "Longueur", x: 515, width: 68, align: "right" },
    ],
    rows: accessoryRows,
    getCells: (r) => {
      const ref = String(r.ref ?? "");
      const desc = String(r.designation ?? "—");
      const allowed = ["Noir", "Gris", "Translucide"];
      const finish = allowed.includes(r.finishLabel) ? r.finishLabel : "—";
      const qty = String(r.qty ?? 0);
      const len = r.length ? (r.length ?? 0) + " mm" : "—";
      return [ref, desc, finish, qty, len];
    },
    options: { headerHeight: 18, rowHeight: 18, paddingX: 6 },
  });

  // === TABLEAU 3 : Remplissages
  y = sectionTitle(doc, "Remplissages", y);
  y = drawTable(doc, {
    y,
    columns: [
      { label: "Désignation", x: 18, width: 120, align: "left" },
      { label: "Quantité", x: 150, width: 90, align: "right" },
      { label: "Dimensions", x: 300, width: 165, align: "center" },
    ],
    rows: fillingRows,
    getCells: (r) => {
      const des = String(r.description ?? r.designation ?? r.name ?? "—");
      const q = String(r.qty ?? r.quantite ?? 1);
      const dim = String(r.dim ?? r.longueur ?? r.length ?? "—");
      return [des, q, dim];
    },
    options: { headerHeight: 18, rowHeight: 18, paddingX: 6 },
  });

  // — Footer
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.line(20, pageH - 40, pageW - 20, pageH - 40);
  doc.setFontSize(10);
  const foot =
    "SEED - ZA des Estuaires, Avenue de la Pierre Vallée - 50220 POILLEY";
  doc.text(foot, (pageW - doc.getTextWidth(foot)) / 2, pageH - 22);

  // — Ouvrir dans un nouvel onglet
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
