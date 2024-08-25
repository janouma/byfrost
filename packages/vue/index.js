import { parse, compileScript, compileStyle, compileTemplate } from 'vue/compiler-sfc'
import { existsSync } from 'fs'
import { dirname, basename } from 'path'

const CUSTOM_ELEMENT_NAME_PATTERN = /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/
const COMPONENT_DEFAULT_EXPORT_PATTERN = /\bexport\s+default\s*(\{.*\})/s
const RENDER_EXPORT_PATTERN = /(\s*)export\s+(function\s+render\s*\()/s

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

  const allowedSoucemapOptions = ['js', 'css']

  if (!['boolean', 'object', 'undefined'].includes(typeof enableSourcemap) || (
    typeof enableSourcemap === 'object' &&
    (
      allowedSoucemapOptions.every(option => typeof enableSourcemap[option] === 'undefined') ||
      allowedSoucemapOptions.some(
        option => !['undefined', 'boolean'].includes(typeof enableSourcemap[option])
      )
    )
  )) {
    throw new Error('enableSourcemap has a wrong format (boolean | { [css/js]: boolean }). Actual ' +
      (enableSourcemap && JSON.stringify(enableSourcemap)))
  }

  const id = folderBasename.replaceAll('_', '-').toLowerCase()
  const { descriptor } = parse(code)

  const preprocessedCodes = [{
    source: `<template>${descriptor.template.content}</template>`,
    offset: descriptor.template.loc.start.offset
  }]

  let hasSetup = false

  for (const scriptType of ['scriptSetup', 'script']) {
    const script = descriptor[scriptType]

    if (script) {
      const { code: preprocessedScript } = await scriptPreprocessor({ content: script.content })
      const scriptFlag = script.setup ? ' setup' : ''
      hasSetup ||= scriptFlag

      preprocessedCodes.push({
        source: `<script${scriptFlag}>${preprocessedScript}</script>`,
        offset: script.loc.start.offset
      })
    }
  }

  const { styles } = descriptor

  for (const { content, scoped, module, loc } of styles) {
    const style = stylePreprocessor ? (await stylePreprocessor({ content, filename })).code : content
    const styleFlag = scoped ? ' scoped' : module ? ' module' : ''

    preprocessedCodes.push({
      source: `<style${styleFlag}>${style}</style>`,
      offset: loc.start.offset
    })
  }

  const preprocessedCode = preprocessedCodes
    .toSorted(({ offset: offsetA }, { offset: offsetB }) => offsetA - offsetB)
    .map(({ source }) => source).join('\n')

  const { descriptor: preprocessedDescriptor } = parse(
    preprocessedCode,
    { filename: folderPath + '.vue' }
  )

  const { content: compiledJs, map } = compileScript(preprocessedDescriptor, {
    id,
    inlineTemplate: hasSetup,
    customElement: true,
    filename,
    sourceMap: enableSourcemap === true || enableSourcemap?.js || false
  })

  const compiledStyles = preprocessedDescriptor.styles.map(({ content }) => compileStyle({
    id,
    source: content,
    filename
  }).code)

  let compiledTemplate

  if (!hasSetup) {
    const { code: rawCompiledTemplate } = compileTemplate({
      id,
      source: preprocessedDescriptor.template.content,
      filename
    })

    compiledTemplate = rawCompiledTemplate.replace(RENDER_EXPORT_PATTERN, '$1$2')
  } else {
    compiledTemplate = ''
  }

  const componentOptions = compiledJs.match(COMPONENT_DEFAULT_EXPORT_PATTERN)?.[1] || '{}'

  const componentName = folderBasename.split('_')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join('')

  const componentDefinition = compiledJs.replace(COMPONENT_DEFAULT_EXPORT_PATTERN, `
    ${compiledTemplate}
    const ${componentName} = defineCustomElement({
      ...${componentOptions},
      ${compiledTemplate ? 'render,' : ''}
      styles: [\`${compiledStyles.join('`,`')}\`]
    })
  `)

  const conbinedCode = `
   import { defineCustomElement } from 'vue'
   ${componentDefinition}
  customElements.define('${id}', ${componentName})
  `

  return { code: conbinedCode, map }
}
