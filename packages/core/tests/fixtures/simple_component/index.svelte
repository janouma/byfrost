<svelte:options
  immutable={true}

  customElement={{
    shadow: 'none'
  }}
/>

<style>
  h1 { font-size: 2em; }
</style>

<script>
export let name
</script>

<h1>Simple Svelte component "{name}" in the world</h1>
