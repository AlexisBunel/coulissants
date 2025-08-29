<script setup>
import { useDerivedStore } from "../../stores/derived.store";
const d = useDerivedStore();
</script>

<template>
  <table id="accessories">
    <caption>
      Accessoires
    </caption>
    <thead>
      <tr>
        <th>Référence</th>
        <th>Désignation</th>
        <th>Finition</th>
        <th>Qté</th>
        <th>Longueur</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in d.profiles" :key="row.ref + '-' + row.length">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
</template>
