# 📘 Cahier des Charges — Configurateur 3D en ligne

## 1. 🎯 Objectif du projet

- Développer un configurateur 3D **en ligne** (navigateur web) permettant :
  - De saisir des paramètres dans des formulaires (dimensions, options, traverses…).
  - De générer **automatiquement** :
    - Un visuel 3D interactif.
    - Des tableaux récapitulatifs (profils, accessoires, vitrages…).
  - De conserver la **simplicité** (pas de routes, pas de persistance externe).
- Cible : utilisation interne (bureau d’études, commerciaux) ou clients finaux.

---

## 2. 🖥️ Technologies retenues

- **Framework Frontend** : Vue 3 + Vite
- **Gestion d’état** : Pinia
- **UI** : HTML + CSS (style sobre, adaptable à un widget intégré dans une autre page)
- **3D** : Three.js (ou équivalent minimaliste)
- **Organisation** : fichiers `.vue` par formulaire
- **Pas de backend** (hors périmètre) — tout tourne côté navigateur

---

## 3. 🧩 Architecture logicielle

### 3.1 Structure des fichiers

```
src/
  main.js
  stores/
    config.store.js       // valeurs saisies utilisateur
    derived.store.js      // valeurs dérivées (calculées)
  calculators/            // logique métier pure
    ProfilesCalculator.js
    AccessoriesCalculator.js
    GlassCalculator.js
    TraversesCalculator.js
  composables/
    useCalculators.js     // appelle les calculators et renvoie un objet complet
    useThreeScene.js      // gestion du canvas 3D
  components/
    Canvas3D.vue
    PanelForm.vue
    forms/
      DimensionsForm.vue
      RailsForm.vue
      TraversesForm.vue
      OptionsForm.vue
    summaries/
      ProfilesTable.vue
      AccessoriesTable.vue
      GlassTable.vue
App.vue
```

### 3.2 Flux de données

1. **Formulaires** → modifient `config.store`
2. **Derived store** → observe `config`, appelle `calculators`, expose les résultats
3. **Composants Vue** :
   - `Canvas3D.vue` → lit `derived.geometry`
   - `Tables.vue` → lisent `derived.profiles`, `derived.accessories`, etc.

---

## 4. 🧑‍💻 Stores (Pinia)

### 4.1 `config.store.js`

Contient les **entrées utilisateur** :

- Projet : `name`
- Gamme : `gamme`
- Épaisseur du remplissage : `tick`
- Dimensions : `width`, `height`
- Nombre de vanteaux : `leaf_count`
- Rail : `rail`
- Poignée : `finish`, `ref`
- Traverses : type, nombre, hauteurs par vantail, vantail...
- Options diverses (`frlamelle`, `fram`, `freco`)
- (autres à compléter…)

### 4.2 `derived.store.js`

Expose les **valeurs calculées** :

- `profiles` → liste avec réf, description, quantité
- `accessories` → idem
- `glass` → surfaces / références
- `geometry` → données pour le canvas 3D (dimensions, positions de traverses…)

---

## 5. 📐 Calculs (calculators/)

- **ProfilesCalculator** : calcule les profils nécessaires selon largeur/hauteur/rail
- **AccessoriesCalculator** : calcule les accessoires (charnières, freins…)
- **GlassCalculator** : calcule surface, épaisseur, type de verre

---

## 6. 🖌️ Interface utilisateur

### 6.1 Disposition générale

- **Canvas 3D** : partie gauche (zone principale)
- **Panel de formulaires** : partie droite (wrapper)
- **Tableaux récapitulatifs** : bas de page

### 6.2 Formulaires (un composant par section)

- **NameForm**
  - Nom du projet
- **GammeForm**
  - Gamme :
    - 82
    - 96
    - 96 - CADRALU
  - Épaisseur :
    - 16mm
    - 19mm
    - 6-8mm
    - 12mm
- **RailsForm**
  - Type de rail (simple/double)
  - Affiché uniquement si `gamme != 82`
- **DimensionsForm**
  - Largeur
  - Hauteur
  - Nombre de vantaux
- **PoignéeForm**
  - Finition
  - Selection de la poignée (liste varible en fonction de la gamme, et de la finition)
- **TraversesForm**
  - Vantaux identique : Y/N
  - Type (28/37… selon gamme)
  - Wrapper pour chaque traverse si non identiques, sinon un seul wrapper
    - Nombre de traverses
    - hauteur des traverses
    - Bouton “Réinitialiser” (recalcul des hauteurs)
- **FreinsForm**
  - Quantités Freins (lamelles, amortisseurs, éco…)
- **optionsForm**
  - Couleur joints de butée
  - Couleur joints profils de vitrages

### 6.3 Tableaux

- **ProfilesTable** : réf / désignation / finition / quantité / longueur
- **AccessoriesTable** : réf / désignation / finition / quantité / longueur
- **GlassTable** : désignation / épaisseur / quantité / dimension / surface (m2)

---

## 7. 🎨 Canvas 3D

- Utilisation de **Three.js**
- Scène minimaliste :
  - Panneau (largeur/hauteur)
  - Traverses (lignes/rectangles)
  - Rail (haut/bas selon choix)
  - Poignées
- Paramètres modifiés en live selon `derived.geometry`
- Interaction minimale : zoom / rotation caméra orbitale

---

## 8. ✅ Contraintes

- **Simplicité** : pas de routes, pas de backend
- **Réactivité** : chaque changement de formulaire met à jour instantanément :
  - Les tableaux récapitulatifs
  - Le visuel 3D
- **Lisibilité du code** : découpage clair en fichiers
- **Extensibilité** : facile à ajouter de nouvelles options (ex. couleurs, vitrages spéciaux)

---

## 9. 📅 Évolutions futures (hors périmètre actuel)

- Export PDF (devis)
- Export XML/JSON (vers ERP Codial)
- Sauvegarde config (localStorage ou API)
- Choix de couleurs / textures
- Multi-vantaux avancés

---

## 10. 🔎 Annexes

à faire
