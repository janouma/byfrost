import { existsSync } from 'fs'
import { dirname, basename } from 'path'

const CUSTOM_ELEMENT_NAME_PATTERN = /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/
const DEFAULT_EXPORT_CLASS_PATTERN = /(^|\s+)export\s+default\s+(class\s+)?(?<componentClassName>\w+)(\s+|$)/

export default async function compileComponent (
  {
    code,
    scriptPreprocessor,
    stylePreprocessor,
    enableSourcemap,
    filename
  } = {}
) {
  if (typeof code !== 'string') {
    throw new Error('code must be provided')
  }

  const componentClassName = code.match(DEFAULT_EXPORT_CLASS_PATTERN)?.groups?.componentClassName

  if (!componentClassName) {
    throw new Error('Plain JS component must have the component class name as a default export (`export default class ComponentClassName ...` or `export default ComponentClassName`)')
  }

  if (typeof scriptPreprocessor !== 'function') {
    throw new Error('scriptPreprocessor must be a function')
  }

  if (stylePreprocessor && typeof stylePreprocessor !== 'function') {
    throw new Error('stylePreprocessor must be a function')
  }

  if (typeof filename !== 'string' || !filename) {
    throw new Error('filename must be a non-empty string')
  }

  const folderPath = dirname(filename)
  const folderBasename = basename(folderPath)

  if (!folderBasename.match(CUSTOM_ELEMENT_NAME_PATTERN)) {
    throw new Error(
      `filename must match custom element name pattern (my_awesome_component). Actual "${folderBasename}"`
    )
  }

  if (!existsSync(filename)) {
    throw new Error(`source file ${filename} is missing`)
  }

  if (!['boolean', 'object', 'undefined'].includes(typeof enableSourcemap) || (
    typeof enableSourcemap === 'object' &&
    (
      typeof enableSourcemap.js === 'undefined' ||
      !['undefined', 'boolean'].includes(typeof enableSourcemap.js)
    )
  )) {
    throw new Error('enableSourcemap has a wrong format (boolean | { js: boolean }). Actual ' +
      (enableSourcemap && JSON.stringify(enableSourcemap)))
  }

  const { code: compiledCode } = await scriptPreprocessor({ content: code })

  const tag = folderBasename.replaceAll('_', '-').toLowerCase()
  const finalCode = `${compiledCode}\n\ncustomElements.define('${tag}', ${componentClassName})`

  const shouldGenerateSourcemap = enableSourcemap === true || enableSourcemap?.js || false

  return {
    code: finalCode,
    map: shouldGenerateSourcemap ? generateSourcemap(filename, code, finalCode) : undefined
  }
}

// FIXME: use Rich-Harris / magic-string instead
// (https://github.com/Rich-Harris/magic-string#readme)
function generateSourcemap (filename, originalCode, generatedCode) {
  const originalLines = originalCode.split('\n').length
  const generatedLines = generatedCode.split('\n').length

  // Generate a simple 1:1 line mapping for the original content
  const mappings = []
  for (let i = 0; i < Math.min(originalLines, generatedLines); i++) {
    mappings.push('AACA')
  }

  return {
    version: 3,
    file: basename(filename).replace(/\.esm$/, '.js'),
    sources: [filename],
    sourcesContent: [originalCode],
    names: [],
    mappings: 'AAAA,' + mappings.join(';')
  }
}
