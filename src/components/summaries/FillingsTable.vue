<script setup>
import { useDerivedStore } from "../../stores/derived.store";
const d = useDerivedStore();
</script>

<template>
  <table id="fillings">
    <caption>
      Remplissages
    </caption>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Quantité</th>
        <th>Dimensions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
</template>
