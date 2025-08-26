import { defineStore } from "pinia";

// Gère l'ouverture/fermeture des sections "form-wrapper"

export const useUiStore = defineStore("ui", {
  state: () => ({
    openSection: "project",
  }),

  getters: {
    isOpen: (state) => (id) => state.openSection === id,
  },

  actions: {
    toggleSection(id) {
      this.openSection = this.openSection === id ? null : id;
    },
    openSectionById(id) {
      this.openSection = id;
    },
    closeAll() {
      this.openSection = null;
    },
  },
});
