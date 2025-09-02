// /three/layout.js
// Décrit l’orientation par défaut des refs et construit la liste d’instances
// à partir du store `geometry`.

// mm -> m helper
const mmToM = (v) => (Number(v) || 0) / 1000;

// 1) Métadonnées d’orientation/échelle par ref (.glb)
export const REFS_META = {
  // Rails haut/bas
  RH50: { axis: "x", rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 } },
  RH82: { axis: "x", rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 } },
  RH96: { axis: "x", rot: { x: Math.PI / 2, y: 0, z: Math.PI / 2 } },
  RB48: { axis: "x", rot: { x: Math.PI * 1.5, y: 0, z: Math.PI / 2 } },
  RB55: { axis: "x", rot: { x: Math.PI * 1.5, y: 0, z: Math.PI / 2 } },
  RB65: { axis: "x", rot: { x: Math.PI * 1.5, y: 0, z: Math.PI / 2 } },

  // Traverses intermédiaires
  TI16: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 } },
  TI19: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 } },
  TI28: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 } },
  TI37: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 } },
  THB52: { axis: "x", rot: { x: 0, y: 0, z: Math.PI / 2 } },

  // Poignées (neutre par défaut)
  P100: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P110: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  "P300-16": { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P30: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P200: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  "P300-19": { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P400: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P600: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P700: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P710: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
  P810: { axis: "x", rot: { x: 0, y: 0, z: 0 } },
};

// 2) Fabrique un objet {x,y,z} facile à cloner
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });

// 3) Échelle le long d’un axe en gardant 1m comme longueur nominale
function scaleFromLength(axis, lengthMm, nominalMm = 1000) {
  const s = Math.max(0.001, (Number(lengthMm) || nominalMm) / nominalMm);
  const scale = V(1, 1, 1);
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
  const H = mmToM(geometry.overall.height);
  const finishCode = geometry.overall.profilesColor?.code || "BR";

  // RAILS (haut / bas)
  const refTop = geometry.profiles.rails.top.ref; // ex: RH96
  const refBot = geometry.profiles.rails.bottom.ref; // ex: RB65

  if (refTop && REFS_META[refTop]) {
    const m = REFS_META[refTop];
    list.push({
      key: "rail-top",
      ref: refTop,
      position: V(0, H, 0),
      rotation: V(m.rot.x, m.rot.y, m.rot.z),
      scale: scaleFromLength(
        m.axis,
        geometry.profiles.rails.top.length || geometry.overall.width
      ),
      finishCode,
      visible: true,
    });
  }

  if (refBot && REFS_META[refBot]) {
    const m = REFS_META[refBot];
    list.push({
      key: "rail-bottom",
      ref: refBot,
      position: V(0, 0, 0),
      rotation: V(m.rot.x, m.rot.y, m.rot.z),
      scale: scaleFromLength(
        m.axis,
        geometry.profiles.rails.bottom.length || geometry.overall.width
      ),
      finishCode,
      visible: true,
    });
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

  // Poignée — exemple minimal si présente (position à ajuster selon ton modèle)
  const hRef = geometry.profiles.handle?.ref;
  if (hRef && REFS_META[hRef]) {
    const m = REFS_META[hRef];
    list.push({
      key: "handle-1",
      ref: hRef,
      position: V(0, H * 0.5, 0.02),
      rotation: V(m.rot.x, m.rot.y, m.rot.z),
      scale: V(1, 1, 1),
      finishCode,
      visible: true,
    });
  }

  return list;
}
