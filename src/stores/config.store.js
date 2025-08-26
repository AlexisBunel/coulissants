import { defineStore } from "pinia";

const TICKS_BY_RANGE = {
  96: ["16", "19"],
  "96CA": ["6-8", "12"],
  82: ["19"],
};

const FINISHES = {
  82: ["LBL", "SA", "BR"],
  96: {
    16: ["LBL", "SA", "LNOG", "PB", "BR"],
    19: ["LBL", "SA", "LNOG", "L9002G", "BI", "PB", "BR"],
  },
  "96CA": ["LBLG", "LBL", "SA", "LNOG", "BI", "BR"],
};

const FINISH_LABEL = {
  LBL: "Laqué Blanc 9010",
  LBLG: "Laqué Blanc 9003 Granité",
  L9002G: "Laqué Blanc Gris 9002 Granité",
  SA: "Anodisé Argent",
  LNOG: "Laqué Noir 9005 Granité",
  BI: "Inox Brossé",
  PB: "Bronze Poli",
  BR: "Brut",
};

const HANDLES = {
  82: ["P100", "P110"],
  96: {
    16: ["P300-16"],
    19: [
      { value: "P30", finishes: ["BR", "LBLG", "LNOG"] },
      { value: "P200", finishes: ["BR", "SA", "LBL"] },
      {
        value: "P300-19",
        finishes: ["BR", "SA", "LBL", "LNOG", "L9002G", "PB"],
      },
      { value: "P400", finishes: ["BR", "SA", "LBL", "LNOG"] },
      {
        value: "P600",
        finishes: ["BR", "SA", "LBL", "LNOG", "L9002G", "PB", "BI"],
      },
      { value: "P700", finishes: ["BR", "SA", "LBL", "LNOG", "L9002G", "BI"] },
      { value: "P710", finishes: ["BR", "SA", "LBL", "LNOG", "L9002G", "BI"] },
    ],
  },
  "96CA": ["P810"],
};

export const useConfigStore = defineStore("config", {
  state: () => ({
    name: "", // Nom du projet
    range: "82", // '82', '96', '96CA'
    tick: "19", // Épaisseur
    rail: "double", // 'simple', 'double' (forcé à "double" si gamme === '82')
    arrangement: "quinconce", // 'quinconce', 'centre'
    width: 1200,
    height: 2100,
    leavesCount: 2, // Nombre de vantaux
    handle: "P100", //Poignée
    colorProfiles: "SA",
    traverses: {
      groups: [
        // groupe 0 (vantail 1)
        {
          type: "28", // '7', '25', '28' ou '37',
          count: 0, // nombre de traverses par vantail (0 au départ),
          heights: [], // valeurs (mm) depuis le bas du panneau jusqu'au centre/sous-traverse suivant la gamme
        },
      ],
      sameForAllLeaves: true, // si plusieurs vantaux, appliquer identique à tous
    },
    absorber: {
      frlamelle: 0, // freins à lamelles
      fram: 0, // freins amortisseurs
      freco: 0, // freins éco
    },
    filling: "standard", // 'standard', 'verre'
    colorBrushes: "",
    colorSeal: "",
    colorPGlass: "",
  }),

  /**
   * Recalcul un formulaire lorsqu'un un autre formulaire change
   */
  getters: {
    showRailsForm: (state) => state.range !== "82",

    tickOptions: (s) => {
      const list = TICKS_BY_RANGE[String(s.range)] || ["19"];
      return list.map((v) => ({
        value: v,
        label: `${v.replace("-", " - ")} mm`,
      }));
    },

    finishOptions: (s) => {
      const r = String(s.range);
      const t = String(s.tick);

      const codes = Array.isArray(FINISHES[r])
        ? FINISHES[r]
        : FINISHES[r]?.[t] || [];

      return codes.map((code) => ({
        value: code,
        label: FINISH_LABEL[code] || code,
      }));
    },

    handleOptions: (s) => {
      const r = String(s.range);
      const t = String(s.tick);
      const finish = String(s.colorProfiles);

      if (r === "96" && t === "19") {
        return HANDLES["96"]["19"]
          .filter((h) => h.finishes.includes(finish))
          .map((h) => ({ value: h.value, label: h.value }));
      }

      const list =
        r === "96" && t === "16"
          ? HANDLES["96"]["16"]
          : Array.isArray(HANDLES[r])
          ? HANDLES[r]
          : [];

      return list.map((v) => ({ value: v, label: v }));
    },
  },

  actions: {
    // Patch générique
    patch(payload) {
      Object.assign(this.$state, payload);
    },

    setName(name) {
      const n = (name ?? "").toString().trim().slice(0, 80);
      this.name = n;
    },

    setRange(v) {
      this.range = String(v);
      if (this.range === "82") this.rail = "double";

      const valid = TICKS_BY_RANGE[this.range] || ["19"];
      if (!valid.includes(this.tick)) this.tick = valid[0];

      this.setColorProfile(this.colorProfiles);
      this.setHandle(this.handle);
    },

    setRail(v) {
      if (this.range === "82") {
        this.rail = "double";
        return;
      }
      this.rail = String(v) === "simple" ? "simple" : "double";
    },

    setTick(v) {
      const value = String(v);
      const valid = TICKS_BY_RANGE[this.range] || ["19"];
      this.tick = valid.includes(value) ? value : valid[0];
      this.setColorProfile(this.colorProfiles);
      this.setHandle(this.handle);
    },

    setColorProfile(v) {
      const val = String(v);
      const allowed = this.finishOptions.map((o) => o.value);
      this.colorProfiles = allowed.includes(val) ? val : allowed[0] || "";

      const allowedHandles = this.handleOptions.map((o) => o.value);
      if (!allowedHandles.includes(this.handle)) {
        this.handle = allowedHandles[0] || "";
      }
    },

    setHandle(v) {
      const val = String(v);
      const allowed = this.handleOptions.map((o) => o.value);
      this.handle = allowed.includes(val) ? val : allowed[0] || "";
    },

    setWidth(mm) {
      this.width = Math.max(0, Math.floor(Number(mm) || 0));
    },
    setHeight(mm) {
      this.height = Math.max(0, Math.floor(Number(mm) || 0));
    },

    // // --- Traverses ---
    // setTraverseType(type) {
    //   this.traverses.type = String(type);
    // },

    // setTraverseCount(count) {
    //   const n = Math.max(0, Math.floor(Number(count) || 0));
    //   this.traverses.count = n;

    //   // Adapter le tableau de hauteurs du premier groupe
    //   const g0 = this.traverses.groups[0];
    //   if (!g0) this.traverses.groups[0] = { heights: [] };

    //   const arr = this.traverses.groups[0].heights || [];
    //   if (n > arr.length) {
    //     // on complète par des zéros (les calculators s’occuperont du vrai placement)
    //     this.traverses.groups[0].heights = arr.concat(
    //       Array(n - arr.length).fill(0)
    //     );
    //   } else {
    //     // on coupe si besoin
    //     this.traverses.groups[0].heights = arr.slice(0, n);
    //   }
    // },

    // setTraverseHeight(index, value, groupIndex = 0) {
    //   const n = Math.max(0, Math.floor(Number(value) || 0));
    //   const group =
    //     this.traverses.groups[groupIndex] ||
    //     (this.traverses.groups[groupIndex] = { heights: [] });
    //   const count = this.traverses.count;

    //   if (index < 0 || index >= count) return;
    //   // on s’assure que le tableau a la bonne taille
    //   while (group.heights.length < count) group.heights.push(0);
    //   group.heights[index] = n;

    //   // si configuration identique pour tous les vantaux
    //   if (this.traverses.sameForAllLeaves) {
    //     for (let gi = 1; gi < this.traverses.groups.length; gi++) {
    //       const g =
    //         this.traverses.groups[gi] ||
    //         (this.traverses.groups[gi] = { heights: [] });
    //       while (g.heights.length < count) g.heights.push(0);
    //       g.heights[index] = n;
    //     }
    //   }
    // },

    // toggleSameTraverses(value) {
    //   this.traverses.sameForAllLeaves = !!value;
    // },

    // /**
    //  * Réinitialise les hauteurs (0). Le calcul automatique d’un placement
    //  * “joli” est volontairement laissé aux calculators pour garder le store simple.
    //  */
    // resetTraverseHeights(groupIndex = 0) {
    //   const count = this.traverses.count;
    //   const group =
    //     this.traverses.groups[groupIndex] ||
    //     (this.traverses.groups[groupIndex] = { heights: [] });
    //   group.heights = Array.from({ length: count }, () => 0);

    //   if (this.traverses.sameForAllLeaves) {
    //     for (let gi = 1; gi < this.traverses.groups.length; gi++) {
    //       if (!this.traverses.groups[gi])
    //         this.traverses.groups[gi] = { heights: [] };
    //       this.traverses.groups[gi].heights = Array.from(
    //         { length: count },
    //         () => 0
    //       );
    //     }
    //   }
    // },

    // // --- Options ---
    // setFreins({ frlamelle, fram, freco } = {}) {
    //   if (frlamelle != null)
    //     this.options.frlamelle = Math.max(
    //       0,
    //       Math.floor(Number(frlamelle) || 0)
    //     );
    //   if (fram != null)
    //     this.options.fram = Math.max(0, Math.floor(Number(fram) || 0));
    //   if (freco != null)
    //     this.options.freco = Math.max(0, Math.floor(Number(freco) || 0));
    // },

    // // (optionnel) initialisation rapide si tu veux changer le preset par défaut
    // loadPreset(preset) {
    //   // preset attendu au format partiel du state
    //   // ex: { gamme:'96CA', rail:'double', width:1000, height:2000, traverses:{...}, options:{...} }
    //   // on applique proprement :
    //   if (preset?.gamme != null) this.setGamme(preset.gamme);
    //   if (preset?.rail != null) this.setRail(preset.rail);
    //   if (preset?.width != null) this.setWidth(preset.width);
    //   if (preset?.height != null) this.setHeight(preset.height);

    //   if (preset?.traverses) {
    //     const t = preset.traverses;
    //     if (t.type != null) this.setTraverseType(t.type);
    //     if (t.count != null) this.setTraverseCount(t.count);
    //     if (Array.isArray(t.groups)) {
    //       // remplace les groupes (en gardant la même structure)
    //       this.traverses.groups = t.groups.map((g) => ({
    //         heights: Array.isArray(g.heights) ? g.heights.slice() : [],
    //       }));
    //     }
    //     if (t.sameForAllLeaves != null)
    //       this.traverses.sameForAllLeaves = !!t.sameForAllLeaves;
    //   }

    //   if (preset?.options) {
    //     this.setFreins(preset.options);
    //   }
    // },
  },
});
