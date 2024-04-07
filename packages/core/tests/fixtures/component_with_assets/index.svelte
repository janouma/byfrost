<svelte:options
  immutable={true}

  customElement={{
    tag: 'component-with-assets',
    shadow: 'none'
  }}
/>

<style>
  h1 { font-size: 2em; }
</style>

<script>
export let name
</script>

<h1>The best Svelte component "{name}" in the world</h1>
