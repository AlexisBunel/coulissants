import * as THREE from "three";

export function createMaterialLibrary() {
  const FINISHES = {
    LBL: {
      color: 0xf1f1f1,
      metalness: 0.0,
      roughness: 0.18,
      clearcoat: 0.6,
      clearcoatRoughness: 0.05,
      name: "Laqué Blanc 9010",
    },
    LBLG: {
      color: 0xf4f4f4,
      metalness: 0.0,
      roughness: 0.62, // plus rugueux pour simuler le grain
      clearcoat: 0.2, // faible vernis pour casser les reflets durs
      clearcoatRoughness: 0.35,
      name: "Laqué Blanc 9003 Granité",
    },
    L9002G: {
      color: 0xddded4,
      metalness: 0.0,
      roughness: 0.62,
      clearcoat: 0.2,
      clearcoatRoughness: 0.35,
      name: "Laqué Blanc Gris 9002 Granité",
    },
    SA: {
      color: 0xc9c9c9,
      metalness: 0.75,
      roughness: 0.35, // anodisé = micro-rugosité
      reflectivity: 0.6,
      name: "Anodisé Argent",
    },
    LNOG: {
      color: 0x0a0a0a,
      metalness: 0.0,
      roughness: 0.66, // mat/granité
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
      name: "Laqué Noir 9005 Granité",
    },
    BI: {
      color: 0xb5b5b5,
      metalness: 1.0,
      roughness: 0.42, // brossé ≈ rugosité moyenne
      reflectivity: 0.7,
      name: "Inox Brossé",
    },
    PB: {
      color: 0x8c6239, // bronze plus sombre (#8C6239 ≈ bronze patiné)
      metalness: 1.0,
      roughness: 0.35, // un peu plus rugueux → reflets diffus
      reflectivity: 0.45, // moins réfléchissant
      clearcoat: 0.15, // léger vernis
      clearcoatRoughness: 0.25,
      name: "Bronze Poli",
    },
    BR: {
      color: 0xbdbdbd,
      metalness: 1.0,
      roughness: 0.5, // brut → plus diffus
      reflectivity: 0.6,
      name: "Brut",
    },
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
    MIRROR: () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.02,
        envMapIntensity: 2.0, // n’hésite pas à 3–4 si besoin
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
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
