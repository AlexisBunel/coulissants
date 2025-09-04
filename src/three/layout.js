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
  TI16: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  TI19: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  TI28: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  TI37: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },
  THB52: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 }, scaleAxis: "z" },

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
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      leafOrigins.push({ xM, zM: deepPM });
      xM += mmToM(LVmm);
    }
  } else if (railType === "double" && arrangement === "quinconce") {
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      const zM = i === 0 ? -deepPM : i % 2 === 1 ? deepPM + stepDepthM : deepPM;
      leafOrigins.push({ xM, zM });
      xM += mmToM(LVmm - (offZmm + offYmm));
    }
  } else if (
    railType === "double" &&
    (arrangement === "avant-centre" ||
      arrangement === "avant_centre" ||
      arrangement === "avantcentre" ||
      arrangement === "centre")
  ) {
    let xM = -TW / 2;
    for (let i = 0; i < leaves; i++) {
      const mod = i % 4;
      const zM = mod === 0 || mod === 3 ? deepPM : deepPM + stepDepthM;
      leafOrigins.push({ xM, zM });
      if (i === 0 || i === 2) xM += mmToM(LVmm - (offZmm + offYmm));
      else xM += mmToM(LVmm);
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
  const refCorner = geometry?.profiles?.corner?.ref || "CCLA";
  const cornerLength = Number(geometry?.profiles?.corner?.length) || 1000;

  if (
    (range === "82" || range === "96") &&
    (REFS_META[refCorner] || REFS_META.CCLA)
  ) {
    const mC = REFS_META[refCorner] || REFS_META.CCLA;
    const cornerScale = scaleFromLength(mC.scaleAxis || "x", cornerLength);

    for (let leafIdx = 0; leafIdx < leaves; leafIdx++) {
      const { xM: baseXM, zM: baseZM } = leafOrigins[leafIdx];

      // x = origine du vantail + (z + c)   (PAS de /2)
      const xCornerM = baseXM + mmToM(offZmm + cMm / 2);
      // y = yLeftM (18 mm du sol)
      // z = deepP + 1 mm
      const zCornerM = baseZM + mmToM(1);

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

  return list;
}

// Ajoutons maintenant les traverses :
// THB52 :
//   Si gamme = 96CA (sur chaque vantail):
//     - Une traverse en bas positionnée (x: y+z-2, y: yLeftM, z: deepPM)
//     - Une haut positionnée (x: y+z-2, y: yLeftM + handleScale, z: deepPM) avec une rotation sur x de 180deg.
//     - Appliquer aux 2 traverses une scale de profiles.traverses.top.lenght sur l'axe x.
// TI28 :
//   Si gamme = 96CA et profiles.traverses.intermediate.type=28:
//   - Infos dans profiles.traverses.intermediate
//   - byLeaf indique le vantail concerné, la quantité de traverses, et leurs hauteurs
//   - Positionner les traverses en (x: y+z-2, y: yLeftM + hauteur traverse, z: deepPM)
// TI37 :
//   Si gamme = 96CA et profiles.traverses.intermediate.type=37:
//   - Infos dans profiles.traverses.intermediate
//   - byLeaf indique le vantail concerné, la quantité de traverses, et leurs hauteurs
//   - Positionner les traverses en (x: y+z-2, y: yLeftM + hauteur traverse, z: deepPM)
// TI16 :
// Si gamme = 96 et overall.tick=16 :
// - Infos dans profiles.traverses.intermediate
// - byLeaf indique le vantail concerné, la quantité de traverses, et leurs hauteurs
// - Positionner les traverses en (x: z+t, y: yLeftM + hauteur traverse, z: deepPM)

// TI19 :
// Si gamme = 96 et overall.tick=19 :
// - Infos dans profiles.traverses.intermediate
// - byLeaf indique le vantail concerné, la quantité de traverses, et leurs hauteurs
// - Positionner les traverses en (x: z+t, y: yLeftM + hauteur traverse, z: deepPM)
