// src/calculators/FillingsCalculator.js

/**
 * Calcule les dédits des remplissages (largeur & hauteurs) par vantail.
 *
 * Entrées attendues:
 *  - range: '96' | '96CA' | (autres => traité comme '96')
 *  - height: hauteur totale du panneau (mm)
 *  - fillingWidth: largeur utile par vantail (mm) (issue de ProfilesCalculator.meta.fillingWidth)
 *  - traverseRef: 'TI28' | 'TI37' | 'TI16' | 'TI19' ... (utile pour 96CA)
 *  - tick: '16' | '19' | '6-8' | '12' ... (conservé pour évolutions)
 *  - leavesCount: nombre de vantaux
 *  - heightsByLeaf: { '1': number[], '2': number[], ... } positions (mm) des TI
 *                   mesurées depuis le BAS jusqu'au CENTRE de la traverse (non triées)
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
 *    meta: { range, traverseRef, tick }
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

    const perLeaf = {};

    for (let i = 1; i <= leaves; i++) {
      const key = String(i);
      const centers = (heightsByLeaf[key] || []).slice().sort((a, b) => a - b);

      // LARGEUR : pas de dédit horizontal fourni → largeur = fillingWidth inchangée
      const width = {
        raw: fillingWidth,
        cut: fillingWidth,
      };

      // HAUTEURS : applique les formules fournies
      let heights;
      if (range === "96CA") {
        heights = computeHeights96CA({ height, centers, traverseRef });
      } else {
        // défaut = règles '96'
        heights = computeHeights96({ height, centers });
      }

      perLeaf[key] = { width, heights };
    }

    return {
      perLeaf,
      meta: { range, traverseRef, tick },
    };
  },
};

/* ----------------------------- RÈGLES FOURNIES ----------------------------- */
/**
 * Gamme 96
 * Sans traverse : H = height - 50
 * Avec traverses :
 *   h1 = y1 - 1
 *   hi = yi - yi-1 - 2
 *   hn = height - 50 - yn - 1
 */
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

/**
 * Gamme 96CA
 * Sans traverse :
 *   H = height - 54 - 120
 * Avec traverses TI28:
 *   h1 = y1 - 45 - 5
 *   hi = yi - yi-1 - 10
 *   hn = height - 55 - yn - 20 - 5
 * Avec traverses TI37:
 *   h1 = y1 - 45 - 9.5
 *   hi = yi - yi-1 - 19
 *   hn = height - 55 - yn - 20 - 9.5
 */
function computeHeights96CA({ height, centers, traverseRef }) {
  const n = centers.length;

  if (n === 0) {
    const H = height - 54 - 120;
    return { bottom: clip0(H), between: [], top: null };
  }

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
