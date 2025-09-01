// src/stores/derived.store.js
import { defineStore, storeToRefs } from "pinia";
import { computed } from "vue";
import { useConfigStore } from "./config.store";
import { ProfilesCalculator } from "../calculators/ProfilesCalculator";
import { FINISH_LABEL } from "../data/finishes";

export const useDerivedStore = defineStore("derived", () => {
  const config = useConfigStore();
  const {
    range,
    rail,
    width,
    height,
    leavesCount,
    arrangement,
    traverses,
    colorProfiles,
    tick,
    handle,
  } = storeToRefs(config);

  // --- Helpers ----------------------------
  function rowsFromCalc() {
    const res = ProfilesCalculator.calculate({
      range: String(range.value),
      rail: String(rail.value),
      width: Number(width.value) || 0,
      height: Number(height.value) || 0,
      leavesCount: Number(leavesCount.value) || 1,
      arrangement: String(arrangement.value || ""),
      traverses: traverses.value,
      finishCode: String(colorProfiles.value || ""),
      tick: String(tick?.value ?? ""),
      handle: String(handle?.value ?? ""),
    });
    if (Array.isArray(res)) return res; // ancien calc: tableau direct
    return Array.isArray(res?.all) ? res.all : []; // nouveau calc: objet { all, ... }
  }

  // Infère la ref TI attendue si la ligne TI n'est pas (encore) dans rows.
  // (Mimique la logique du ProfilesCalculator) 16/19 -> TI16/TI19, 28/37 -> TI28/TI37
  function inferTIRef({ range, tick, traverseType }) {
    const r = String(range || "").toUpperCase();
    if (r === "96") {
      const t = String(tick || "").replace(/\s/g, "");
      if (t === "16") return "TI16";
      if (t === "19") return "TI19";
      return "TI19"; // fallback
    }
    if (r === "96CA") {
      const ty = String(traverseType || "");
      if (ty === "28") return "TI28";
      if (ty === "37") return "TI37";
      return null;
    }
    return null;
  }

  function shapeProfiles(rows) {
    const find = (rx) => rows.find((r) => rx.test(String(r?.ref || "")));
    const filter = (rx) => rows.filter((r) => rx.test(String(r?.ref || "")));

    const rt = find(/^RH/);
    const rb = find(/^RB/);
    const hd = find(/^P/);
    const thb = find(/^THB/); // traverse basse 96CA (THB52)
    const tis = filter(/^TI/); // toutes les TI (TI16/TI19/TI28/TI37)

    // Finish
    const finishCode = String(colorProfiles.value || "");
    const finishLabel =
      FINISH_LABEL[finishCode] || rows[0]?.finishLabel || finishCode;

    // Leaves -> heights depuis config.traverses.groups
    const n = Math.max(1, Number(leavesCount.value) || 1);
    const same = !!traverses.value?.sameForAllLeaves;
    const groups = Array.isArray(traverses.value?.groups)
      ? traverses.value.groups
      : [];
    const leaves = {};
    for (let i = 0; i < n; i++) {
      const g = same ? groups[0] : groups[i];
      leaves[String(i + 1)] = {
        height: Array.isArray(g?.heights) ? g.heights.slice() : [],
      };
    }

    // Type global des traverses intermédiaires
    const traverseType =
      String(traverses.value?.type ?? groups?.[0]?.type ?? "") || null;

    // --- Séparation des TI top vs TI intermédiaires (cas 96CA) ---
    // Règle : en 96CA la traverse "haute" est aussi une TI28 fournie par le calculateur,
    // avec une quantité == nombre de vantaux (n). Les TI intermédiaires peuvent coexister.
    let tiTop = null;
    let tiInter = null;

    if (String(range.value).toUpperCase() === "96CA") {
      // candidate "top": TI28 dont qty === leavesCount (celle renvoyée par calcTopTraverses)
      tiTop = tis.find((r) => r.ref === "TI28" && Number(r.qty) === n) || null;
      // intermédiaires = toutes les TI sauf la "top"
      tiInter = tis.find((r) => r !== tiTop) || null;
    } else {
      // Gammes 82/96 : pas de "top" TI, toutes les TI trouvées sont intermédiaires (souvent une seule)
      tiInter = tis[0] || null;
    }

    // Si aucune ligne TI intermédiaire présente mais que l'utilisateur change le type,
    // on infère la ref attendue pour que l'UI reflète immédiatement le changement.
    const inferredTIRef = inferTIRef({
      range: range.value,
      tick: tick?.value,
      traverseType,
    });

    // --- Construction de l'objet structuré ---
    const Profiles = {
      RT: rt
        ? { Ref: rt.ref, Length: rt.length, qty: rt.qty }
        : { Ref: null, Length: 0, qty: 0 },
      RB: rb
        ? { Ref: rb.ref, Length: rb.length, qty: rb.qty }
        : { Ref: null, Length: 0, qty: 0 },
      Handle: hd
        ? { Ref: hd.ref, Length: hd.length ?? 0, qty: hd.qty ?? n }
        : { Ref: String(handle.value || ""), Length: 0, qty: n },

      // TI intermédiaires (référence mise à jour même si seule "Type" change)
      TI: tiInter
        ? {
            Ref: tiInter.ref,
            Length: tiInter.length ?? 0,
            Type: traverseType,
            Leaves: leaves,
          }
        : {
            Ref: inferredTIRef, // <= reflète le changement de type/tick même sans ligne TI dans rows
            Length: 0,
            Type: traverseType,
            Leaves: leaves,
          },

      // Traverse Haute (96CA) = TI28 'top'
      TH: tiTop
        ? { Ref: tiTop.ref, Length: tiTop.length ?? 0, qty: tiTop.qty ?? 0 }
        : { Ref: null, Length: 0, qty: 0 },

      // Traverse Basse (96CA) = THB52
      TB: thb
        ? { Ref: thb.ref, Length: thb.length ?? 0, qty: thb.qty ?? 0 }
        : { Ref: null, Length: 0, qty: 0 },

      Corner: (() => {
        const ccla = find(/^CCLA/);
        return ccla
          ? { Ref: ccla.ref, Length: ccla.length ?? 0, qty: ccla.qty ?? 0 }
          : { Ref: null, Length: 0, qty: 0 };
      })(),

      finish: { code: finishCode, label: finishLabel },
    };

    return { Profiles };
  }

  // --- Sortie "lisible" -------------------
  const profils = computed(() => shapeProfiles(rowsFromCalc()));

  // --- Données géométriques utiles 3D -----
  const geometry = computed(() => ({
    width: Number(width.value) || 0,
    height: Number(height.value) || 0,
    rail: String(rail.value),
    leavesCount: Math.max(1, Number(leavesCount.value) || 1),
  }));

  return { profils, geometry };
});
