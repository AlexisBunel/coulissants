// src/three/capture.js
import { getThreeManager } from "./registry";
import * as THREE from "three";

function distanceToFitWH(fovDeg, aspect, W, H, padding = 1.5) {
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const dForH = (H * padding) / (2 * Math.tan(vFov / 2));
  const dForW = (W * padding) / (2 * Math.tan(hFov / 2));
  return Math.max(dForH, dForW);
}

const raf = () => new Promise((r) => requestAnimationFrame(r));

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function captureFromBoxAsync({
  direction = [2.5, 1.6, 2.8],
  padding = 1.5,
  fov = null,
  distanceScale = 1.0, // < 1 => zoom, > 1 => dézoom
  panRight = 0.0, // fraction de la largeur W (ex: 0.06)
  panDown = 0.0, // fraction de la hauteur H (ex: 0.04)
  azimuthDeg, // 0° = face (axe +Z), + = vers la droite (axe +X)
  elevationDeg, // 0° = horizontale, + = caméra au-dessus (vers le bas)
} = {}) {
  const mgr = getThreeManager();
  if (!mgr || !mgr.renderer || !mgr.scene || !mgr.camera || !mgr.root)
    return null;

  const { renderer, scene, camera, controls, root } = mgr;

  // 1) bounding box réelle
  const box = new THREE.Box3().setFromObject(root);
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) return null;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const W = size.x,
    H = size.y;

  // 2) sauvegarde état
  const prev = {
    pos: camera.position.clone(),
    quat: camera.quaternion.clone(),
    zoom: camera.zoom,
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
    target: controls ? controls.target.clone() : null,
    autoClear: renderer.autoClear,
  };

  if (fov != null) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  const aspect = camera.aspect > 0 ? camera.aspect : 1.5;

  // 3) distance pour cadrer + zoom souhaité
  let dist = distanceToFitWH(camera.fov, aspect, W, H, padding);
  dist *= distanceScale; // zoom

  // 4) position "3/4"
  let dx, dy, dz;
  const hasAngles = azimuthDeg != null || elevationDeg != null; // <- accepte string ou number

  if (hasAngles) {
    const az = (toNum(azimuthDeg, 0) * Math.PI) / 180; // yaw autour de Y
    const el = (toNum(elevationDeg, 0) * Math.PI) / 180; // pitch (0 = horizontal)
    // repère: +Z = face, +X = droite, +Y = haut
    dx = Math.cos(el) * Math.sin(az);
    dy = Math.sin(el);
    dz = Math.cos(el) * Math.cos(az);
  } else {
    [dx, dy, dz] = direction;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
  }

  const pos = new THREE.Vector3(
    center.x + dx * dist,
    center.y + dy * dist,
    center.z + dz * dist
  );

  // 5) axes caméra pour un pan écran
  // dir = vers la cible ; right = dir x up ; upV = right x dir
  const dirV = new THREE.Vector3().subVectors(center, pos).normalize();
  const rightV = new THREE.Vector3().crossVectors(dirV, camera.up).normalize();
  const upV = new THREE.Vector3().crossVectors(rightV, dirV).normalize();

  // pan en unités monde (fractions de W/H)
  const panVec = new THREE.Vector3()
    .addScaledVector(rightV, (panRight || 0) * W)
    .addScaledVector(upV, -(panDown || 0) * H); // "bas" = -up

  pos.add(panVec);
  center.add(panVec);

  // 6) appliquer pose
  camera.position.copy(pos);
  if (controls) {
    controls.target.copy(center);
    controls.update();
  } else {
    camera.lookAt(center);
  }
  camera.updateProjectionMatrix();

  // 7) rendu sûr
  await raf();
  renderer.autoClear = true;
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  try {
    gl?.finish?.();
  } catch {}
  await raf();
  renderer.render(scene, camera);
  try {
    gl?.finish?.();
  } catch {}

  // 8) capture
  const canvas = renderer.domElement;
  const dataURL = canvas.toDataURL("image/png");
  const out = { dataURL, width: canvas.width, height: canvas.height };

  // 9) restore
  camera.position.copy(prev.pos);
  camera.quaternion.copy(prev.quat);
  camera.zoom = prev.zoom;
  camera.fov = prev.fov;
  camera.near = prev.near;
  camera.far = prev.far;
  camera.updateProjectionMatrix();
  if (controls && prev.target) {
    controls.target.copy(prev.target);
    controls.update();
  }
  renderer.autoClear = prev.autoClear;

  return out;
}
