export default {
  copyModules: true,

  modulesMapping: {
    svelte: {
      alias: './svelte_internal.js',
      destination: '../output/packages/svelte/internal/index.mjs'
    },

    'svelte/internal': {
      alias: './svelte_internal.js',
      destination: '../output/packages/svelte/internal/index.mjs'
    }
  }
}
