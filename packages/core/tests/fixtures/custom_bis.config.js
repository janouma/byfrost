export default {
  copyModules: true,

  modulesMapping: {
    svelte: {
      alias: './modules/svelte_internal.js',
      destination: '../output/packages/svelte/internal/index.mjs'
    },

    'svelte/internal': {
      alias: './modules/svelte_internal.js',
      destination: '../output/packages/svelte/internal/index.mjs'
    }
  }
}
