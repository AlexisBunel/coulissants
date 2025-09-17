import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const mmToM = (v) => (Number(v) || 0) / 1000;

function distanceToFitWH(fovDeg, aspect, W, H, padding = 1.5) {
  // fov vertical
  const vFov = (fovDeg * Math.PI) / 180;
  // fov horizontal dérivé avec l'aspect
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const dForH = (H * padding) / (2 * Math.tan(vFov / 2));
  const dForW = (W * padding) / (2 * Math.tan(hFov / 2));
  return Math.max(dForH, dForW);
}

const waitRaf = () => new Promise((r) => requestAnimationFrame(r));

export class ThreeManager {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.baseUrl = options.baseUrl || window.basePath + "glb";

    // Rendu
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // Scène & camera
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent

    // Tonemapping déjà conseillé
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;

    // Environment map procédural pour reflets (miroir/verre)
    this.pmremGen = new PMREMGenerator(this.renderer);
    const envTex = this.pmremGen.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex; // <-- crucial pour que MIRROR/GLASS réagissent

    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1000);
    this.camera.position.set(2.5, 1.6, 2.8);

    // Contrôles
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    // Lumières simples
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemi.position.set(0, 1, 0);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 5, 2);
    dir.castShadow = false;
    this.scene.add(dir);

    // Groupe racine pour tes pièces (on n’efface jamais la caméra ni les lights)
    this.root = new THREE.Group();
    this.root.name = "instances-root";
    this.scene.add(this.root);

    // Chargement
    this.loader = new GLTFLoader();
    this.modelCache = new Map(); // ref -> gltf.scene (template)

    // Registre des instances actuelles : key -> Object3D
    this.nodes = new Map();

    // Animation loop
    this._running = true;
    const tick = () => {
      if (!this._running) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };
    tick();

    // Resize
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /**
   * Déclare l’URL de base où trouver les .glb (ex: /assets/glb)
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Injecte ta librairie de matériaux (cf. materials.js)
   */
  setMaterialLibrary(matLib) {
    this.matLib = matLib;
  }

  /**
   * Charge (ou récupère du cache) un modèle par ref (ex: 'RH96' -> '/models/RH96.glb')
   */
  async loadModel(ref) {
    if (this.modelCache.has(ref)) return this.modelCache.get(ref);
    const url = `${this.baseUrl}/${ref}.glb`;
    const gltf = await this.loader.loadAsync(url);
    // On garde un template propre dans le cache
    this.modelCache.set(ref, gltf.scene);
    return gltf.scene;
  }

  /**
   * Crée un clone prêt à être instancié (avec matériaux partagés)
   */
  async instantiate(ref) {
    const template = await this.loadModel(ref);
    const clone = template.clone(true);
    clone.userData.ref = ref; // <— mémorise la ref actuelle
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    return clone;
  }

  createBoxMesh(size) {
    const geo = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const mat = this.matLib
      ? this.matLib.getMaterial(null)
      : new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { kind: "box", size: { ...size } };
    return mesh;
  }

  /**
   * Diff d’instances : `instances` est une liste plane de:
   * { key, ref, position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}, finishCode }
   */
  /**
   * Diff d’instances : `instances` est une liste de:
   * { key, ref, position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}, finishCode, visible }
   */
  async applyInstances(instances = []) {
    const wanted = new Map(instances.map((it) => [it.key, it]));

    for (const child of [...this.root.children]) {
      const name = child.name || "";
      const isTHB = name.startsWith("traverse-");
      if (!isTHB) continue;

      const inst = wanted.get(name);
      // si la clé n'est plus voulue OU si la ref a changé -> on retire l'objet
      if (!inst || (child.userData?.ref && child.userData.ref !== inst.ref)) {
        this.root.remove(child);
        if (this.nodes.get(name) === child) this.nodes.delete(name);
      }
    }

    for (const child of [...this.root.children]) {
      const name = child.name || "";
      const isCorner = name.startsWith("corner-");
      if (!isCorner) continue;

      const inst = wanted.get(name);
      // si la clé n'est plus voulue OU si la ref a changé -> on retire l'objet
      if (!inst || (child.userData?.ref && child.userData.ref !== inst.ref)) {
        this.root.remove(child);
        if (this.nodes.get(name) === child) this.nodes.delete(name);
      }
    }

    // --- A) Purge des poignées "non voulues" (ex: ancien handle-1 par défaut)
    for (const child of [...this.root.children]) {
      const name = child.name || "";
      const isHandle = name === "handle-1" || name.startsWith("handle-");
      if (!isHandle) continue;
      if (!wanted.has(name)) {
        this.root.remove(child);
        if (this.nodes.get(name) === child) this.nodes.delete(name);
      }
    }

    // --- B) Pré-nettoyage strict des rails (empêche tout empilement si ref change)
    const railKeys = new Set(["rail-top", "rail-bottom"]);
    for (const child of [...this.root.children]) {
      if (railKeys.has(child.name)) {
        const inst = wanted.get(child.name);
        if (!inst || (child.userData?.ref && child.userData.ref !== inst.ref)) {
          this.root.remove(child);
          if (this.nodes.get(child.name) === child)
            this.nodes.delete(child.name);
        }
      }
    }

    // --- C) Purge des DOUBLONS pour toutes les catégories :
    //       si plusieurs Object3D portent le même name (key), on garde
    //       celui référencé par this.nodes (s'il existe), sinon le premier,
    //       et on supprime tous les autres.
    const seen = new Map(); // name -> child retenu
    for (const child of [...this.root.children]) {
      const name = child.name || "";
      if (!name) continue;

      // cible seulement les clés gérées par 'wanted'
      if (!wanted.has(name)) continue;

      const tracked = this.nodes.get(name) || null;
      const keeper = tracked || seen.get(name) || null;

      if (!keeper) {
        // premier vu : s'il n'y a pas de tracked, on retient celui-ci
        seen.set(name, child);
        if (!tracked) this.nodes.set(name, child); // resynchronise le registre
        continue;
      }

      // S'il existe déjà un keeper (ou un tracked) différent -> on supprime ce doublon
      if (keeper !== child) {
        this.root.remove(child);
        // ne touche pas à nodes (le keeper reste enregistré)
      }
    }

    // --- D) Supprimer tout node suivi qui n'est plus voulu
    for (const [key, node] of [...this.nodes]) {
      if (!wanted.has(key)) {
        this.root.remove(node);
        this.nodes.delete(key);
      }
    }

    // --- E) Créer / mettre à jour (et remplacer si la ref diffère)
    for (const inst of instances) {
      let node = this.nodes.get(inst.key);

      // Créer si absent
      if (!node) {
        if (inst.type === "box" && inst.box) {
          node = this.createBoxMesh(inst.box);
        } else {
          node = await this.instantiate(inst.ref);
        }
        node.name = inst.key;
        this.root.add(node);
        this.nodes.set(inst.key, node);
      }

      // Si c'est une box et que la taille a changé -> on remplace la géométrie
      if (inst.type === "box" && inst.box) {
        const prev = node.userData?.size;
        if (
          !node.userData ||
          node.userData.kind !== "box" ||
          !prev ||
          prev.width !== inst.box.width ||
          prev.height !== inst.box.height ||
          prev.depth !== inst.box.depth
        ) {
          // recrée proprement la mesh box
          const parent = node.parent || this.root;
          parent.remove(node);
          node = this.createBoxMesh(inst.box);
          node.name = inst.key;
          parent.add(node);
          this.nodes.set(inst.key, node);
        }
      }

      // Ref différente -> remplacement dur (évite empilement)
      if (node.userData?.ref !== inst.ref) {
        const parent = node.parent || this.root;
        parent.remove(node);

        const newNode = await this.instantiate(inst.ref);
        newNode.name = inst.key;

        // Applique la transform et props de l'instance courante
        newNode.position.set(inst.position.x, inst.position.y, inst.position.z);
        newNode.rotation.set(inst.rotation.x, inst.rotation.y, inst.rotation.z);
        newNode.scale.set(inst.scale.x, inst.scale.y, inst.scale.z);
        newNode.visible = inst.visible !== false;

        // Matériaux (au cas où la finition change en même temps)
        if (this.matLib) {
          const mat = this.matLib.getMaterial(inst.finishCode);
          if (mat)
            newNode.traverse((o) => {
              if (o.isMesh) o.material = mat;
            });
        }

        parent.add(newNode);
        this.nodes.set(inst.key, newNode);
        node = newNode;
        continue; // on a déjà tout appliqué pour ce node
      }

      // Transforms (toujours up-to-date)
      node.position.set(inst.position.x, inst.position.y, inst.position.z);
      node.rotation.set(inst.rotation.x, inst.rotation.y, inst.rotation.z);
      node.scale.set(inst.scale.x, inst.scale.y, inst.scale.z);

      // Matériaux (si seule la finition change)
      if (this.matLib) {
        const mat = this.matLib.getMaterial(inst.finishCode);
        if (mat)
          node.traverse((o) => {
            if (o.isMesh) o.material = mat;
          });
      }

      node.visible = inst.visible !== false;
    }
  }

  /**
   * Update principal : on lui passe
   *  - geometry (store)
   *  - buildInstances (fn importée de /three/layout.js)
   */
  async update({ geometry, buildInstances }) {
    if (!geometry) return;

    // Ajuster l’orbite sur la taille globale (optionnel, simple fit)
    const W = mmToM(geometry?.overall?.width || 0);
    const H = mmToM(geometry?.overall?.height || 0);
    const bbox = new THREE.Box3(
      new THREE.Vector3(-W / 2, 0, -0.1),
      new THREE.Vector3(W / 2, H, 0.1)
    );
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const idealDist =
      (maxDim * 1.6) / Math.tan((this.camera.fov * Math.PI) / 360);
    // On garde la caméra si l’utilisateur bouge, donc on ne recale PAS agressivement.
    // this.camera.position.set(0, size.y * 0.5, idealDist); // à activer si tu veux un recadrage automatique

    // Construire les instances désirées
    const instances = buildInstances(geometry);
    await this.applyInstances(instances);
  }

  /** Nettoyage */
  dispose() {
    this._running = false;
    window.removeEventListener("resize", this._onResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.traverse((o) => {
      if (o.isMesh) {
        if (o.material && o.material.dispose) o.material.dispose();
        if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      }
    });
    this.nodes.clear();
    this.modelCache.clear();
    if (this.pmremGen) {
      this.pmremGen.dispose();
      this.pmremGen = null;
    }
  }
  poseForDims({
    widthMm,
    heightMm,
    unitScale = 0.001,
    direction = [2.5, 1.6, 2.8],
    padding = 1.5,
    fov = null,
  } = {}) {
    const W = (Number(widthMm) || 0) * unitScale; // -> mètres
    const H = (Number(heightMm) || 0) * unitScale;

    if (fov != null) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    const aspect = this.camera.aspect > 0 ? this.camera.aspect : 1.5;

    // cible = centre vertical de la porte (on suppose y=0 au sol)
    const tgtY = H / 2;
    const tgt = new THREE.Vector3(0, tgtY, 0);

    // distance pour cadrer W×H
    const dist = distanceToFitWH(this.camera.fov, aspect, W, H, padding);

    // normaliser la direction
    let [dx, dy, dz] = direction;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;

    // position = cible + direction * dist
    const pos = new THREE.Vector3(
      tgt.x + dx * dist,
      tgt.y + dy * dist,
      tgt.z + dz * dist
    );

    return { pos, tgt, dist };
  }

  /**
   * Applique la pose par défaut selon des dimensions (mm) — modifie la vue utilisateur
   */
  applyDefaultPoseFromDims(opts) {
    const { pos, tgt } = this.poseForDims(opts);
    this.camera.position.copy(pos);
    if (this.controls) {
      this.controls.target.copy(tgt);
      this.controls.update();
    } else {
      this.camera.lookAt(tgt);
    }
    this.camera.updateProjectionMatrix();
  }

  /**
   * Capture PNG depuis une pose auto (sans "casser" la vue de l'utilisateur).
   * - met la caméra sur la pose calculée
   * - attends 1–2 frames + gl.finish()
   * - capture toDataURL
   * - restaure la caméra
   * @returns {Promise<{dataURL:string, width:number, height:number}>}
   */
  async captureWithAutoPose(opts) {
    const { pos, tgt } = this.poseForDims(opts);

    // sauvegarde de l'état
    const prev = {
      pos: this.camera.position.clone(),
      quat: this.camera.quaternion.clone(),
      fov: this.camera.fov,
      target: this.controls ? this.controls.target.clone() : null,
      autoClear: this.renderer.autoClear,
    };

    // appliquer la pose
    this.camera.position.copy(pos);
    if (this.controls) {
      this.controls.target.copy(tgt);
      this.controls.update();
    } else {
      this.camera.lookAt(tgt);
    }
    this.camera.updateProjectionMatrix();

    // attendre frame(s) & rendre
    await waitRaf();
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);
    const gl = this.renderer.getContext();
    try {
      gl?.finish?.();
    } catch {}
    await waitRaf();
    this.renderer.render(this.scene, this.camera);
    try {
      gl?.finish?.();
    } catch {}

    // capture
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL("image/png");
    const out = { dataURL, width: canvas.width, height: canvas.height };

    // restauration état
    this.camera.position.copy(prev.pos);
    this.camera.quaternion.copy(prev.quat);
    this.camera.fov = prev.fov;
    this.camera.updateProjectionMatrix();
    if (this.controls && prev.target) {
      this.controls.target.copy(prev.target);
      this.controls.update();
    }
    this.renderer.autoClear = prev.autoClear;

    return out;
  }
}
