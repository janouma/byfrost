import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, basename, extname, relative } from 'path'
import logger from '@byfrost/utils/logger.js'
import { spawnSync, execSync } from 'child_process'
import { minify } from 'terser'
import scriptPreprocessor from './script_preprocessor.js'
import { rewriteModulesImports, resolveRelativeImports } from './imports_rewriter.js'

const log = logger.getLogger('core/compiler')
let defaultCache

export default async function compileComponent (
  {
    source,
    destination,
    prefix,
    enableSourcemap = false,
    config,
    configWorkingDirectory,
    cache = getDefaultCache(),

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
    svelte: '@byfrost/svelte',
    vue: '@byfrost/vue',
    pjs: '@byfrost/plainjs',
    ...config?.srcTypesCompilerMapping
  }

  const { default: compile } = await import(srcTypesCompilerMapping[sourceType])
  const componentDestFolder = join(destination, componentName)

  if (!existsSync(componentDestFolder)) {
    mkdirSync(componentDestFolder, { recursive: true })
  }

  const stylePreprocessor = config?.stylePreprocessor?.({ dest: (prefix ? prefix + '/' : '') + componentName })

  if (stylePreprocessor) {
    await preprocessStylesSources(stylePreprocessor, source, componentDestFolder)
  } else {
    copySources(source, componentDestFolder, 'styles')
  }

  copySources(source, componentDestFolder, 'assets')

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
      moduleResolutionPaths,
      cache
    }),

    stylePreprocessor,
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
      {
        ...(enableSourcemap && {
          sourceMap: {
            content: compiledSourceMap,
            url: sourceMapFilename
          }
        }),
        module: true
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

// only for test purpose
export function clearDefaultCache () {
  defaultCache?.clear()
}
//

function getDefaultCache () {
  defaultCache ??= new Map()
  return defaultCache
}

async function preprocessStylesSources (stylePreprocessor, source, to) {
  const stylesPath = join(source, 'styles')

  if (existsSync(stylesPath)) {
    const stylesDestPath = join(to, 'styles')

    if (!existsSync(stylesDestPath)) {
      mkdirSync(stylesDestPath, { recursive: true })
    }

    const files = String(execSync(`find ${stylesPath} -type f -name '*.css'`, { silent: true })).trim().split('\n')

    for (const file of files) {
      const content = String(readFileSync(file))
      const { code } = await stylePreprocessor({ content, filename: file })
      const relativeFilename = relative(stylesPath, file)
      const destination = join(stylesDestPath, relativeFilename)
      writeFileSync(destination, code)
    }
  }
}

function copySources (source, to, target) {
  const targetPath = join(source, target)

  if (existsSync(targetPath)) {
    spawnSync('cp', ['-R', targetPath, to])
  }
}
