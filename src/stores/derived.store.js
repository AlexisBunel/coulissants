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

  const raw = computed(() =>
    ProfilesCalculator.compute({
      range: String(range.value),
      rail: String(rail.value),
      width: Number(width.value) || 0,
      height: Number(height.value) || 0,
      leavesCount: Number(leavesCount.value) || 1,
      arrangement: String(arrangement.value || ""),
      traverses: traverses.value,
      tick: String(tick?.value ?? ""),
      handle: String(handle?.value ?? ""),
    })
  ); // -> { rails:{top,bottom}, handle, corner, traverses:{top,bottom,intermediate}, meta:{...} }

  const profils = computed(() => {
    const r = raw.value;
    const finishCode = String(colorProfiles.value || "");
    const finishLabel = FINISH_LABEL[finishCode] || finishCode;

    // Rails
    const RT = r?.rails?.top
      ? {
          Ref: r.rails.top.ref,
          Length: r.rails.top.length,
          qty: r.rails.top.qty,
        }
      : { Ref: null, Length: 0, qty: 0 };

    const RB = r?.rails?.bottom
      ? {
          Ref: r.rails.bottom.ref,
          Length: r.rails.bottom.length,
          qty: r.rails.bottom.qty,
        }
      : { Ref: null, Length: 0, qty: 0 };

    // Poignée
    const nLeaves = Math.max(1, Number(leavesCount.value) || 1);
    const Handle = r?.handle
      ? {
          Ref: r.handle.ref,
          Length: r.handle.length ?? 0,
          qty: r.handle.qty ?? nLeaves,
        }
      : { Ref: String(handle.value || ""), Length: 0, qty: nLeaves };

    // Vantaux (heights) recopiés depuis la config
    const same = !!traverses.value?.sameForAllLeaves;
    const groups = Array.isArray(traverses.value?.groups)
      ? traverses.value.groups
      : [];
    const Leaves = {};
    for (let i = 0; i < nLeaves; i++) {
      const g = same ? groups[0] : groups[i];
      Leaves[String(i + 1)] = {
        height: Array.isArray(g?.heights) ? g.heights.slice() : [],
      };
    }

    // Type global des traverses intermédiaires
    const traverseType =
      String(traverses.value?.type ?? groups?.[0]?.type ?? "") || null;

    // TI
    const TI = r?.traverses?.intermediate
      ? {
          Ref: r.traverses.intermediate.ref,
          Length: r.traverses.intermediate.length ?? 0,
          Type: traverseType,
          Leaves,
        }
      : { Ref: null, Length: 0, Type: traverseType, Leaves };

    // TH
    const TH = r?.traverses?.top
      ? {
          Ref: r.traverses.top.ref,
          Length: r.traverses.top.length ?? 0,
          qty: r.traverses.top.qty ?? 0,
        }
      : { Ref: null, Length: 0, qty: 0 };

    // TB
    const TB = r?.traverses?.bottom
      ? {
          Ref: r.traverses.bottom.ref,
          Length: r.traverses.bottom.length ?? 0,
          qty: r.traverses.bottom.qty ?? 0,
        }
      : { Ref: null, Length: 0, qty: 0 };

    // Cornière
    const Corner = r?.corner
      ? {
          Ref: r.corner.ref,
          Length: r.corner.length ?? 0,
          qty: r.corner.qty ?? 0,
        }
      : { Ref: null, Length: 0, qty: 0 };

    return {
      Profiles: {
        RT,
        RB,
        Handle,
        TI,
        TH,
        TB,
        Corner,
        finish: { code: finishCode, label: finishLabel },
      },
    };
  });

  // Données géométriques utiles 3D
  const geometry = computed(() => ({
    width: Number(width.value) || 0,
    height: Number(height.value) || 0,
    rail: String(rail.value),
    leavesCount: Math.max(1, Number(leavesCount.value) || 1),
  }));

  return { raw, profils, geometry };
});
