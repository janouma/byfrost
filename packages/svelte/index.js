import { compile, preprocess } from 'svelte/compiler'
import { existsSync } from 'fs'

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
    throw error.name === 'ParseError'
      ? new Error(`${error.code} — ${error.message}
in file ${error.filename}
${error.frame}
      `)
      : error
  }

  return { code: compiledJs, map: compiledSourceMap }
}
