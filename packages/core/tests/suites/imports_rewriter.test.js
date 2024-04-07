import { createRequire } from 'module'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs'
import { dirname, resolve, basename } from 'path'
import { test } from '@japa/runner'
import { rewriteModulesImports, resolveRelativeImports } from '../../lib/imports_rewriter.js'

const require = createRequire(import.meta.url)

const destination = resolve(
  dirname(require.resolve('../fixtures/the_main_component/index.svelte')),
  '../../output'
)

test.group('#rewriteModulesImports', group => {
  group.each.setup(() => {
    if (existsSync(destination)) {
      rmSync(destination, { recursive: true })
    }

    mkdirSync(destination, { recursive: true })
  })

  test('should rewrite imports statement according to config mapping', ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(file)

    const code = `
    '//'; import 'joi'
    /*
    import fuse from 'fuse.js'
    */
    import { onMount } from 'svelte'
    import { tick } from 'svelte/internal'
    // import { tick } from 'svelte'

    import {
      process,
      amend
    } from '^/lib/core'

    import './ubutton/*index.js'
    import fuse from 'fuse.js'
//    import fuse from 'fuse.js'
    /*import fuse from 'fuse.js'*/
    import widget from '@heimdall/shared/widget/index.svelte'
    import menu from '@heimdall/shared/menu/index.svelte'
    import canvas from '../../shared-components/@heimdall/shared/canvas/index.js'
    import icon from '@heimdall/icons/bullet.svelte'

    export let title`

    const modulesMapping = {
      svelte: 'svelte/src/runtime/internal/index.js',
      'svelte/internal': 'svelte/src/runtime/internal/index.js',
      'fuse.js': 'fuse.js/dist/fuse.basic.esm.min.js',
      '^/lib/core': './lib/core.js',
      '/^@heimdall/shared/(.+)$/': '@heimdall/shared/lib/$1',
      '@heimdall/icons/bullet.svelte': './icons/bullet.js'
    }

    const configWorkingDirectory = dirname(require.resolve('../fixtures/custom.config.js'))

    const transformedCode = rewriteModulesImports({
      code,
      modulesMapping,
      destination,
      source,
      configWorkingDirectory
    })

    expect(transformedCode).toBe(
`
    '//'; import 'joi'
    /*
    import fuse from 'fuse.js'
    */
    import { onMount } from 'svelte/src/runtime/internal/index.js'
    import { tick } from 'svelte/src/runtime/internal/index.js'
    // import { tick } from 'svelte'

    import {
      process,
      amend
    } from '../../fixtures/lib/core.js'

    import './ubutton/*index.js'
    import fuse from 'fuse.js/dist/fuse.basic.esm.min.js'
//    import fuse from 'fuse.js'
    /*import fuse from 'fuse.js'*/
    import widget from '@heimdall/shared/lib/widget/index.svelte'
    import menu from '@heimdall/shared/lib/menu/index.svelte'
    import canvas from '../../shared-components/@heimdall/shared/canvas/index.js'
    import icon from '../../fixtures/icons/bullet.js'

    export let title`
    )
  })

  test('should copy modules when "copyModules" argument is true', ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(file)

    const code = `
    import 'joi'
    import { onMount } from 'svelte'
    import { tick } from 'svelte/internal'
    import logger from '@bifrost/utils/logger.js'
    import { curry } from '@bifrost/utils/function.js'
    import util from 'lib/utils.js'

    import {
      process,
      amend
    } from './lib/core.js'

    export let title`

    const modulesMapping = {
      joi: {
        alias: 'joi/dist/joi-browser.min.js',
        destination: '../output/packages/joi-browser.min.js'
      },

      svelte: {
        alias: 'svelte/internal',
        destination: '../output/packages/svelte/internal/index.js'
      },

      'svelte/internal': {
        destination: '../output/packages/svelte/internal/index.js',
        copyModule: false
      },

      './lib/core.js': {
        destination: '../output/lib/core.js'
      },

      'not/imported': {
        alias: 'not/imported/index.js',
        destination: '../output/packages/not/imported/index.js'
      },

      '/^@bifrost/utils/(.+)$/': {
        alias: '@bifrost/utils/$1',
        destination: '../output/packages/@bifrost/utils/common/$1'
      },

      '/^lib/(.+)$/': {
        alias: '../output/lib/$1',
        copyModule: false
      }
    }

    const configWorkingDirectory = dirname(require.resolve('../fixtures/custom.config.js'))
    const moduleResolutionPaths = [`${destination}/${basename(source)}`, source]

    const transformedCode = rewriteModulesImports({
      code,
      modulesMapping,
      destination,
      source,
      configWorkingDirectory,
      moduleResolutionPaths,
      copyModules: true
    })

    expect(transformedCode).toBe(`
    import '../packages/joi-browser.min.js'
    import { onMount } from '../packages/svelte/internal/index.js'
    import { tick } from '../packages/svelte/internal/index.js'
    import logger from '../packages/@bifrost/utils/common/logger.js'
    import { curry } from '../packages/@bifrost/utils/common/function.js'
    import util from '../lib/utils.js'

    import {
      process,
      amend
    } from '../lib/core.js'

    export let title`)

    const dependencies = {
      'joi/dist/joi-browser.min.js': '../output/packages/joi-browser.min.js',
      'svelte/internal': '../output/packages/svelte/internal/index.js',
      '../fixtures/lib/core.js': '../output/lib/core.js',
      '@bifrost/utils/logger.js': '../output/packages/@bifrost/utils/common/logger.js',
      '@bifrost/utils/function.js': '../output/packages/@bifrost/utils/common/function.js'
    }

    for (const [dependency, copy] of Object.entries(dependencies)) {
      const dependencyContent = String(readFileSync(require.resolve(dependency)))
      const copiedContent = String(readFileSync(resolve(`${configWorkingDirectory}/${copy}`)))
      expect(copiedContent).toBe(dependencyContent)
    }

    const svelteDependencyPath = resolve(
      `${configWorkingDirectory}/${dirname(modulesMapping.svelte.destination)}`
    )

    const svelteDependencyTree = readdirSync(
      svelteDependencyPath, { recursive: true, withFileTypes: true }
    )
      .filter(file => file.isFile())
      .map(({ path, name }) => `${path}/${name}`.replace(svelteDependencyPath + '/', ''))

    expect(svelteDependencyTree).toEqual([
      'Component.js',
      'ResizeObserverSingleton.js',
      'animations.js',
      'await_block.js',
      'dev.js',
      'dom.js',
      'each.js',
      'environment.js',
      'globals.js',
      'index.js',
      'lifecycle.js',
      'loop.js',
      'scheduler.js',
      'spread.js',
      'ssr.js',
      'style_manager.js',
      'transitions.js',
      'utils.js',
      '--/--/shared/boolean_attributes.js',
      '--/--/shared/version.js',
      '--/--/shared/utils/names.js'
    ])

    const svelteDependencies = {
      [`${svelteDependencyPath}/dev.js`]: [
        /import\s*{\s*is_void\s*}\s*from\s+'\.\/--\/--\/shared\/utils\/names\.js'/,
        /import\s*{\s*VERSION\s*}\s*from\s+'\.\/--\/--\/shared\/version\.js'/
      ],

      [`${svelteDependencyPath}/ssr.js`]: [
        /import\s*{\s*boolean_attributes\s*}\s*from\s+'.\/--\/--\/shared\/boolean_attributes\.js'/,
        /export\s*{\s*is_void\s*}\s*from\s+'.\/--\/--\/shared\/utils\/names\.js'/
      ]
    }

    for (const [dependency, matches] of Object.entries(svelteDependencies)) {
      const content = String(readFileSync(dependency))
      expect(matches.every(match => content.match(match))).toBe(true)
    }
  })

  test('should not try module resolving indefinitely', ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(file)
    const code = "import { inOut } from 'animate/utils/easing/cubic'"

    const modulesMapping = {
      'animate/utils/easing/cubic': {
        alias: 'animate/helpers/easing/cubic.mjs',
        destination: '../output/packages/animate/utils/easing/cubic.mjs'
      }
    }

    const configWorkingDirectory = dirname(require.resolve('../fixtures/custom.config.js'))

    expect(() => {
      rewriteModulesImports({
        code,
        modulesMapping,
        copyModules: true,
        configWorkingDirectory,
        source,
        destination,
        moduleResolutionPaths: [],
        resolveModule (path) { throw new Error(`cannot resolve module ${path}`) }
      })
    }).toThrow('cannot resolve module animate/helpers/easing/cubic.mjs')
  })

  test('should handle copy errors', ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(file)
    const code = "import 'joi'"

    writeFileSync(destination + '/not_a_dir', 'not a dir')

    const modulesMapping = {
      joi: {
        alias: 'joi/dist/joi-browser.min.js',
        destination: '../output/not_a_dir/joi/index.mjs'
      }
    }

    const configWorkingDirectory = dirname(require.resolve('../fixtures/custom.config.js'))
    const moduleResolutionPaths = [`${destination}/${basename(source)}`, source]

    expect(() => {
      rewriteModulesImports({
        code,
        modulesMapping,
        destination,
        source,
        configWorkingDirectory,
        moduleResolutionPaths,
        copyModules: true
      })
    }).toThrow(/ENOTDIR: not a directory, mkdir '.*?\/core\/tests\/output\/not_a_dir\/joi'/)
  })
})

test.group('#resolveRelativeImports', () => {
  test('should resolve relative imports', ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(file)

    const code = `
    import 'joi'
    import util from '../lib/core.js'

    export let title`

    const moduleResolutionPaths = [`${destination}/${basename(source)}`, source]

    const transformedCode = resolveRelativeImports({ code, source, destination, moduleResolutionPaths })

    expect(transformedCode).toBe(`
    import 'joi'
    import util from '../../fixtures/lib/core.js'

    export let title`)
  })
})
