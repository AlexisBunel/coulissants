import { accessoires } from "../data/accessories";

export const AccessoriesCalculator = {
  compute(cfg = {}) {
    const range = (cfg.range || "").toString().toUpperCase();
    const railType = cfg.rail === "simple" ? "simple" : "double";
    const tick = normTick(cfg.tick);
    const leaves = clampInt(cfg.leavesCount, 1);
    const width = clampInt(cfg.width, 0);

    const absorber = cfg.absorber || {};
    const fram = clampInt(absorber.fram, 0);
    const freco = clampInt(absorber.freco, 0);
    const frlamelle = clampInt(absorber.frlamelle, 0);

    const colors = cfg.colors || {};
    const seal = normColor(colors.seal);
    const brushes = normColor(colors.brushes);
    const pglass = normColor(colors.pglass);

    const L = cfg.lengths || {};
    const handleLen = clampInt(L.handleLen, 0);
    const topTraverseLen = clampInt(L.topTraverseLen, 0);
    const tiQty = clampInt(L.tiQty, 0);
    const tiLen = clampInt(L.tiLen, 0);
    const cornerLen = clampInt(L.cornerLen, 0);

    const list = [];

    /* ------------------------------ Roues / Cales ------------------------------ */
    if (range === "82" || range === "96") {
      push(list, "KITROUPRO", { qty: leaves, role: "roue" });
      if (tick === "16") push(list, "CALE16-19", { qty: leaves, role: "cale" });
    }
    if (range === "96CA") {
      push(list, "ROUTHB52", { qty: leaves * 2, role: "roue" });
    }

    /* ---------------------------------- Freins --------------------------------- */
    if (range === "82") {
      if (fram > 0) push(list, "FR82", { qty: fram, role: "frein" });
      if (freco > 0) push(list, "FR82E", { qty: freco, role: "frein" });
      if (frlamelle > 0) {
        push(list, "FREIN", { qty: frlamelle, role: "frein" });
        push(list, "FREINENROB", { qty: frlamelle, role: "frein" });
      }
    }
    if (range === "96") {
      if (fram > 0) {
        push(list, tick === "16" ? "FR96-16" : "FR96", {
          qty: fram,
          role: "frein",
        });
      }
      if (frlamelle > 0) {
        push(list, "FREIN", { qty: frlamelle, role: "frein" });
        push(list, "FREINENROB", { qty: frlamelle, role: "frein" });
      }
    }
    if (range === "96CA") {
      if (fram > 0) push(list, "FRBASEO", { qty: fram, role: "frein" });
      if (frlamelle > 0) {
        push(list, "FREIN", { qty: frlamelle, role: "frein" });
        push(list, "FREINENROB", { qty: frlamelle, role: "frein" });
      }
    }

    /* ----------------------- Guides haut + Antidéraillement -------------------- */
    if (range === "82") {
      const qty = Math.max(0, (leaves - (fram + freco)) * 2);
      if (qty > 0) push(list, "GUIDHAUT82CN", { qty, role: "guide" });
    }
    if (range === "96") {
      const qty = Math.max(0, (leaves - fram) * 2);
      if (qty > 0)
        push(list, tick === "16" ? "GUIDHAUT16" : "GUIDHAUT96", {
          qty,
          role: "guide",
        });
    }
    if (range === "96CA") {
      const qtyGuide = leaves + Math.max(0, leaves - fram);
      if (qtyGuide > 0) {
        push(list, "GUIDHAUTBASEO", { qty: qtyGuide, role: "guide" });
        push(list, "ANTIDERAIL1", { qty: qtyGuide, role: "antideraillement" });
      }
    }

    /* ----------------------- Gamme 96 : Joints & Balais ------------------------ */
    if (range === "96") {
      {
        const { ref, finish } = mapFinishRef("JBUT", seal, {
          Noir: "JBUTNO",
          Gris: "JBUTNO",
        });
        const len = railType === "simple" ? width * leaves * 2 : width;
        if (len > 0) {
          push(list, ref, {
            qty: 1,
            role: "joint",
            designation: "Joint de butée",
            length: len,
            finishLabel: finish,
          });
        }
      }

      {
        const { ref, finish } = mapFinishRef("JB48/1050", brushes, {
          Noir: "JB48/1050NO",
          Gris: "JB48/1050",
        });
        if (cornerLen > 0 && leaves > 0) {
          push(list, ref, {
            qty: leaves,
            role: "balai",
            designation: "Balai anti-poissière",
            length: cornerLen,
            finishLabel: finish,
          });
        }
      }

      {
        const { ref, finish } = mapFinishRef("JB48/500", brushes, {
          Noir: "JB48/500NO",
          Gris: "JB48/500",
        });
        if (handleLen > 0 && leaves > 0) {
          push(list, ref, {
            qty: leaves * 2,
            role: "balai",
            designation: "Balai de côté",
            length: handleLen,
            finishLabel: finish,
          });
        }
      }
    }

    /* ---------------- Gamme 96CA : Joints / Parclose / Balais ------------------ */
    if (range === "96CA") {
      {
        const { ref, finish } = mapFinishRef("JBUT", seal, {
          Noir: "JBUTNO",
          Gris: "JBUTNO",
        });
        const len = railType === "simple" ? width * leaves * 2 : width;
        if (len > 0)
          push(list, ref, {
            qty: 1,
            role: "joint",
            designation: "Joint de butée",
            length: len,
            finishLabel: finish,
          });

        if (handleLen > 0 && leaves > 0)
          push(list, ref, {
            qty: leaves * 2,
            role: "joint",
            designation: "Joint de butée",
            length: handleLen,
            finishLabel: finish,
          });
      }

      // Profils de vitrage selon tick
      if (tick === "6-8" || tick === "10-12") {
        const base = tick === "6-8" ? "PVITRAGE" : "PVITRAGE12";
        const { ref, finish } = mapFinishRef(base, pglass, {
          Noir: base + "NO",
          Translucide: base,
        });

        // 1) le long des poignées (2 par vantail)
        if (handleLen > 0 && leaves > 0)
          push(list, ref, {
            qty: leaves * 2,
            role: "joint",
            designation:
              tick === "6-8"
                ? "Profil de vitrage 6-8"
                : "Profil de vitrage 10-12",
            length: handleLen,
            finishLabel: finish,
          });

        // 2) en haut (2 par vantail) – longueur = topTraverseLen
        if (topTraverseLen > 0 && leaves > 0)
          push(list, ref, {
            qty: leaves * 2,
            role: "joint",
            designation:
              tick === "6-8"
                ? "Profil de vitrage 6-8"
                : "Profil de vitrage 10-12",
            length: topTraverseLen,
            finishLabel: finish,
          });

        // 3) traverses intermédiaires (tiQty x tiLen)
        if (tiQty > 0 && tiLen > 0)
          push(list, ref, {
            qty: tiQty,
            role: "joint",
            designation:
              tick === "6-8"
                ? "Profil de vitrage 6-8"
                : "Profil de vitrage 10-12",
            length: tiLen,
            finishLabel: finish,
          });
      }
    }

    /* -------------- Capots (96 & 96CA) — uniquement rail simple ---------------- */
    if ((range === "96" || range === "96CA") && railType === "simple") {
      push(list, "CAPOTRH50", {
        qty: 2,
        role: "capot",
        designation: "Capot monorail haut",
        finishLabel: "Noir",
      });
      push(list, "CAPOTRB48", {
        qty: 2,
        role: "capot",
        designation: "Capot monorail bas",
        finishLabel: "Noir",
      });
    }

    /* -------------- Equerres de suspension  — uniquement rail simple ---------------- */
    if (railType === "simple") {
      push(list, "EQUERSUSPM", {
        qty: Math.ceil((width * leaves * 2) / 500),
        role: "equerre",
        designation: "Équerre de suspension + vis",
        finishLabel: "Noir",
      });
    }

    const byType = groupByType(list);
    return {
      list,
      byType,
      meta: {
        range,
        tick,
        rail: railType,
        leaves,
        absorber: { fram, freco, frlamelle },
        colors: { seal, brushes },
        lengths: { handleLen, topTraverseLen, cornerLen, tiQty, tiLen },
      },
    };
  },
};

/* -------------------------------- Helpers -------------------------------- */

function normTick(t) {
  const v = String(t ?? "")
    .trim()
    .replace(/\s/g, "");
  if (v === "6" || v === "8" || v === "6-8") return "6-8";
  if (v === "12" || v === "10-12") return "10-12";
  if (v === "16") return "16";
  if (v === "19") return "19";
  return v || "";
}
function normColor(s) {
  return String(s ?? "").trim();
}
function clampInt(n, min = 0) {
  const v = Math.floor(Number(n) || 0);
  return isFinite(v) ? Math.max(min, v) : min;
}

function push(acc, reference, opt = {}) {
  const { qty = 0, role, designation, length, finishLabel } = opt;
  if (!qty) return;
  const meta = accessoires.find((a) => a.reference === reference);
  acc.push({
    ref: reference,
    designation: designation ?? meta?.designation ?? "",
    type: meta?.type || role || "",
    qty: clampInt(qty, 0),
    length: clampInt(length, 0) || undefined,
    finishLabel: finishLabel || undefined,
  });
}

function mapFinishRef(globalRef, color, mapping) {
  const key = color || "";
  const ref = mapping[key] || globalRef;
  const finish = key || undefined;
  return { ref, finish };
}

function groupByType(list) {
  const out = {};
  for (const it of list) (out[it.type || "autre"] ||= []).push(it);
  return out;
}
