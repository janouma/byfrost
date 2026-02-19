import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { test } from '@japa/runner'
import { nextTick } from '@byfrost/utils/tests/helpers/async.js'
import compile from '../../index.js'

const require = createRequire(import.meta.url)
const filename = require.resolve('../fixtures/the_best_component/index.esm')
const code = String(readFileSync(filename))
const expectedCompiled = String(readFileSync(require.resolve('../expectations/the_best_component.js')))
const expectedSourcemap = String(readFileSync(require.resolve('../expectations/the_best_component.js.map')))

function minify (string) {
  return string.trim().replace(/\s+/gs, ' ').replace(/(\W)\s+/gs, '$1')
}

async function scriptPreprocessor ({ content: source }) {
  await nextTick()
  return { code: source }
}

test('should validate parameters', async ({ expect }) => {
  await expect(() => compile()).rejects.toThrow('code must be provided')
  await expect(() => compile({ code: 1 })).rejects.toThrow('code must be provided')

  await expect(() => compile({ code: 'const foo = "bar"' })).rejects.toThrow(
    'Plain JS component must have the component class name as a default export (`export default class ComponentClassName ...` or `export default ComponentClassName`)'
  )

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
    filename: 'path/to/mal-formed_component/index.esm'
  })).rejects
    .toThrow(
      'filename must match custom element name pattern (my_awesome_component). Actual "mal-formed_component"'
    )

  await expect(() => compile({ code, scriptPreprocessor, filename: 'unknown_file/index.esm' })).rejects
    .toThrow('source file unknown_file/index.esm is missing')

  await expect(() => compile({ code, scriptPreprocessor, filename, enableSourcemap: 'yes' })).rejects
    .toThrow('enableSourcemap has a wrong format (boolean | { js: boolean }). Actual "yes"')

  await expect(() => compile({ code, scriptPreprocessor, filename, enableSourcemap: {} })).rejects
    .toThrow('enableSourcemap has a wrong format (boolean | { js: boolean }). Actual {}')

  return expect(() => compile(
    { code, scriptPreprocessor, filename, enableSourcemap: { js: 'yes' } })
  ).rejects.toThrow(
    'enableSourcemap has a wrong format (boolean | { js: boolean }).' +
    ' Actual {"js":"yes"}'
  )
})

test('should compile code', async ({ expect }) => {
  const { code: compiled, map: sourcemap } = await compile({ code, scriptPreprocessor, filename })
  expect(minify(compiled)).toBe(minify(expectedCompiled))
  expect(sourcemap).toBeFalsy()
})

test('should apply scriptPreprocessor', async ({ expect }) => {
  const transformingPreprocessor = async ({ content: source }) => {
    await nextTick()
    return { code: source.replace("'World'", "'Preprocessed'") }
  }

  const { code: compiled } = await compile({
    code,
    scriptPreprocessor: transformingPreprocessor,
    filename
  })

  expect(compiled).toContain("'Preprocessed'")
  expect(compiled).not.toContain("'World'")
})

test('should generate sourcemap', async ({ expect }) => {
  const { map: sourcemap } = await compile({
    code, scriptPreprocessor, filename, enableSourcemap: { js: true }
  })

  expect(minify(JSON.stringify(sourcemap))).toBe(minify(expectedSourcemap))
})

test('should generate sourcemap with boolean option', async ({ expect }) => {
  const { map: sourcemap } = await compile({
    code, scriptPreprocessor, filename, enableSourcemap: true
  })

  expect(sourcemap).toBeTruthy()
  expect(sourcemap.version).toBe(3)
  expect(sourcemap.sources).toContain(filename)
})

test('should accept stylePreprocessor parameter for API consistency', async ({ expect }) => {
  const stylePreprocessor = async ({ content }) => ({ code: content })

  const { code: compiled } = await compile({
    code,
    scriptPreprocessor,
    stylePreprocessor,
    filename
  })

  // stylePreprocessor is accepted but not used - compilation should work normally
  expect(minify(compiled)).toBe(minify(expectedCompiled))
})
