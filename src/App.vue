<template>
  <header>
    <h1>PORTES COULISSANTES</h1>
    <h2>À faire : Limiter finitions avec Monorail</h2>
  </header>
  <main id="canvas-wrapper">
    <div id="sticky-container">
      <section id="three-canvas">
        <canvas id="canvas"></canvas>
      </section>
      <section id="forms">
        <ProjectForm />
        <GammeForm />
        <RailForm />
        <PoigneeForm />
        <!-- <DimensionsForm />
        <TraversesForm />
        <FreinForm />
        <RemplissageForm /> -->
      </section>
    </div>
    <!-- <Recap /> -->
  </main>
</template>

<script setup>
import ProjectForm from "./components/forms/ProjectForm.vue";
import GammeForm from "./components/forms/GammeForm.vue";
import RailForm from "./components/forms/RailForm.vue";
import PoigneeForm from "./components/forms/PoigneeForm.vue";
// import DimensionsForm from "./components/DimensionsForm.vue";
// import TraversesForm from "./components/TraversesForm.vue";
// import FreinForm from "./components/FreinForm.vue";
// import Recap from "./components/Recap.vue";
// import RemplissageForm from "./components/RemplissageForm.vue";
</script>
