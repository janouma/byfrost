<svelte:options
  immutable={true}

  customElement={{
    shadow: 'none'
  }}
/>

<script>
  import config from './helpers/config.js'
  import '../the_best_component/index.svelte'
  import '../../common_fixture.js'
  export let name
</script>

<main>
  <the-best-component name={`${name} ${config.version}`}/>
</main>
