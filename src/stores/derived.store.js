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

  function shapeProfiles(rows) {
    const find = (rx) => rows.find((r) => rx.test(String(r?.ref || "")));

    const rt = find(/^RH/);
    const rb = find(/^RB/);
    const hd = find(/^P/);
    const ti = find(/^TI/);
    const thb = find(/^THB/);
    const ccla = find(/^CCLA/);

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

    // 👉 Type global des traverses intermédiaires (sécurisé)
    const traverseType =
      String(traverses.value?.type ?? groups?.[0]?.type ?? "") || null;

    return {
      Profiles: {
        RT: rt
          ? { Ref: rt.ref, Length: rt.length, qty: rt.qty }
          : { Ref: null, Length: 0, qty: 0 },
        RB: rb
          ? { Ref: rb.ref, Length: rb.length, qty: rb.qty }
          : { Ref: null, Length: 0, qty: 0 },
        Handle: hd
          ? { Ref: hd.ref, Length: hd.length ?? 0, qty: hd.qty ?? n }
          : { Ref: String(handle.value || ""), Length: 0, qty: n },

        // ⬇️ Ajout du Type dans TI
        TI: ti
          ? {
              Ref: ti.ref,
              Length: ti.length ?? 0,
              Type: traverseType,
              Leaves: leaves,
            }
          : { Ref: null, Length: 0, Type: traverseType, Leaves: leaves },

        THB: thb
          ? { Ref: thb.ref, Length: thb.length ?? 0, qty: thb.qty ?? 0 }
          : { Ref: null, Length: 0, qty: 0 },
        Corner: ccla
          ? { Ref: ccla.ref, Length: ccla.length ?? 0, qty: ccla.qty ?? 0 }
          : { Ref: null, Length: 0, qty: 0 },
        finish: { code: finishCode, label: finishLabel },
      },
    };
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
