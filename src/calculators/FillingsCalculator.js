// src/calculators/FillingsCalculator.js
/**
 * Calcule les dédits des remplissages (largeur & hauteurs) par vantail.
 * + Normalisation "uniforme": si les traverses sont (quasi) équidistantes,
 *   on égalise les hauteurs pour obtenir des pièces identiques.
 *
 * Entrées:
 *  - range: '96' | '96CA' | (autres => traité comme '96')
 *  - height: hauteur totale du panneau (mm)
 *  - fillingWidth: largeur utile par vantail (mm)
 *  - traverseRef: 'TI28' | 'TI37' | 'TI16' | 'TI19' ... (utile pour 96CA)
 *  - tick: '16' | '19' | '6-8' | '12' ... (conservé pour évolutions)
 *  - leavesCount: nombre de vantaux
 *  - heightsByLeaf: { '1': number[], '2': number[], ... } centres TI (mm, bas -> haut)
 *  - uniform?: boolean  // facultatif: force l'égalisation
 *
 * Sortie:
 *  {
 *    perLeaf: {
 *      '1': {
 *        width: { raw, cut },
 *        heights: { bottom: number, between: number[], top: number|null }
 *      },
 *      ...
 *    },
 *    meta: { range, traverseRef, tick, normalized: boolean }
 *  }
 */
export const FillingsCalculator = {
  compute(cfg = {}) {
    const range = String(cfg.range || "").toUpperCase();
    const height = toNum(cfg.height, 0);
    const fillingWidth = toNum(cfg.fillingWidth, 0);
    const traverseRef = String(cfg.traverseRef || "");
    const tick = String(cfg.tick || "");
    const leaves = Math.max(1, Math.floor(Number(cfg.leavesCount) || 1));
    const heightsByLeaf = normalizeHeightsByLeaf(cfg.heightsByLeaf, leaves);
    const forceUniform = !!cfg.uniform;

    let anyNormalized = false;
    const perLeaf = {};

    for (let i = 1; i <= leaves; i++) {
      const key = String(i);
      const centers = (heightsByLeaf[key] || []).slice().sort((a, b) => a - b);
      const n = centers.length; // nb de traverses sur ce vantail

      // LARGEUR : pas de dédit horizontal dans tes règles → inchangée
      const width = { raw: fillingWidth, cut: fillingWidth };

      // 1) Calcul bruts selon la gamme
      const heights =
        range === "96CA"
          ? computeHeights96CA({ height, centers, traverseRef })
          : computeHeights96({ height, centers });

      // 2) Égalisation si répartition uniforme (ou forcée)
      //    - on estime l'uniformité via les espacements centre-à-centre,
      //      tolérance par défaut: 1 mm (modifiable).
      if (n > 0 && (forceUniform || isNearlyUniform(centers, 1))) {
        const k = n + 1; // nb de cases
        const total = totalAvailableHeight({ range, height, n, traverseRef });
        const target = Math.floor(total / k); // valeur idéale par case
        const step = range === "96CA" ? 0.5 : 1.0; // granularité d'affichage attendue

        // on garde la somme exacte en conservant "target" non arrondi,
        // l'affichage arrondira au besoin (0,1 ou 0,5 mm).
        const equal = roundToStep(target, step, /*soft=*/ true);

        const equalized = {
          bottom: equal,
          between: Array(Math.max(0, k - 2)).fill(equal),
          top: equal,
        };

        // Remplace uniquement si l'écart au target est faible (sécurité)
        if (isCloseToEqualized(heights, equalized, step)) {
          Object.assign(heights, equalized);
          anyNormalized = true;
        }
      }

      perLeaf[key] = { width, heights };
    }

    unifyCloseHeights(perLeaf, 1);

    return {
      perLeaf,
      meta: { range, traverseRef, tick, normalized: anyNormalized },
    };
  },
};

/* ----------------------------- RÈGLES BRUTES ----------------------------- */
/** Gamme 96 (tes formules) */
function computeHeights96({ height, centers }) {
  const n = centers.length;
  if (n === 0) {
    const H = height - 50;
    return { bottom: clip0(H), between: [], top: null };
  }

  const y1 = centers[0];
  const yn = centers[n - 1];

  const bottom = y1 - 1;

  const between = [];
  for (let k = 1; k < n; k++) {
    const yi = centers[k];
    const yim1 = centers[k - 1];
    between.push(yi - yim1 - 2);
  }

  const top = height - 50 - yn - 1;

  return {
    bottom: clip0(bottom),
    between: between.map(clip0),
    top: clip0(top),
  };
}

/** Gamme 96CA (tes formules) */
function computeHeights96CA({ height, centers, traverseRef }) {
  const n = centers.length;

  // Sans traverse
  if (n === 0) {
    const H = height - 54 - 120;
    return { bottom: clip0(H), between: [], top: null };
  }

  // TI28 vs TI37
  const isTI37 = /^TI37$/i.test(traverseRef);
  const addBottom = isTI37 ? 45 + 9.5 : 45 + 5; // 54.5 / 50
  const addBetween = isTI37 ? 19 : 10;
  const addTop = isTI37 ? 55 + 20 + 9.5 : 55 + 20 + 5; // 84.5 / 80

  const y1 = centers[0];
  const yn = centers[n - 1];

  const bottom = y1 - addBottom;

  const between = [];
  for (let k = 1; k < n; k++) {
    const yi = centers[k];
    const yim1 = centers[k - 1];
    between.push(yi - yim1 - addBetween);
  }

  const top = height - addTop - yn;

  return {
    bottom: clip0(bottom),
    between: between.map(clip0),
    top: clip0(top),
  };
}

/* ------------------------- TOTAUX THÉORIQUES (ΣH) ------------------------ */
/** Total dispo pour 96: ΣH = height - 50 - 2*n  (n = nb de traverses) */
function totalAvailable96(height, n) {
  return height - 50 - 2 * n;
}
/**
 * Total dispo pour 96CA:
 *  TI28: height - (130 + 10*(n-1))
 *  TI37: height - (139 + 19*(n-1))
 */
function totalAvailable96CA(height, n, traverseRef) {
  const isTI37 = /^TI37$/i.test(traverseRef);
  const base = isTI37 ? 139 : 130;
  const step = isTI37 ? 19 : 10;
  return height - (base + step * (n - 1));
}
function totalAvailableHeight({ range, height, n, traverseRef }) {
  return range === "96CA"
    ? totalAvailable96CA(height, n, traverseRef)
    : totalAvailable96(height, n);
}

/* ----------------------------- UNIFORMITÉ & EQ --------------------------- */
/** centres quasi-uniformes si les espacements diffèrent de ≤ tol (mm) */
function isNearlyUniform(centers, tol = 1) {
  if (!Array.isArray(centers) || centers.length < 2) return false;
  const gaps = [];
  for (let i = 1; i < centers.length; i++)
    gaps.push(centers[i] - centers[i - 1]);
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  return max - min <= tol;
}

/** petit helper: arrondit facultativement à un pas (0.5 pour 96CA, 1 pour 96) */
function roundToStep(v, step, soft = true) {
  if (!soft) return Math.round(v / step) * step;
  // soft: ne contraint pas si v est déjà très proche d'un multiple
  const q = Math.round(v / step) * step;
  return Math.abs(q - v) <= step * 0.01 ? q : v;
}

/** vérifie qu'on est "proche" de l'égalisation visée (pour éviter les faux positifs) */
function isCloseToEqualized(heights, equalized, step) {
  const all = [];
  if (heights.bottom != null) all.push(heights.bottom);
  if (Array.isArray(heights.between)) all.push(...heights.between);
  if (heights.top != null) all.push(heights.top);

  const target = equalized.bottom; // toutes égales
  const tol = Math.max(0.5 * step, 0.5); // tolérance ≥ 0.5 mm
  return all.every((h) => Math.abs(h - target) <= 2 + tol); // cas 96: 510/511/512 passe
}

/* -------------------------------- HELPERS -------------------------------- */
function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clip0(v) {
  const n = Number(v) || 0;
  return n < 0 ? 0 : n;
}
function normalizeHeightsByLeaf(input, leaves) {
  const out = {};
  if (input && typeof input === "object") {
    for (let i = 1; i <= leaves; i++) {
      const key = String(i);
      const arr = Array.isArray(input[key]) ? input[key] : [];
      out[key] = arr.map(toNum);
    }
    return out;
  }
  for (let i = 1; i <= leaves; i++) out[String(i)] = [];
  return out;
}

function unifyCloseHeights(perLeaf, tol = 1) {
  // Collecte de toutes les hauteurs entières (>0)
  const all = [];
  for (const leaf of Object.values(perLeaf)) {
    const H = leaf?.heights;
    if (!H) continue;
    if (H.bottom != null) all.push(H.bottom);
    if (Array.isArray(H.between)) all.push(...H.between);
    if (H.top != null) all.push(H.top);
  }
  const keys = Array.from(new Set(all.filter((v) => v > 0))).sort(
    (a, b) => a - b
  );

  // Clusters de valeurs proches (écart <= tol)
  const clusters = [];
  let cur = [];
  for (const k of keys) {
    if (!cur.length || k - cur[cur.length - 1] <= tol) cur.push(k);
    else {
      clusters.push(cur);
      cur = [k];
    }
  }
  if (cur.length) clusters.push(cur);

  // Représentant = MIN du cluster (ex. {198,199} -> 198)
  const rep = new Map();
  for (const c of clusters) {
    const r = Math.min(...c);
    for (const k of c) rep.set(k, r);
  }

  // Remplacement dans perLeaf
  for (const leaf of Object.values(perLeaf)) {
    const H = leaf?.heights;
    if (!H) continue;
    if (H.bottom != null) H.bottom = rep.get(H.bottom) ?? H.bottom;
    if (Array.isArray(H.between))
      H.between = H.between.map((v) => rep.get(v) ?? v);
    if (H.top != null) H.top = rep.get(H.top) ?? H.top;
  }
}
