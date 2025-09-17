// src/three/registry.js
let _mgr = null;

/** Enregistre l’instance active de ThreeManager */
export function setThreeManager(mgr) {
  _mgr = mgr;
}

/** Retourne l’instance brute de ThreeManager */
export function getThreeManager() {
  return _mgr;
}

/** Retourne le renderer WebGL (ou null si pas prêt) */
export function getRenderer() {
  return _mgr?.renderer ?? null;
}

/** Retourne la scène Three.js (ou null si pas prêt) */
export function getScene() {
  return _mgr?.scene ?? null;
}

/** Retourne la caméra (ou null si pas prêt) */
export function getCamera() {
  return _mgr?.camera ?? null;
}
