import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const mmToM = (v) => (Number(v) || 0) / 1000;

export class ThreeManager {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.baseUrl = options.baseUrl || window.basePath + "glb";

    // Rendu
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // Scène & camera
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent

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
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        // On laisse le material remplacé par applyFinish plus bas
      }
    });
    return clone;
  }

  /**
   * Diff d’instances : `instances` est une liste plane de:
   * { key, ref, position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}, finishCode }
   */
  async applyInstances(instances = []) {
    const wanted = new Map(instances.map((it) => [it.key, it]));

    // 1) Supprimer ce qui n’est plus voulu
    for (const [key, node] of this.nodes) {
      if (!wanted.has(key)) {
        this.root.remove(node);
        this.nodes.delete(key);
      }
    }

    // 2) Créer / mettre à jour
    for (const inst of instances) {
      let node = this.nodes.get(inst.key);
      if (!node) {
        node = await this.instantiate(inst.ref);
        node.name = inst.key;
        this.root.add(node);
        this.nodes.set(inst.key, node);
      }

      // Transforms
      node.position.set(inst.position.x, inst.position.y, inst.position.z);
      node.rotation.set(inst.rotation.x, inst.rotation.y, inst.rotation.z);
      node.scale.set(inst.scale.x, inst.scale.y, inst.scale.z);

      // Matériaux
      if (this.matLib) {
        const mat = this.matLib.getMaterial(inst.finishCode);
        if (mat) {
          node.traverse((o) => {
            if (o.isMesh) o.material = mat;
          });
        }
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
  }
}
