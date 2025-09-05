import * as THREE from "three";

export function createMaterialLibrary() {
  const FINISHES = {
    LBL: {
      color: 0xf2f2f2,
      metalness: 0.2,
      roughness: 0.5,
      name: "Laqué Blanc 9010",
    },
    LBLG: {
      color: 0xf0f0f0,
      metalness: 0.2,
      roughness: 0.8,
      name: "Laqué Blanc 9003 Granité",
    },
    L9002G: {
      color: 0xe9e9e9,
      metalness: 0.2,
      roughness: 0.8,
      name: "Laqué Blanc Gris 9002 Granité",
    },
    SA: {
      color: 0xc0c0c0,
      metalness: 0.8,
      roughness: 0.25,
      name: "Anodisé Argent",
    },
    LNOG: {
      color: 0x0b0b0b,
      metalness: 0.5,
      roughness: 0.6,
      name: "Laqué Noir 9005 Granité",
    },
    BI: {
      color: 0x9aa0a6,
      metalness: 1.0,
      roughness: 0.35,
      name: "Inox Brossé",
    },
    PB: {
      color: 0xb08d57,
      metalness: 1.0,
      roughness: 0.4,
      name: "Bronze Poli",
    },
    BR: { color: 0xaaaaaa, metalness: 0.0, roughness: 0.9, name: "Brut" },
  };

  const BOX_MATERIALS = {
    // Blanc crème (standard)
    CREAM: () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xccae7e), // crème chaud (ajuste si besoin)
        roughness: 1,
      }),
    // Verre
    GLASS: () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xd9ffff),
        metalness: 0,
        roughness: 1,
        envMapIntensity: 1,
        clearcoat: 1,
        transparent: true,
        transmission: 1,
        opacity: 0.4,
        reflectivity: 0.2,
      }),
    // Miroir
    MIRROR: () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        metalness: 1.0,
        roughness: 0.02, // quasi lisse
        envMapIntensity: 1.0, // profitera d’un envMap si présent
      }),
  };

  // Cache partagé de matériaux THREE (1 instance par finition)
  const matCache = new Map();

  function materialFrom(def) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      metalness: def.metalness,
      roughness: def.roughness,
    });
  }

  function getMaterial(finishCode) {
    const code = String(finishCode || "").toUpperCase();

    // Matériaux spéciaux pour les "box"
    if (BOX_MATERIALS[code]) {
      if (!matCache.has(code)) matCache.set(code, BOX_MATERIALS[code]());
      return matCache.get(code);
    }

    // Palette "profils" par défaut
    const def = FINISHES[code] || FINISHES.BR;
    if (!matCache.has(code)) {
      matCache.set(
        code,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(def.color),
          metalness: def.metalness,
          roughness: def.roughness,
        })
      );
    }
    return matCache.get(code);
  }

  return { getMaterial };
}
