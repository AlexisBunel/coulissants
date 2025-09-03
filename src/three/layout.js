// /three/layout.js
// Décrit l’orientation par défaut des refs et construit la liste d’instances
// à partir du store `geometry`.

// mm -> m helper
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
// 1) Métadonnées d’orientation/échelle par ref (.glb)
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

  // Traverses intermédiaires
  TI16: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  TI19: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  TI28: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  TI37: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  THB52: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },

  // Poignées (neutre par défaut)
  P100: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "x" },
  P110: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  "P300-16": { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P30: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P200: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  "P300-19": { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P400: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P600: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P700: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P710: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
  P810: { axis: "x", rot: { x: 0, y: 0, z: 0 }, scaleAxis: "z" },
};

// 3) Échelle le long d’un axe en gardant 1m comme longueur nominale
function scaleFromLength(axis, lengthMm, nominalMm = 1000) {
  const s = Math.max(0.001, (Number(lengthMm) || nominalMm) / nominalMm);
  const scale = { x: 1, y: 1, z: 1 };
  scale[axis] = s;
  return scale;
}

/**
 * buildInstances(geometry) -> retourne une liste d’instances
 * Chaque instance : { key, ref, position, rotation, scale, finishCode, visible }
 *
 * Convention espace : X = largeur, Y = hauteur, Z = profondeur.
 */
export function buildInstances(geometry) {
  const list = [];
  if (!geometry) return list;

  const W = mmToM(geometry.overall.width);
  const TW = mmToM(geometry.overall.totalWidth);
  const H = mmToM(geometry.overall.height);
  const finishCode = geometry.overall.profilesColor?.code || "BR";

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

  // RAILS (haut / bas)
  const refTop = geometry.profiles.rails.top.ref; // ex: RH96
  const refBot = geometry.profiles.rails.bottom.ref; // ex: RB65
  const railType = geometry.overall.rail;

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

  // Poignée — exemple minimal si présente (position à ajuster selon ton modèle)
  const hRef = geometry?.profiles?.handle?.ref;
  if (hRef && REFS_META[hRef]) {
    const m = REFS_META[hRef];

    const leaves = Number(geometry?.overall?.leavesCount) || 1;
    const railType = String(geometry?.overall?.rail || "").toLowerCase(); // 'simple' | 'double'
    const arrangement = String(
      geometry?.overall?.arrangement || ""
    ).toLowerCase(); // 'quinconce' | 'avant-centre' | ...
    const range = String(geometry?.overall?.range || "");

    const zMm = Number(geometry?.profiles?.handle?.z) || 0; // offset Z latéral (mm)
    const wLeafMm = Number(geometry?.fillings?.widthPerLeaf) || 0; // largeur panneau (mm)
    const LVmm = zMm + wLeafMm + zMm; // largeur de vantail (mm)

    const stepDepthMm = depthStepFromRange(range); // 41 ou 46 mm
    const yHandle = mmToM(18); // hauteur poignées = 18 mm

    // Calcule la position latérale (X) et profondeur (Z) de chaque vantail (origine du vantail = position de la 1ère poignée)
    const leafOrigins = []; // [{xMm, zMm}]
    let xAcc = 0;
    if (railType === "simple") {
      // -- SIMPLE --
      // latéral: leaf1=0 ; leaf2=leaf1 + LV ; leaf3=leaf2 + LV ; ...
      // profondeur: tous à 0
      for (let i = 0; i < leaves; i++) {
        leafOrigins.push({ xMm: xAcc, zMm: 0 });
        xAcc += LVmm;
      }
    } else if (arrangement === "quinconce") {
      // -- QUINCONCE --
      // latéral: leaf1=0 ; leaf(n+1) = leaf(n) + LV - z
      // profondeur: alterne 0, step, 0, step, ...
      for (let i = 0; i < leaves; i++) {
        const depth = i % 2 === 1 ? stepDepthMm : 0; // 0, step, 0, step...
        if (i === 0) {
          leafOrigins.push({ xMm: 0, zMm: depth });
          xAcc = LVmm - zMm;
        } else {
          leafOrigins.push({ xMm: xAcc, zMm: depth });
          xAcc += LVmm - zMm;
        }
      }
    } else if (
      arrangement === "avant-centre" ||
      arrangement === "avant_centre" ||
      arrangement === "avantcentre"
    ) {
      // -- AVANT CENTRÉ --
      // latéral:
      //  leaf1 = 0
      //  leaf2 = leaf1 + LV - z
      //  leaf3 = leaf2 + LV
      //  leaf4 = leaf3 + LV - z
      // -> pattern: + (i pair ? LV : LV - z) si i>0, en partant de i=0
      // profondeur: pattern par 4 -> [0, step, step, 0] (répète)
      for (let i = 0; i < leaves; i++) {
        const mod = i % 4;
        const depth = mod === 0 || mod === 3 ? 0 : stepDepthMm; // 0, step, step, 0, ...

        if (i === 0) {
          leafOrigins.push({ xMm: 0, zMm: depth });
          xAcc = LVmm - zMm; // pour i=1
        } else {
          leafOrigins.push({ xMm: xAcc, zMm: depth });
          const add = i % 2 === 0 ? LVmm : LVmm - zMm; // pair: +LV ; impair: +LV - z
          xAcc += add;
        }
      }
    } else {
      // Fallback (comportement simple si arrangement inconnu) : enchaînement simple
      for (let i = 0; i < leaves; i++) {
        leafOrigins.push({ xMm: xAcc, zMm: 0 });
        xAcc += LVmm;
      }
    }

    // Pour chaque vantail : 2 poignées
    // - poignée gauche à xLeaf
    // - panneau commence à xLeaf + z
    // - poignée droite à xLeaf + z + width + z = xLeaf + LV
    //   -> on la met en miroir (rotation Y + π)
    for (let leafIdx = 0; leafIdx < leaves; leafIdx++) {
      const origin = leafOrigins[leafIdx] || { xMm: 0, zMm: 0 };
      const xLeafM = mmToM(origin.xMm);
      const zLeafM = mmToM(origin.zMm);

      // Poignée 1 (gauche)
      list.push({
        key: `handle-${leafIdx + 1}-L`,
        ref: hRef,
        position: V(xLeafM, yHandle, zLeafM),
        rotation: V(m.rot.x, m.rot.y, m.rot.z),
        scale: V(1, 1, 1),
        finishCode,
        visible: true,
      });

      // Poignée 2 (droite, en miroir)
      const xRightM = mmToM(origin.xMm + LVmm); // xLeaf + LV
      list.push({
        key: `handle-${leafIdx + 1}-R`,
        ref: hRef,
        position: V(xRightM, yHandle, zLeafM),
        rotation: V(m.rot.x, m.rot.y + Math.PI, m.rot.z), // miroir sur Y
        scale: V(1, 1, 1),
        finishCode,
        visible: true,
      });
    }
  }
  // TRAVERSES INTERMÉDIAIRES par vantail
  const tiRef = geometry.profiles.traverses.intermediate.ref; // ex: TI28
  const byLeaf = geometry.profiles.traverses.intermediate.byLeaf || {}; // { '1':[h1,h2], '2':[...], ... }
  const leaves = Number(geometry.overall.leavesCount) || 1;
  const leafW = mmToM(geometry.fillings.widthPerLeaf || 0) || W / leaves;

  if (tiRef && REFS_META[tiRef]) {
    const m = REFS_META[tiRef];
    for (let leaf = 1; leaf <= leaves; leaf++) {
      const heights = byLeaf[String(leaf)] || [];
      const xCenter = -W / 2 + (leaf - 0.5) * leafW; // centrage simple
      heights.forEach((hMm, idx) => {
        const key = `ti-${leaf}-${idx}`;
        list.push({
          key,
          ref: tiRef,
          position: V(xCenter, mmToM(hMm), 0),
          rotation: V(m.rot.x, m.rot.y, m.rot.z),
          scale: scaleFromLength(m.axis, leafW * 1000), // échelle = largeur du vantail
          finishCode,
          visible: true,
        });
      });
    }
  }

  return list;
}
