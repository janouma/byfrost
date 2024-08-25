<template>
  <h1>The best Vue component "{{ name }}" {{ message }}</h1>
</template>

<script>
  import schema, { validate } from 'joi'

  const layout = await (await fetch('./assets/layout.json')).json()

  export default {
    props: { name: String },

    data () {
      return {
        message: 'in the world'
      }
    }
  }
</script>

<style>
  h1 { font-size: 2em; }
</style>
