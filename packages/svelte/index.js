import { compile, preprocess } from 'svelte/compiler'
import { existsSync } from 'fs'
import { dirname, basename } from 'path'

// RegExp doc = https://extendsclass.com/regex/c817870
// password = svelte:options
const TAG_OPTION_PATTERN = /<svelte:options\s+.*?\bcustomElement\s*=\s*((\{?("|').*?\3\}?)|\{\{.*?\btag\s*:\s*("|').*?\4.*?\}\}).*?\/>/s

// RegExp doc = https://extendsclass.com/regex/bf22122
// password = svelte:options

const CUSTOM_ELEMENT_NAME_PATTERN = /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/
const SVELTE_OPTIONS_PATTERN = /<svelte:options\s+.*?\/>/s
const CUSTOM_ELEMENT_ATTRIBUTE_PATTERN = /\bcustomElement\s*=\s*(\{(\{.*?\})\})/s

export default async function compileComponent (
  {
    code: rawCode,
    scriptPreprocessor,
    stylePreprocessor,
    enableSourcemap,
    filename
  } = {}
) {
  if (typeof rawCode !== 'string') {
    throw new Error('code must be provided')
  }

  const tagOption = rawCode.match(TAG_OPTION_PATTERN)?.[1]

  if (tagOption) {
    throw new Error(`customElement tag option is forbiden: customElement=${tagOption}`)
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

  const svelteOptions = rawCode.match(SVELTE_OPTIONS_PATTERN)?.[0]
  const tag = folderBasename.replaceAll('_', '-').toLowerCase()
  let code

  if (svelteOptions) {
    const customElementValue = svelteOptions.match(CUSTOM_ELEMENT_ATTRIBUTE_PATTERN)?.[2]
    let svelteOptionsWithTag

    if (customElementValue) {
      const tagPropertyAddon = customElementValue.match(/\{.+\}/s)
        ? `, tag: '${tag}'}`
        : `tag: '${tag}'}`

      const customElementValueWithTag = customElementValue.replace(/\s?\}$/s, tagPropertyAddon)

      svelteOptionsWithTag = svelteOptions.replace(
        CUSTOM_ELEMENT_ATTRIBUTE_PATTERN,
        `customElement={${customElementValueWithTag}}`
      )
    } else {
      svelteOptionsWithTag = svelteOptions.replace(/\s?\/>$/s, ` customElement="${tag}"/>`)
    }

    code = rawCode.replace(SVELTE_OPTIONS_PATTERN, svelteOptionsWithTag)
  } else {
    code = `<svelte:options customElement="${tag}"/>\n` + rawCode
  }

  const { code: processedCode } = await preprocess(
    code,
    {
      script: scriptPreprocessor,
      style: stylePreprocessor
    },
    { filename }
  )

  let compiledJs
  let compiledSourceMap

  try {
    ({ js: { code: compiledJs, map: compiledSourceMap } } = compile(
      processedCode,
      {
        filename,
        customElement: true,
        enableSourcemap: enableSourcemap || false
      }
    ))
  } catch (error) {
    let refinedError

    if (error.name === 'ParseError') {
      refinedError = new Error(`${error.code} — ${error.message}\nin file ${error.filename}
${error.frame}
      `)
      refinedError.name = error.name
    } else {
      refinedError = error
    }

    throw refinedError
  }

  return { code: compiledJs, map: compiledSourceMap }
}
