// src/stores/derived.store.js
import { defineStore, storeToRefs } from "pinia";
import { computed } from "vue";
import { useConfigStore } from "./config.store";
import { ProfilesCalculator } from "../calculators/ProfilesCalculator";
import { FillingsCalculator } from "../calculators/FillingsCalculator";

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

  const W = Number(width.value) || 0;
  const fillingWidth = FillingsCalculator.calculateWidth({
    range: String(range.value),
    rail: String(rail.value),
    arrangement: String(arrangement.value || ""),
    width: W,
    leavesCount: Number(leavesCount.value) || 1,
    handle: String(handle?.value ?? ""),
  });

  const computeList = () => {
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
    // Ancien calc → tableau direct
    if (Array.isArray(res)) return res;
    // Nouveau calc → objet avec .all
    if (res && Array.isArray(res.all)) return res.all;
    return [];
  };

  // Nom attendu par l'UI historique
  const profiles = computed(computeList);
  // Alias FR si tu l’utilises ailleurs
  // const profils = computed(computeList);

  const geometry = computed(() => ({
    width: Number(width.value) || 0,
    height: Number(height.value) || 0,
    rail: String(rail.value),
    leavesCount: Number(leavesCount.value) || 1,
    fillingWidth,
  }));

  return { profiles, geometry };
});
