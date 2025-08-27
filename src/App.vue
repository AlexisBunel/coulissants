<template>
  <header>
    <h1>PORTES COULISSANTES</h1>
  </header>
  <main id="canvas-wrapper">
    <div id="sticky-container">
      <section id="three-canvas">
        <Canvas3D />
      </section>
      <section id="forms">
        <ProjectForm />
        <GammeForm />
        <RailForm />
        <PoigneeForm />
        <DimensionsForm />
        <TraversesForm />
        <!-- <FreinForm />
        <RemplissageForm /> -->
      </section>
    </div>
    <section id="recapitulatif" role="complementary">
      <h2>RÉCAPITULATIFS</h2>
      <ProfilesTable />
    </section>
  </main>
</template>

<script setup>
import ProjectForm from "./components/forms/ProjectForm.vue";
import GammeForm from "./components/forms/GammeForm.vue";
import RailForm from "./components/forms/RailForm.vue";
import PoigneeForm from "./components/forms/PoigneeForm.vue";
import DimensionsForm from "./components/forms/DimensionsForm.vue";
import TraversesForm from "./components/forms/TraversesForm.vue";
// import FreinForm from "./components/FreinForm.vue";
// import RemplissageForm from "./components/RemplissageForm.vue";
import ProfilesTable from "./components/summaries/ProfilesTable.vue";
import Canvas3D from "./components/Canvas3D.vue";
</script>
