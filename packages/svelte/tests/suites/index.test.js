import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { test } from '@japa/runner'
import { nextTick } from '@bifrost/utils/tests/helpers/async.js'
import compile from '../../index.js'

const require = createRequire(import.meta.url)
const filename = require.resolve('../fixtures/the_best_component/index.svelte')
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

test('should forbid custom element tag overwrite', async ({ expect }) => {
  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement="the-best-component"/>')

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('customElement tag option is forbiden: customElement="the-best-component"')
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, "<svelte:options customElement='the-best-component'/>")

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow("customElement tag option is forbiden: customElement='the-best-component'")
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement={"the-best-component"}/>')

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('customElement tag option is forbiden: customElement={"the-best-component"}')
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, "<svelte:options customElement={'the-best-component'}/>")

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow("customElement tag option is forbiden: customElement={'the-best-component'}")
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, "<svelte:options customElement={{ tag: 'the-best-component', shadow: 'none' }}/>")

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow("customElement tag option is forbiden: customElement={{ tag: 'the-best-component', shadow: 'none' }}")
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement={{ tag: "the-best-component", shadow: "none" }}/>')

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('customElement tag option is forbiden: customElement={{ tag: "the-best-component", shadow: "none" }}')
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement={{ shadow: "none" }} tag="the-best-component"/>')

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('legacy "tag" option (tag="the-best-component") is not allowed alongside "customElement" one ({ shadow: "none" })')
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement={{ shadow: "none" }} tag=\'the-best-component\'/>')

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('legacy "tag" option (tag=\'the-best-component\') is not allowed alongside "customElement" one ({ shadow: "none" })')
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement={{ shadow: "none" }} tag={"the-best-component"}/>')

    await expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('legacy "tag" option (tag={"the-best-component"}) is not allowed alongside "customElement" one ({ shadow: "none" })')
  }

  {
    const codeWithTagOption = code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options customElement={{ shadow: "none" }} tag={\'the-best-component\'}/>')

    return expect(() => compile({ code: codeWithTagOption, scriptPreprocessor, filename })).rejects.toThrow('legacy "tag" option (tag={\'the-best-component\'}) is not allowed alongside "customElement" one ({ shadow: "none" })')
  }
})

test('should compile code', async ({ expect }) => {
  const { code: compiled, map: sourcemap } = await compile({ code, scriptPreprocessor, filename })
  expect(minify(compiled)).toBe(minify(expectedCompiled))
  expect(sourcemap).toBeFalsy()
})

test('should add customElement attribute to svelte options when missing', async ({ expect }) => {
  const codeWithoutCustomElementAttribute =
    code.replace(/<svelte:options\s+.*?\/>/s, '<svelte:options immutable={true}/>')

  const { code: compiled } = await compile({
    code: codeWithoutCustomElementAttribute,
    scriptPreprocessor,
    filename
  })

  expect(minify(compiled))
    .toMatch(
      /\bcustomElements\.define\s*\(\s*"the-best-component"\s*,\s*create_custom_element\s*\(.+?\)\)/
    )
})

test('should add svelte options when missing', async ({ expect }) => {
  const codeWithoutCustomElementAttribute =
    code.replace(/<svelte:options\s+.*?\/>/s, '')

  const { code: compiled } = await compile({
    code: codeWithoutCustomElementAttribute,
    scriptPreprocessor,
    filename
  })

  expect(minify(compiled))
    .toMatch(
      /\bcustomElements\.define\s*\(\s*"the-best-component"\s*,\s*create_custom_element\s*\(.+?\)\)/
    )
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
  const sourceFile = require.resolve('../fixtures/options_error_component/index.svelte')
  const sourceCode = String(readFileSync(sourceFile))

  return expect(
    compile({ code: sourceCode, scriptPreprocessor, filename: sourceFile })
  ).rejects.toThrow("<svelte:options> unknown attribute 'unkownOption'")
})

test('should handle syntax error', async ({ expect }) => {
  const sourceFile = require.resolve('../fixtures/syntax_error_component/index.svelte')
  const sourceCode = String(readFileSync(sourceFile))

  const { message } = await compile({ code: sourceCode, scriptPreprocessor, filename: sourceFile })
    .catch(error => error)

  expect(message.trim()).toBe(`parse-error — Unexpected token
in file /Users/Shared/work/bifrost/packages/svelte/tests/fixtures/syntax_error_component/index.svelte
13: <script>
14: export let name = 'Ze Component'
15: name =;
          ^
16: </script>
17:`)
})
