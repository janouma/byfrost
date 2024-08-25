import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, basename, extname } from 'path'
import logger from '@bifrost/utils/logger.js'
import { spawnSync } from 'child_process'
import { minify } from 'terser'
import scriptPreprocessor from './script_preprocessor.js'
import { rewriteModulesImports, resolveRelativeImports } from './imports_rewriter.js'

const log = logger.getLogger('core/compiler')

export default async function compileComponent (
  {
    source,
    destination,
    prefix,
    enableSourcemap = false,
    config,
    configWorkingDirectory,

    moduleResolutionPaths = [
      join(destination || '', basename(source || '')),
      source
    ]
  } = {}
) {
  if (!source) {
    throw new Error('source file must be provided')
  }

  if (!destination) {
    throw new Error('destination file must be provided')
  }

  if (config?.modulesMapping && !configWorkingDirectory) {
    throw new Error('configWorkingDirectory path must be provided alongside config.modulesMapping')
  }

  if (config?.stylePreprocessor && typeof config.stylePreprocessor !== 'function') {
    throw new Error('config.stylePreprocessor must be a function')
  }

  if (prefix && !config?.stylePreprocessor) {
    log.warn(`prefix (${prefix}) is useless without stylePreprocessor`)
  }

  const componentName = basename(source)
  const componentFiles = readdirSync(source, { withFileTypes: true })

  const sourceName = componentFiles
    .find(entry => entry.isFile() && entry.name.startsWith('index.'))?.name

  const filename = join(source, sourceName)

  if (!sourceName) {
    throw new Error(`source file ${filename} is missing`)
  }

  const sourceType = extname(sourceName).replace(/^\./, '')

  const srcTypesCompilerMapping = {
    svelte: '@bifrost/svelte',
    vue: '@bifrost/vue',
    ...config?.srcTypesCompilerMapping
  }

  const { default: compile } = await import(srcTypesCompilerMapping[sourceType])
  const componentDestFolder = join(destination, componentName)

  if (!existsSync(componentDestFolder)) {
    mkdirSync(componentDestFolder, { recursive: true })
  }

  for (const target of ['assets', 'styles']) {
    copySources(source, componentDestFolder, target)
  }

  const sourceCode = String(readFileSync(filename))

  let compiledJs
  let compiledSourceMap

  ({ code: compiledJs, map: compiledSourceMap } = await compile({
    code: sourceCode,
    enableSourcemap,

    scriptPreprocessor: scriptPreprocessor({
      source,
      destination,
      prefix,
      enableSourcemap,

      config: {
        ...config,
        srcTypesCompilerMapping
      },

      configWorkingDirectory,
      moduleResolutionPaths
    }),

    stylePreprocessor: config?.stylePreprocessor?.({ dest: (prefix ? prefix + '/' : '') + componentName }),
    filename
  }))

  if (config) {
    const { modulesMapping = {}, copyModules = false } = config

    compiledJs = rewriteModulesImports({
      code: compiledJs,
      modulesMapping,
      copyModules,
      configWorkingDirectory,
      source,
      sourceTypes: Object.keys(srcTypesCompilerMapping),
      destination,
      moduleResolutionPaths
    })
  }

  compiledJs = resolveRelativeImports({ code: compiledJs, source, destination, moduleResolutionPaths })
  compiledJs = compiledJs.replace(/\bimport\s+'component:/g, "import '")

  const sourceMapFilename = 'index.js.map'

  let minifiedJs
  let minifiedSourceMap

  try {
    let minifyError

    ({
      code: minifiedJs,
      map: minifiedSourceMap,
      error: minifyError
    } = await minify(
      compiledJs,
      enableSourcemap && {
        sourceMap: {
          content: compiledSourceMap,
          url: sourceMapFilename
        }
      }
    ))

    if (minifyError) { throw minifyError }
  } catch (error) {
    const { message, line, col, pos } = error

    log.trace({ compiledJs })

    throw new Error(`source: ${join(source, sourceName)} – ${message}\n\tline: ${line}, column: ${col}, position: ${pos}`)
  }

  const destinationFile = join(componentDestFolder, 'index.js')
  writeFileSync(destinationFile, minifiedJs)

  if (enableSourcemap) {
    const destinationSourceMapFile = join(componentDestFolder, sourceMapFilename)
    writeFileSync(destinationSourceMapFile, minifiedSourceMap)
  }
}

function copySources (source, to, target) {
  const targetPath = join(source, target)

  if (existsSync(targetPath)) {
    spawnSync('cp', ['-R', targetPath, to])
  }
}
