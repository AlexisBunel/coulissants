import { defineStore } from "pinia";
import { ProfilesCalculator } from "../calculators/ProfilesCalculator";

const TICKS_BY_RANGE = {
  96: ["16", "19"],
  "96CA": ["6-8", "10-12"],
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

const SIMPLE_RAIL_ALLOWED_FINISHES = ["BR", "SA", "LBL", "LNOG"];

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
    colorBrushes: "Noir",
    colorSeal: "Noir",
    colorPGlass: "Translucide",
  }),

  getters: {
    // geometry: (s) => ({
    //   width: Number(s.width) || 0,
    //   height: Number(s.height) || 0,
    //   rail: s.rail,
    //   leavesCount: Number(s.leavesCount) || 1,
    // }),

    // profiles: (s) =>
    //   ProfilesCalculator.calculate({
    //     range: s.range,
    //     rail: s.rail,
    //     handle: s.handle,
    //     width: Number(s.width) || 0,
    //     height: Number(s.height) || 0,
    //     leavesCount: Number(s.leavesCount) || 1,
    //     arrangement: s.arrangement,
    //     traverses: s.traverses,
    //     finishCode: s.colorProfiles,
    //   }),

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

      const baseCodes = Array.isArray(FINISHES[r])
        ? FINISHES[r]
        : FINISHES[r]?.[t] || [];

      const codes =
        s.rail === "simple"
          ? baseCodes.filter((c) => SIMPLE_RAIL_ALLOWED_FINISHES.includes(c))
          : baseCodes;

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
      if (this.range === "96CA") this.filling = "verre";

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

      if (this.rail === "simple") {
        const allowedFinishes = this.finishOptions.map((o) => o.value); // déjà filtrées par rail simple
        if (!allowedFinishes.includes(this.colorProfiles)) {
          this.setColorProfile(allowedFinishes[0] || "");
        }
      }
    },

    setTick(v) {
      const value = String(v);
      const valid = TICKS_BY_RANGE[this.range] || ["19"];
      this.tick = valid.includes(value) ? value : valid[0];
      if (this.tick === "10-12") {
        this.colorPGlass = "Translucide";
      }
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

    setTraverseType(type) {
      this.traverses.type = String(type);
      if (this.traverses.groups?.[0])
        this.traverses.groups[0].type = String(type);
    },
    setTraverseCount(count) {
      const n = Math.max(0, Math.floor(Number(count) || 0));
      this.traverses.count = n;
      const g0 =
        this.traverses.groups[0] ||
        (this.traverses.groups[0] = {
          type: this.traverses.type,
          count: n,
          heights: [],
        });
      while (g0.heights.length < n) g0.heights.push(0);
      if (g0.heights.length > n) g0.heights = g0.heights.slice(0, n);
      g0.count = n;
    },
    setTraverseHeight(index, mm, groupIndex = 0) {
      const n = Math.max(0, Math.floor(Number(mm) || 0));
      const count = this.traverses.count;
      const g =
        this.traverses.groups[groupIndex] ||
        (this.traverses.groups[groupIndex] = {
          type: this.traverses.type,
          count,
          heights: [],
        });
      while (g.heights.length < count) g.heights.push(0);
      if (index >= 0 && index < count) g.heights[index] = n;
      if (this.traverses.sameForAllLeaves) {
        for (let gi = 1; gi < this.traverses.groups.length; gi++) {
          const gg =
            this.traverses.groups[gi] ||
            (this.traverses.groups[gi] = {
              type: this.traverses.type,
              count,
              heights: [],
            });
          while (gg.heights.length < count) gg.heights.push(0);
          gg.heights[index] = n;
        }
      }
    },
    resetTraverseHeights(groupIndex = 0) {
      const n = this.traverses.count;
      const g =
        this.traverses.groups[groupIndex] ||
        (this.traverses.groups[groupIndex] = {
          type: this.traverses.type,
          count: n,
          heights: [],
        });
      g.heights = Array.from({ length: n }, () => 0);
      if (this.traverses.sameForAllLeaves) {
        for (let gi = 1; gi < this.traverses.groups.length; gi++) {
          const gg =
            this.traverses.groups[gi] ||
            (this.traverses.groups[gi] = {
              type: this.traverses.type,
              count: n,
              heights: [],
            });
          gg.heights = Array.from({ length: n }, () => 0);
        }
      }
    },
    toggleSameTraverses(v) {
      this.traverses.sameForAllLeaves = !!v;
    },
  },
});
