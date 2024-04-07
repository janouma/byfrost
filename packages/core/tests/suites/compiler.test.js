import { createRequire } from 'module'
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, resolve } from 'path'
import { test } from '@japa/runner'
import * as td from 'testdouble'
import compile from '../../lib/compiler.js'

const require = createRequire(import.meta.url)

const destination = resolve(
  dirname(require.resolve('../fixtures/the_best_component/index.svelte')),
  '../../output'
)

test.group('compiler', group => {
  group.each.setup(() => {
    if (existsSync(destination)) {
      rmSync(destination, { recursive: true })
    }

    mkdirSync(destination, { recursive: true })
  })

  test('should compile component', async ({ expect }) => {
    const filename = require.resolve('../fixtures/the_best_component/index.svelte')

    const expectedCompiled = String(readFileSync(
      require.resolve('../expectations/the_best_component.js')
    )).trim()

    const source = dirname(filename)

    await compile({ source, destination })

    const compiled = String(readFileSync(`${destination}/the_best_component/index.js`))
    expect(compiled).toBe(expectedCompiled)
  })

  test('should generate sourcemap', async ({ expect }) => {
    const filename = require.resolve('../fixtures/the_best_component/index.svelte')

    const expectedSourcemap = String(readFileSync(
      require.resolve('../expectations/the_best_component.js.map')
    )).trim()

    const source = dirname(filename)

    await compile({ source, destination, enableSourcemap: { js: true } })

    const sourcemap = String(readFileSync(`${destination}/the_best_component/index.js.map`))
    expect(sourcemap).toBe(expectedSourcemap)
  })

  test('should copy assets', async ({ expect }) => {
    const filename = require.resolve('../fixtures/component_with_assets/index.svelte')

    const expectedAssetContent = String(readFileSync(
      require.resolve('../fixtures/component_with_assets/assets/images/icon.svg')
    ))

    const expectedStyleContent = String(readFileSync(
      require.resolve('../fixtures/component_with_assets/styles/index.css')
    ))

    const source = dirname(filename)

    await compile({ source, destination })

    const assetContent = String(
      readFileSync(`${destination}/component_with_assets/assets/images/icon.svg`)
    )

    expect(assetContent).toBe(expectedAssetContent)

    const styleContent = String(
      readFileSync(`${destination}/component_with_assets/styles/index.css`)
    )

    expect(styleContent).toBe(expectedStyleContent)
  })

  test('should handle prefix', async () => {
    const filename = require.resolve('../fixtures/the_best_component/index.svelte')
    const source = dirname(filename)
    const stylePreprocessor = td.function('stylePreprocessor')
    const config = { stylePreprocessor }
    const prefix = 'https://prefix'

    await compile({ source, destination, config, prefix })

    td.verify(stylePreprocessor({ dest: prefix + '/the_best_component' }))
  })

  test('should handle config', async ({ expect }) => {
    const filename = require.resolve('../fixtures/the_best_component/index.svelte')
    const source = dirname(filename)

    {
      const configPath = require.resolve('../fixtures/custom.config.js')
      const configWorkingDirectory = dirname(configPath)
      const { default: config } = await import(configPath)

      const expectedCompiled = String(readFileSync(
        require.resolve('../expectations/the_best_component.config.js')
      )).trim()

      await compile({ source, destination, config, configWorkingDirectory })

      const compiled = String(readFileSync(`${destination}/the_best_component/index.js`))
      expect(compiled).toBe(expectedCompiled)
    }

    {
      const configPath = require.resolve('../fixtures/custom_bis.config.js')
      const configWorkingDirectory = dirname(configPath)
      const { default: config } = await import(configPath)

      const expectedCompiled = String(readFileSync(
        require.resolve('../expectations/the_best_component.config_bis.js')
      )).trim()

      await compile({ source, destination, config, configWorkingDirectory })

      const compiled = String(readFileSync(`${destination}/the_best_component/index.js`))
      expect(compiled).toBe(expectedCompiled)
    }
  })

  test('should handle moduleResolutionPaths argument', async ({ expect }) => {
    const filename = require.resolve('../fixtures/the_best_component/index.svelte')
    const source = dirname(filename)
    const configPath = require.resolve('../fixtures/custom_ter.config.js')
    const configWorkingDirectory = dirname(configPath)
    const { default: config } = await import(configPath)
    const modulesPath = resolve(source, '../modules')

    const expectedCompiled = String(readFileSync(
      require.resolve('../expectations/the_best_component.config_bis.js')
    )).trim()

    await compile({
      source,
      destination,
      config,
      configWorkingDirectory,
      moduleResolutionPaths: [modulesPath]
    })

    const compiled = String(readFileSync(`${destination}/the_best_component/index.js`))
    expect(compiled).toBe(expectedCompiled)
  })

  test('should handle compile error', async ({ expect }) => {
    const filename = require.resolve('../fixtures/the_best_component/index.svelte')
    const source = dirname(filename)

    {
      const configPath = require.resolve('../fixtures/error.config.js')
      const configWorkingDirectory = dirname(configPath)
      const { default: config } = await import(configPath)
      const configCopy = structuredClone(config)

      configCopy.srcTypesCompilerMapping.svelte = require.resolve(
        configCopy.srcTypesCompilerMapping.svelte,
        { paths: [configWorkingDirectory] }
      )

      await expect(
        compile(
          { source, destination, config: configCopy, configWorkingDirectory }
        )
      ).rejects.toThrow('Unknown compile error')
    }
  })
})
