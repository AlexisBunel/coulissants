<script setup>
import { useDerivedStore } from "../../stores/derived.store";
const d = useDerivedStore();
</script>

<template>
  <table id="profiles">
    <caption>
      Profils
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
        <td>{{ row.ref }}</td>
        <td>{{ row.description }}</td>
        <td>{{ row.finishLabel || row.finishCode || "—" }}</td>
        <td class="num">{{ row.qty }}</td>
        <td class="num">{{ row.length }} mm</td>
      </tr>
    </tbody>
  </table>
</template>
