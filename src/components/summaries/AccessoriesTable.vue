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
      <tr
        v-for="(row, i) in d.accessories.list"
        :key="row.ref + '-' + (row.length ?? 0) + '-' + i"
      >
        <td>{{ row.ref }}</td>
        <td>{{ row.designation || row.type || "—" }}</td>
        <td>{{ row.finishLabel || "—" }}</td>
        <td class="num">{{ row.qty }}</td>
        <td class="num">{{ row.length ? row.length + " mm" : "—" }}</td>
      </tr>
    </tbody>
  </table>
</template>
