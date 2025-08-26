# 🚀 DevBook — Configurateur 3D en ligne

Ce document est un **guide de développement pas à pas** pour mener à bien le projet.  
Il complète le `cahier_des_charges.md` et sert de feuille de route technique.

---

## 1. 📦 Initialisation du projet

1. Créer un nouveau projet Vue 3 avec Vite :
   ```bash
   npm create vite@latest coulissants -- --template vue
   cd coulissants
   npm install
   ```
2. Installer les dépendances :
   ```bash
   npm install pinia three @vueuse/core
   ```
3. Mettre en place la structure de base :
   ```
   src/
     stores/
     calculators/
     composables/
     components/
       forms/
       summaries/
   ```

---

## 2. 🏗️ Mise en place de l’architecture Vue/Pinia

1. Créer `stores/config.store.js` :
   - Contient toutes les **valeurs saisies utilisateur**.
   - Fournit des actions simples (`setWidth`, `setHeight`, etc.).
2. Créer `stores/derived.store.js` :
   - Observe `config.store`.
   - Appelle les calculators.
   - Expose les données **prêtes à l’emploi** (profils, accessoires, 3D).
3. Vérifier avec un `console.log` que les données évoluent bien en modifiant `config`.

---

## 3. 🧮 Implémentation des calculators

1. Créer `calculators/ProfilesCalculator.js`
   - Retourne `[ { ref, description, qty } ]`.
2. Créer `calculators/AccessoriesCalculator.js`
   - Idem, pour les accessoires.
3. Créer `calculators/GlassCalculator.js`
   - Surface, épaisseur, type.
4. Créer `calculators/TraversesCalculator.js`
   - Calcule les positions des traverses selon règles métier.
   - Gère le **minimum d’espacement (200mm)**.
5. Centraliser via `composables/useCalculators.js` (`buildDerived(config)`).

---

## 4. 🧑‍🎨 UI et formulaires

1. Créer `components/PanelForm.vue` comme conteneur.
2. Créer les formulaires dans `components/forms/` :
   - `DimensionsForm.vue` (largeur/hauteur).
   - `RailsForm.vue` (simple/double).
   - `TraversesForm.vue` (nombre/type + bouton réinit).
   - `OptionsForm.vue` (freins, etc.).
3. Chaque champ → lié au `config.store` avec `v-model` ou `@input`.
4. Vérifier : les changements apparaissent dans `config.store`.

---

## 5. 📊 Tableaux récapitulatifs

1. Créer `components/summaries/ProfilesTable.vue`.
2. Faire la même chose pour `AccessoriesTable.vue` et `GlassTable.vue`.
3. Connecter à `derived.store` → afficher dynamiquement les résultats.
4. Vérifier : quand je modifie un champ du formulaire → le tableau change.

---

## 6. 🎨 Canvas 3D

1. Créer `components/Canvas3D.vue` avec une balise `<canvas>`.
2. Implémenter `composables/useThreeScene.js` :
   - Initialisation Three.js (scène, caméra, lumière, renderer).
   - `updateGeometry(geometry)` pour redessiner la structure.
3. Premier rendu simple :
   - Afficher un rectangle = panneau (width/height).
   - Ajouter rails et traverses comme cubes/rectangles.
4. Connecter à `derived.geometry` via un `watch`.
5. Vérifier : changer largeur/hauteur → la 3D s’actualise.

---

## 7. 🧹 Nettoyage et bonnes pratiques

1. Vérifier que chaque fichier a un rôle unique.
2. Supprimer toute logique métier des composants → doit être dans calculators.
3. Vérifier la lisibilité des formulaires (labels, spacing).
4. Ajouter un peu de style CSS global (sobriété, responsive).

---

## 8. ✅ Validation progressive

- Étape 1 : Formulaires fonctionnent (config store OK).
- Étape 2 : Calculators renvoient les bonnes données.
- Étape 3 : Tables affichent les données dérivées.
- Étape 4 : Canvas 3D réagit aux changements.
- Étape 5 : Règles métier validées (espacement traverses, rail/gamme).

---

## 9. 🔮 Évolutions futures

- Ajout d’options avancées (couleurs, textures).
- Export PDF / XML / JSON.
- Gestion multi-vantaux.
- Sauvegarde localStorage (optionnel).
- Améliorations 3D (matériaux, rendu réaliste).

---

## 10. 🗺️ Ordre recommandé de développement

1. **Initialiser projet + stores de base**
2. **Formulaires simples (Dimensions)**
3. **Derived store minimal (juste largeur/hauteur → geometry)**
4. **Canvas 3D basique (panneau rectangulaire)**
5. **Ajout calculator Profiles + table correspondante**
6. **Ajout calculator Accessories + table**
7. **Ajout calculator Glass + table**
8. **Traverses (formulaire + calculator + affichage 3D)**
9. **Options diverses**
10. **Nettoyage + refactoring + tests manuels**

---

✍️ **Astuce** :  
Travaille **en incréments fonctionnels** → à chaque étape, tu dois avoir quelque chose de visible (même simplifié) qui fonctionne avant d’ajouter de la complexité.
