import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { test } from '@japa/runner'
import { nextTick } from '@bifrost/utils/tests/helpers/async.js'
import compile from '../../index.js'

const require = createRequire(import.meta.url)
const filename = require.resolve('../fixtures/the_best_component/index.vue')
const code = String(readFileSync(filename))
const expectedCompiled = String(readFileSync(require.resolve('../expectations/the_best_component.js')))

const expectedCompiledWithCss = String(
  readFileSync(require.resolve('../expectations/the_best_component.precss.js'))
)

const expectedSourcemap = String(readFileSync(require.resolve('../expectations/the_best_component.js.map')))

function minify (string) {
  return string.trim().replace(/\s+/gs, ' ').replace(/(\W)\s+/gs, '$1')
}

async function scriptPreprocessor ({ content: source }) {
  await nextTick()

  return {
    code: source.replace(
      /\bconst\s+message\s+=\s+ref('in the world')\b/,
      "const message = ref('in the galaxy if not the universe')"
    )
  }
}

async function stylePreprocessor ({ content: source }) {
  await nextTick()
  return { code: source.replace(/(\d)em;/, '$1px;') }
}

test('should validate parameters', async ({ expect }) => {
  await expect(() => compile()).rejects.toThrow('code must be provided')
  await expect(() => compile({ code: 1 })).rejects.toThrow('code must be provided')

  await expect(() => compile({ code })).rejects
    .toThrow('scriptPreprocessor must be a function')

  await expect(() => compile({ code, scriptPreprocessor: 'scriptPreprocessor' })).rejects
    .toThrow('scriptPreprocessor must be a function')

  await expect(() => compile({
    code, scriptPreprocessor, stylePreprocessor: 'stylePreprocessor'
  })).rejects
    .toThrow('stylePreprocessor must be a function')

  await expect(() => compile({ code, scriptPreprocessor })).rejects
    .toThrow('filename must be a non-empty string')

  await expect(() => compile({ code, scriptPreprocessor, filename: 1 })).rejects
    .toThrow('filename must be a non-empty string')

  await expect(() => compile({ code, scriptPreprocessor, filename: '' })).rejects
    .toThrow('filename must be a non-empty string')

  await expect(() => compile({
    code,
    scriptPreprocessor,
    filename: 'path/to/mal-formed_component/index.vue'
  })).rejects
    .toThrow(
      'filename must match custom element name pattern (my_awesome_component). Actual "mal-formed_component"'
    )

  await expect(() => compile({ code, scriptPreprocessor, filename: 'unkown_file/index.vue' })).rejects
    .toThrow('source file unkown_file/index.vue is missing')

  await expect(() => compile({ code, scriptPreprocessor, filename, enableSourcemap: 'yes' })).rejects
    .toThrow('enableSourcemap has a wrong format (boolean | { [css/js]: boolean }). Actual "yes"')

  await expect(() => compile({ code, scriptPreprocessor, filename, enableSourcemap: {} })).rejects
    .toThrow('enableSourcemap has a wrong format (boolean | { [css/js]: boolean }). Actual {}')

  return expect(() => compile(
    { code, scriptPreprocessor, filename, enableSourcemap: { css: 'yes', js: true } })
  ).rejects.toThrow(
    'enableSourcemap has a wrong format (boolean | { [css/js]: boolean }).' +
    ' Actual {"css":"yes","js":true}'
  )
})

test('should compile code', async ({ expect }) => {
  const { code: compiled, map: sourcemap } = await compile({ code, scriptPreprocessor, filename })
  expect(minify(compiled)).toBe(minify(expectedCompiled))
  expect(sourcemap).toBeFalsy()
})

test('should preprocess css', async ({ expect }) => {
  const { code: compiled } = await compile({
    code, scriptPreprocessor, stylePreprocessor, filename
  })

  expect(minify(compiled)).toBe(minify(expectedCompiledWithCss))
})

test('should generate sourcemap', async ({ expect }) => {
  {
    const { map: sourcemap } = await compile({
      code, scriptPreprocessor, filename, enableSourcemap: { js: true }
    })

    expect(minify(JSON.stringify(sourcemap))).toBe(minify(expectedSourcemap))
  }

  {
    const { map: sourcemap } = await compile({
      code, scriptPreprocessor, filename, enableSourcemap: true
    })

    expect(minify(JSON.stringify(sourcemap))).toBe(minify(expectedSourcemap))
  }
})

test('should handle error', async ({ expect }) => {
  const sourceFile = require.resolve('../fixtures/syntax_error_component/index.vue')
  const sourceCode = String(readFileSync(sourceFile))

  const { message } = await compile({ code: sourceCode, scriptPreprocessor, filename: sourceFile })
    .catch(error => error)

  const cleanMessage = message.split(/\r?\n/).map(line => line.trimEnd()).filter(line => line)
    .join('\n')

  expect(cleanMessage).toBe(`[vue/compiler-sfc] Unexpected token (4:15)
/Users/Shared/work/bifrost/packages/vue/tests/fixtures/syntax_error_component.vue
5  |    import { ref } from 'vue'
6  |
7  |    const props =; defineProps({ name: String })
   |                 ^
8  |    const message = ref('in the world')
9  |  </script>`)
})
