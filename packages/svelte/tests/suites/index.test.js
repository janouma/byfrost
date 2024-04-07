import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { test } from '@japa/runner'
import { nextTick } from '@bifrost/utils/tests/helpers/async.js'
import compile from '../../index.js'

const require = createRequire(import.meta.url)
const filename = require.resolve('../fixtures/the_best_component.svelte')
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
  return { code: source.replace(/\bexport\s+let\s+name\b/, "export let name = 'Ze Component'") }
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

  await expect(() => compile({ code, scriptPreprocessor, filename: 'unkown' })).rejects
    .toThrow('source file unkown is missing')

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
  const { map: sourcemap } = await compile({
    code, scriptPreprocessor, filename, enableSourcemap: { js: true }
  })

  expect(minify(JSON.stringify(sourcemap))).toBe(minify(expectedSourcemap))
})

test('should handle unknown error', async ({ expect }) => {
  const sourceFile = require.resolve('../fixtures/options_error_component.svelte')
  const sourceCode = String(readFileSync(sourceFile))

  return expect(
    compile({ code: sourceCode, scriptPreprocessor, filename: sourceFile })
  ).rejects.toThrow("<svelte:options> unknown attribute 'unkownOption'")
})

test('should handle syntax error', async ({ expect }) => {
  const sourceFile = require.resolve('../fixtures/syntax_error_component.svelte')
  const sourceCode = String(readFileSync(sourceFile))

  const { message } = await compile({ code: sourceCode, scriptPreprocessor, filename: sourceFile })
    .catch(error => error)

  expect(message.trim()).toBe(`parse-error — Unexpected token
in file /Users/Shared/work/bifrost/packages/svelte/tests/fixtures/syntax_error_component.svelte
14: <script>
15: export let name = 'Ze Component'
16: name =;
          ^
17: </script>
18:`)
})
