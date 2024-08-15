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
import '../the_main_component/index.svelte'
export let name
</script>

<h1>The best Svelte component "{name}" in the world</h1>
