const mmToM = (v) => (Number(v) || 0) / 1000;
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });

function depthStepFromRange(range) {
  const r = String(range || "").trim();
  return r === "82" ? 41 : 46;
}

const ALLOWED_RAILS = {
  simple: {
    top: new Set(["RH50"]), // ← rails HAUT autorisés en simple
    bottom: new Set(["RB48"]), // ← rails BAS autorisés en simple
  },
  double: {
    top: new Set(["RH82", "RH96"]), // ← rails HAUT autorisés en double
    bottom: new Set(["RB55", "RB65"]), // ← rails BAS autorisés en double
  },
};

function isRailAllowed(ref, railType, pos /* 'top' | 'bottom' */) {
  const type = (railType || "").toLowerCase(); // 'simple' | 'double'
  const allowed = ALLOWED_RAILS[type]?.[pos];
  if (!allowed) return true; // fallback permissif si config inconnue
  return allowed.has(String(ref));
}

export const REFS_META = {
  // Rails haut/bas
  RH50: {
    axis: "x",
    rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    scaleAxis: "y",
  },
  RH82: {
    axis: "x",
    rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    scaleAxis: "y",
  },
  RH96: {
    axis: "x",
    rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    scaleAxis: "y",
  },
  RB48: {
    axis: "x",
    rot: { x: Math.PI * 1.5, y: 0, z: Math.PI / 2 },
    scaleAxis: "y",
  },
  RB55: {
    axis: "x",
    rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    scaleAxis: "y",
  },
  RB65: {
    axis: "x",
    rot: { x: Math.PI * 1.5, y: 0, z: Math.PI / 2 },
    scaleAxis: "y",
  },

  CCLA: {
    axis: "x",
    rot: { x: 0, y: 0, z: 0 },
    scaleAxis: "x",
  },

  // Traverses intermédiaires
  TI16: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "x" },
  TI19: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "x" },
  TI28: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "x" },
  TI37: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "x" },
  THB52: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "x" },

  // Poignées (neutre par défaut)
  P100: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P110: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  "P300-16": { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P30: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P200: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  "P300-19": { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P400: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P600: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P700: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P710: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
  P810: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "y" },
};

function scaleFromLength(axis, lengthMm, nominalMm = 1000) {
  const s = Math.max(0.001, (Number(lengthMm) || nominalMm) / nominalMm);
  const scale = { x: 1, y: 1, z: 1 };
  scale[axis] = s;
  return scale;
}

export function buildInstances(geometry) {
  const list = [];
  if (!geometry) return list;

  const W = mmToM(geometry.overall.width);
  const H = mmToM(geometry.overall.height);
  const finishCode = geometry.overall.profilesColor?.code || "BR";

  // --- Communs aux poignées et cornières ---
  const range = String(geometry?.overall?.range || "");
  const railType = String(geometry?.overall?.rail || "").toLowerCase(); // 'simple' | 'double'
  const arrangement = String(
    geometry?.overall?.arrangement || ""
  ).toLowerCase();
  const leaves = Number(geometry?.overall?.leavesCount) || 1;

  const TW = mmToM(
    Number(geometry?.overall?.totalWidth) ||
      Number(geometry?.overall?.width) ||
      0
  );
  const deepPmm = Number(-20); // en mm (0 si absent)
  const deepPM = mmToM(deepPmm);

  const offYmm = Number(geometry?.profiles?.handle?.y) || 0; // offset Y poignée (mm)
  const offZmm = Number(geometry?.profiles?.handle?.z) || 0; // offset Z poignée (mm)
  const cMm = Number(geometry?.profiles?.handle?.c) || 0; // c en mm (même source que y/z)
  const wLeafMm = Number(geometry?.fillings?.widthPerLeaf) || 0; // largeur panneau (mm)
  const LVmm = offZmm + wLeafMm + offZmm; // largeur d'un vantail (LV)

  const stepDepthMm = depthStepFromRange(range); // 41 si 82, sinon 46
  const stepDepthM = mmToM(stepDepthMm);

  // Hauteur poignée (pivot non centré) : gauche à 18mm, droite à 18mm + length
  const handleLengthMm =
    Number(
      geometry?.profiles?.handle?.length ?? geometry?.profiles?.handle?.lenght
    ) || 1000;
  const yLeftM = mmToM(18);
  const yRightM = mmToM(18 + handleLengthMm);

  const refTop = geometry.profiles.rails.top.ref; // ex: RH96
  const refBot = geometry.profiles.rails.bottom.ref; // ex: RB65

  const CalcRBDecals = (rail, range, tick) => {
    if (rail === "double") {
      if (range === "82") {
        return 31 + 27.5 - 41;
      }
      if (range === "96") {
        if (tick === "19") {
          return 32 + 32.5 - 48;
        } else {
          return 35 + 32.5 - 48;
        }
      } else {
        return 15 + 32.5 - 48;
      }
    } else {
      if (range === "96") {
        if (tick === "19") {
          return 5;
        } else {
          return 3;
        }
      } else {
        return 15;
      }
    }
  };
  const RBDecal = mmToM(
    CalcRBDecals(
      geometry.overall.rail,
      geometry.overall.range,
      geometry.overall.tick
    )
  );

  // Origines (X, Z) de chaque vantail en MÈTRES (latéral & profondeur)
  const leafOrigins = []; // [{ xM, zM }]
  if (railType === "simple") {
    // latéral: v1 = -TW/2 ; v(n+1) = v(n) + LV
    // profondeur: tous = deepP
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      leafOrigins.push({ xM, zM: deepPM });
      xM += mmToM(LVmm);
    }
  } else if (railType === "double" && arrangement === "quinconce") {
    // latéral: v1 = -TW/2 ; v(n+1) = v(n) + LV - (z + y)
    // profondeur: v1 =  deepP ; v2 = deepP + step ; v3 = deepP ; v4 = deepP + step ; ...
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      const zM = i === 0 ? deepPM : i % 2 === 1 ? deepPM + stepDepthM : deepPM;
      leafOrigins.push({ xM, zM });
      xM += mmToM(LVmm - (offZmm + offYmm));
    }
  } else if (railType === "double" && arrangement === "centre") {
    // latéral:
    //  v1 = -TW/2
    //  v2 = v1 + LV - (z + y)
    //  v3 = v2 + LV
    //  v4 = v3 + LV - (z + y)
    // profondeur: pattern /4 -> [deepP, deepP+step, deepP+step, deepP]
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      const mod = i % 4;
      const zM = mod === 0 || mod === 3 ? deepPM : deepPM + stepDepthM;
      leafOrigins.push({ xM, zM });
      if (i === 0 || i === 2) {
        xM += mmToM(LVmm - (offZmm + offYmm));
      } else {
        xM += mmToM(LVmm);
      }
    }
  } else {
    // fallback: comme simple
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      leafOrigins.push({ xM, zM: deepPM });
      xM += mmToM(LVmm);
    }
  }

  // RAILS (haut / bas)
  if (refTop && REFS_META[refTop] && isRailAllowed(refTop, railType, "top")) {
    const m = REFS_META[refTop];
    list.push({
      key: "rail-top",
      ref: refTop,
      position: V(TW / 2, H, 0),
      rotation: V(m.rot.x, m.rot.y, m.rot.z),
      scale: scaleFromLength(
        m.scaleAxis || m.axis,
        geometry.profiles.rails.top.length || geometry.overall.width
      ),
      finishCode,
      visible: true,
    });
  }

  // RAIL BAS
  if (
    refBot &&
    REFS_META[refBot] &&
    isRailAllowed(refBot, railType, "bottom")
  ) {
    const m = REFS_META[refBot];
    list.push({
      key: "rail-bottom",
      ref: refBot,
      position: V(TW / 2, 0, -RBDecal),
      rotation: V(m.rot.x, m.rot.y, m.rot.z),
      scale: scaleFromLength(
        m.scaleAxis || m.axis,
        geometry.profiles.rails.bottom.length || geometry.overall.width
      ),
      finishCode,
      visible: true,
    });
  }

  // =====================
  // POIGNÉES (2 par vantail)
  // =====================
  const hRef = geometry?.profiles?.handle?.ref;
  if (hRef && REFS_META[hRef]) {
    const m = REFS_META[hRef];
    const handleScale = scaleFromLength(m.scaleAxis || "y", handleLengthMm);

    for (let leafIdx = 0; leafIdx < leaves; leafIdx++) {
      const { xM: baseXM, zM: baseZM } = leafOrigins[leafIdx];

      // gauche
      list.push({
        key: `handle-${leafIdx + 1}-L`,
        ref: hRef,
        position: V(baseXM, yLeftM, baseZM),
        rotation: V(m.rot.x, m.rot.y, m.rot.z),
        scale: handleScale,
        finishCode,
        visible: true,
      });

      // droite : miroir Z + π, rehaussée d'une longueur, à l’extrémité du vantail
      const xRightM = baseXM + mmToM(LVmm);
      list.push({
        key: `handle-${leafIdx + 1}-R`,
        ref: hRef,
        position: V(xRightM, yRightM, baseZM),
        rotation: V(m.rot.x, m.rot.y, m.rot.z + Math.PI),
        scale: handleScale,
        finishCode,
        visible: true,
      });
    }
  }

  // =====================
  // CORNIÈRES BAS (gamme 82 ou 96)
  // =====================
  const refCorner = geometry?.profiles?.corner?.ref || null;
  const cornerLength = Number(geometry?.profiles?.corner?.length) || 1000;

  if (refCorner && (range === "82" || range === "96") && REFS_META[refCorner]) {
    const mC = REFS_META[refCorner];
    const cornerScale = scaleFromLength(mC.scaleAxis || "x", cornerLength);
    const cMm = Number(geometry?.profiles?.handle?.c) || 0;

    for (let leafIdx = 0; leafIdx < leaves; leafIdx++) {
      const { xM: baseXM, zM: baseZM } = leafOrigins[leafIdx];

      // x = origine du vantail + (z + c)
      const xCornerM = baseXM + mmToM(offZmm + cMm / 2);
      const zCornerM = baseZM + mmToM(10.5); // +1 mm en profondeur

      list.push({
        key: `corner-${leafIdx + 1}-bottom`,
        ref: refCorner,
        position: V(xCornerM, yLeftM, zCornerM),
        rotation: V(mC.rot.x, mC.rot.y, mC.rot.z),
        scale: cornerScale,
        finishCode,
        visible: true,
      });
    }
  }

  // =====================
  // Traverses hautes et basses (gamme 96CA)
  // =====================
  const refTH = geometry?.profiles?.traverses?.top?.ref || null;
  const THLength = Number(geometry?.profiles?.traverses?.top?.length) || 1000;
  const refTB = geometry?.profiles?.traverses?.bottom?.ref || null;
  const TBLength =
    Number(geometry?.profiles?.traverses?.bottom?.length) || 1000;

  if (refTH && refTB && range === "96CA" && REFS_META[refTH && refTB]) {
    const mTH = REFS_META[refTH];
    const mTB = REFS_META[refTB];
    const THScale = scaleFromLength(mTH.scaleAxis || "x", THLength);
    const TBScale = scaleFromLength(mTB.scaleAxis || "x", TBLength);
    const THMm = Number(geometry?.profiles?.handle?.t) || 0;
    const TBMm = Number(geometry?.profiles?.handle?.t) || 0;

    for (let leafIdx = 0; leafIdx < leaves; leafIdx++) {
      const { xM: baseXM, zM: baseZM } = leafOrigins[leafIdx];

      const xTHM = baseXM + mmToM(offZmm + THMm / 2);
      const yTHM = yLeftM + mmToM(handleLengthMm - 14);
      const zTHM = baseZM;
      const xTBM = baseXM + mmToM(offZmm + TBMm / 2);
      const yTBM = yLeftM;
      const zTBM = baseZM;

      list.push({
        key: `traverse-${leafIdx + 1}-top`,
        ref: refTH,
        position: V(xTHM, yTHM, zTHM),
        rotation: V(mTH.rot.x, mTH.rot.y, mTH.rot.z),
        scale: THScale,
        finishCode,
        visible: true,
      });
      list.push({
        key: `traverse-${leafIdx + 1}-bottom`,
        ref: refTB,
        position: V(xTBM, yTBM, zTBM),
        rotation: V(mTB.rot.x, mTB.rot.y, mTB.rot.z),
        scale: TBScale,
        finishCode,
        visible: true,
      });
    }
  }

  // =====================
  // TRAVERSES INTERMÉDIAIRES
  // =====================
  const ti = geometry?.profiles?.traverses?.intermediate || {};
  const tiRef = ti?.ref || null; // ex: 'TI28', 'TI37', 'TI16', 'TI19'
  const tiType = String(ti?.type || "").trim(); // '28' | '37' | '16' | '19' ...
  const byLeaf = ti?.byLeaf || {}; // { '1':[h1,h2,...], '2':[...], ... }
  const tMm = Number(geometry?.profiles?.handle?.t) || 0; // 't' venant de profiles (mm)

  // helper: ajoute une famille de traverses intermédiaires selon une ref / meta
  function pushIntermediateFor(refName, rotateX180 = false) {
    if (!refName || !REFS_META[refName]) return;
    const mTI = REFS_META[refName];

    // Longueur par défaut pour le scale (mm) : ti.length sinon largeur panneau
    const defaultLenMm = Number(ti?.length) || Number(wLeafMm) || 1000;

    // Normalise une "entrée byLeaf" en tableau de hauteurs (mm)
    const toHeightsArray = (entry) => {
      if (!entry) return [];
      if (Array.isArray(entry)) return entry; // rare, mais on accepte
      if (Array.isArray(entry.heights)) return entry.heights; // format attendu
      if (typeof entry === "number") return [entry];
      return [];
    };

    // byLeaf peut être un Array d’objets { leaf, length, heights, ... } ou un objet clé→entrée
    const entries = Array.isArray(byLeaf) ? byLeaf : Object.values(byLeaf);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const leafNum = Number(entry?.leaf) || i + 1; // 1-based; fallback si leaf absent
      const origin = leafOrigins[leafNum - 1]; // 0-based index dans leafOrigins
      if (!origin) continue;

      const heightsArr = toHeightsArray(entry);
      if (!heightsArr.length) continue;

      // Longueur spécifique à ce vantail si fournie (mm), sinon défaut
      const lenMm = Number(entry?.length) || defaultLenMm;

      // Scale pour CETTE traverse (axe de scale défini dans REFS_META[refName])
      const tiScale = scaleFromLength(mTI.scaleAxis || "x", lenMm);

      const { xM: baseXM, zM: baseZM } = origin;

      for (let hIdx = 0; hIdx < heightsArr.length; hIdx++) {
        const hMm = Number(heightsArr[hIdx]) || 0;

        list.push({
          key: `traverse-${refName}-leaf${leafNum}-h${hIdx}`,
          ref: refName,
          position: V(
            baseXM + mmToM(tMm / 2 + offZmm), // x = origine du vantail + (t + z)
            yLeftM + mmToM(hMm), // y = yLeftM + hauteur traverse (mm)
            baseZM // z = deepPM (constant comme demandé)
          ),
          rotation: V(
            (mTI.rot.x || 0) + (rotateX180 ? Math.PI : 0), // rotation X conditionnelle
            mTI.rot.y || 0,
            mTI.rot.z || 0
          ),
          scale: tiScale,
          finishCode,
          visible: true,
        });
      }
    }
  }

  // --- Règles selon gamme/type/tick ---
  // 96CA + type=28  → TI28
  if (tiRef === "TI28") {
    pushIntermediateFor("TI28");
  }
  // 96CA + type=37  → TI37
  if (tiRef === "TI37") {
    pushIntermediateFor("TI37");
  }
  // 96 + tick=16    → TI16
  if (range === "96" && String(geometry?.overall?.tick) === "16") {
    const rotateX = tiType === "7";
    pushIntermediateFor("TI16", rotateX);
  }

  // 96 + tick=19  → TI19 (rotation X = 180° si tiType === "7")
  if (range === "96" && String(geometry?.overall?.tick) === "19") {
    const rotateX = tiType === "7";
    pushIntermediateFor("TI19", rotateX);
  }

  // =====================
  // Remplissages
  // =====================
  function getRTickM() {
    const tick = String(geometry?.fillings?.computed?.meta?.tick || "");
    if (tick === "19") return mmToM(19);
    if (tick === "16") return mmToM(16);
    if (tick === "6-8") return mmToM(8);
    if (tick === "10-12") return mmToM(12);
    return mmToM(8);
  }

  function fillingToFinishCode(filling) {
    const f = String(filling || "")
      .toLowerCase()
      .trim();
    if (f === "miroir") return "MIRROR";
    if (f === "verre") return "GLASS";
    // 'standard' (ou tout autre) -> crème
    return "CREAM";
  }

  const fillingCode = fillingToFinishCode(geometry?.overall?.filling);

  const rDepth = getRTickM(); // épaisseur panneau (m)
  const rHeight = mmToM(handleLengthMm); // hauteur (m) (ton choix actuel)
  const rWidth = mmToM(geometry?.fillings?.widthPerLeaf || 0); // largeur (m)

  for (let leafIdx = 0; leafIdx < leaves; leafIdx++) {
    const { xM: baseXM, zM: baseZM } = leafOrigins[leafIdx];

    // x = origine du vantail + z
    const xRM = baseXM + rWidth / 2 + mmToM(offZmm);
    // y = 18mm (82) sinon 18mm + 2mm (96/96CA) — comme ton snippet
    const yRM =
      range === "82" ? yLeftM + rHeight / 2 : yLeftM + rHeight / 2 + mmToM(2);
    // z = profondeur du vantail
    const zRM = baseZM;

    const finishCode = fillingToFinishCode(geometry?.overall?.filling);

    list.push({
      key: `filling-${leafIdx + 1}`,
      type: "box", // <<< NOUVEAU : instance procédurale
      box: { width: rWidth, height: rHeight, depth: rDepth }, // en mètres
      position: V(xRM, yRM, zRM),
      rotation: V(0, 0, 0),
      scale: V(1, 1, 1),
      finishCode,
      visible: true,
    });
  }
  return list;
}
