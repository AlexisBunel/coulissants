// src/stores/derived.store.js
import { defineStore, storeToRefs } from "pinia";
import { computed } from "vue";
import { useConfigStore } from "./config.store";
import { ProfilesCalculator } from "../calculators/ProfilesCalculator";

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
  } = storeToRefs(config);

  // profils (tableaux récap)
  const profiles = computed(() =>
    ProfilesCalculator.calculate({
      range: range.value,
      rail: rail.value,
      width: Number(width.value) || 0,
      height: Number(height.value) || 0,
      leavesCount: Number(leavesCount.value) || 1,
      arrangement: arrangement.value,
      traverses: traverses.value,
      finishCode: colorProfiles.value,
    })
  );

  // geometry (pour la 3D)
  const geometry = computed(() => ({
    width: Number(width.value) || 0,
    height: Number(height.value) || 0,
    rail: rail.value,
    leavesCount: Number(leavesCount.value) || 1,
  }));

  return { profiles, geometry };
});
