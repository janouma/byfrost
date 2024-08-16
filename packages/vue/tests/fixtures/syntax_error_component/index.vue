<template>
  <h1>The best Vue component "{{ name }}" {{ message }}</h1>
</template>

<script setup>
  import { ref } from 'vue'

  const props =; defineProps({ name: String })
  const message = ref('in the world')
</script>

<style>
  h1 { font-size: 2em; }
</style>
