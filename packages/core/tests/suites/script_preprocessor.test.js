import { createRequire } from 'module'
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, resolve, basename } from 'path'
import { test } from '@japa/runner'
import createScriptPreprocessor from '../../lib/script_preprocessor.js'
import { clearCache as clearCopyCache } from '../../lib/imports_rewriter.js'

const require = createRequire(import.meta.url)

const fixtures = resolve(
  dirname(require.resolve('../fixtures/the_main_component/index.svelte')),
  '..'
)

const destination = dirname(fixtures) + '/output'

test.group('script_preprocessor', group => {
  group.each.setup(() => {
    if (existsSync(destination)) {
      rmSync(destination, { recursive: true })
    }

    mkdirSync(destination, { recursive: true })
    clearCopyCache()
  })

  test('should process dependencies recursively', async ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(dirname(file)) + '/the_root_component'
    const moduleResolutionPaths = [`${destination}/${basename(source)}`, source]

    const preprocess = createScriptPreprocessor({
      source,
      destination,
      moduleResolutionPaths,
      config: { srcTypesCompilerMapping: { svelte: '@bifrost/svelte' } },
      cache: new Map()
    })

    const code = `import '../the_main_component/index.svelte'
      export let name`

    const { code: transformedCode } = await preprocess({ content: code })

    expect(transformedCode).toBe(`import 'component:../the_main_component/index.js'
      export let name`)

    {
      const expectedCompiled = String(readFileSync(
        require.resolve('../expectations/the_best_component.js')
      )).trim()

      const compiled = String(readFileSync(`${destination}/the_best_component/index.js`))
      expect(compiled).toBe(expectedCompiled)
    }

    {
      const expectedCompiled = String(readFileSync(
        require.resolve('../expectations/the_main_component.js')
      )).trim()

      const compiled = String(readFileSync(`${destination}/the_main_component/index.js`))
      expect(compiled).toBe(expectedCompiled)
    }

    const plainJsDependencies = [
      { src: '../common_fixture.js', copy: '--/common_fixture.js' },
      { src: '../common_fixture_bis.js', copy: '--/common_fixture_bis.js' },
      'the_main_component/helpers/config.js',
      'the_main_component/helpers/update.js',

      {
        src: 'the_main_component/helpers/util/index.js',

        transform (content) {
          return content.replace(
            "'../../../../common_fixture_bis.js'",
            "'../../../--/common_fixture_bis.js'"
          )
        }
      }
    ]

    for (const dependency of plainJsDependencies) {
      const {
        src = dependency,
        copy = src,
        transform = content => content
      } = dependency

      const source = transform(String(readFileSync(`${fixtures}/${src}`)))
      const output = String(readFileSync(`${destination}/${copy}`))

      expect(output).toBe(source)
    }
  })

  test('should transform assets import variable', async ({ expect }) => {
    const file = require.resolve('../fixtures/the_main_component/index.svelte')
    const source = dirname(dirname(file)) + '/the_root_component'
    const moduleResolutionPaths = [`${destination}/${basename(source)}`, source]

    {
      const preprocess = createScriptPreprocessor({
        source,
        destination,
        moduleResolutionPaths,
        config: { srcTypesCompilerMapping: { svelte: '@bifrost/svelte' } },
        cache: new Map()
      })

      const code = "import icon from './assets/images/icon.svg'"
      const { code: transformedCode } = await preprocess({ content: code })
      expect(transformedCode).toBe("const icon = 'the_root_component/assets/images/icon.svg'")
    }

    {
      const preprocess = createScriptPreprocessor({
        source,
        destination,
        moduleResolutionPaths,
        config: { srcTypesCompilerMapping: { svelte: '@bifrost/svelte' } },
        prefix: 'prefix',
        cache: new Map()
      })

      const code = "import icon from './assets/images/icon.svg'"
      const { code: transformedCode } = await preprocess({ content: code })
      expect(transformedCode).toBe("const icon = 'prefix/the_root_component/assets/images/icon.svg'")
    }
  })
})
