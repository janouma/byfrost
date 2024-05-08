import { createRequire } from 'module'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'

import {
  join,
  dirname,
  basename,
  relative as relativize,
  resolve as resolvePath,
  normalize
} from 'path'

import logger from '@bifrost/utils/logger.js'
import { escapeRegExp, createOffsettedSplice } from '@bifrost/utils/string.js'
import { extractDependencies, COMPONENT_TYPE, PLAIN_JS_TYPE } from './dependencies_parser.js'

const require = createRequire(import.meta.url)
const log = logger.getLogger('core/imports_rewriter')
const cache = new Map()

export function rewriteModulesImports ({
  code, modulesMapping, copyModules: copyAllModules, source, sourceTypes, destination, moduleResolutionPaths,
  configWorkingDirectory, resolveModule = require.resolve
}) {
  const splice = createOffsettedSplice()
  const imports = extractDependencies(code, { sourceTypes })

  const parsedModuleMapping = Object.entries(modulesMapping).map(([target, config]) =>
    target.startsWith('/^') && target.endsWith('$/')
      ? [new RegExp(target.slice(1, -1)), config]
      : [target, config]
  )

  const componentDestFolder = join(destination, basename(source))

  let transformedCode = code

  log.debug({
    configWorkingDirectory,
    componentDestFolder: resolvePath(componentDestFolder)
  })

  for (const { target: srcTarget, type, start, end } of imports) {
    const matches = parsedModuleMapping
      .find(([target]) => target instanceof RegExp ? srcTarget.match(target) : srcTarget === target)

    if (matches) {
      const [target, config] = matches

      log.debug({ target, config })

      const { alias, configAlias, moduleDestination, moduleDestAbsolutePath, copyModule } = parseConfig({
        srcTarget, target, config, componentDestFolder, configWorkingDirectory, copyAllModules
      })

      log.debug(
        { alias, configAlias, moduleDestination, moduleDestAbsolutePath, copyModule, copyAllModules }
      )

      const statement = code.substring(start, end)
      const targetLitteral = new RegExp(`("|')${escapeRegExp(srcTarget)}\\1`)

      const componentMark = type === COMPONENT_TYPE &&
        !sourceTypes.some(sourceType => moduleDestination.endsWith('.' + sourceType))
        ? 'component:'
        : ''

      const rewrittenImport = statement.replace(targetLitteral, `$1${componentMark}${moduleDestination}$1`)

      transformedCode = splice(transformedCode, rewrittenImport, start, end)

      if (copyModule) {
        const aliasSrcPath = tryResolvingModule(
          resolveModule, configAlias, {
            paths: configWorkingDirectory
              ? [...moduleResolutionPaths, configWorkingDirectory]
              : moduleResolutionPaths
          }
        )

        log.debug('aliasSrcPath:', aliasSrcPath)
        copyWithDependencies({ src: aliasSrcPath, copy: moduleDestAbsolutePath })
      }
    }
  }

  return transformedCode
}

function parseConfig ({
  srcTarget, target, config, componentDestFolder, configWorkingDirectory, copyAllModules
}) {
  let alias
  let moduleDestination
  let copyModule
  let configAlias
  let configModuleDest

  if (typeof config === 'object') {
    if (target instanceof RegExp) {
      if (config.alias) {
        configAlias = srcTarget.replace(target, config.alias)
        alias = relativizeMapping(componentDestFolder, configAlias, configWorkingDirectory)
      } else {
        configAlias = alias = srcTarget
      }

      if (config.destination) {
        configModuleDest = srcTarget.replace(target, config.destination)

        moduleDestination = relativizeMapping(
          componentDestFolder, configModuleDest, configWorkingDirectory
        )
      } else {
        configModuleDest = moduleDestination = alias
      }

      ({ copyModule = copyAllModules } = config)
    } else {
      configAlias = config.alias || target
      alias = relativizeMapping(componentDestFolder, configAlias, configWorkingDirectory)

      if (config.destination) {
        configModuleDest = config.destination
        moduleDestination = relativizeMapping(componentDestFolder, configModuleDest, configWorkingDirectory)
      } else {
        configModuleDest = configAlias
        moduleDestination = alias
      }

      ({ copyModule = copyAllModules } = config)
    }
  } else {
    const mapping = target instanceof RegExp ? srcTarget.replace(target, config) : config
    configAlias = configModuleDest = mapping
    alias = moduleDestination = relativizeMapping(componentDestFolder, mapping, configWorkingDirectory)
    copyModule = copyAllModules
  }

  return {
    alias,
    configAlias,
    moduleDestination,
    copyModule,
    ...(copyModule && { moduleDestAbsolutePath: resolvePath(configWorkingDirectory, configModuleDest) })
  }
}

function relativizeMapping (componentDestFolder, mapping, configWorkingDirectory) {
  if (mapping.startsWith('./') || mapping.startsWith('../')) {
    log.debug(
      `resolvePath(configWorkingDirectory:'${configWorkingDirectory}', mapping:'${mapping}'):`,
      resolvePath(configWorkingDirectory, mapping)
    )

    return relativize(resolvePath(componentDestFolder), resolvePath(configWorkingDirectory, mapping))
  } else {
    return mapping
  }
}

function tryResolvingModule (resolve, target, ...options) {
  let targetSrcPath

  log.debug({ target, 'options[0].paths': options[0]?.paths })

  try {
    targetSrcPath = resolve(target, ...options)
  } catch (error) {
    log.warn(error)
    let altAlias = target.replace(/\.(json|m?js)$/, '')
    let moduleSrcPath

    while (!moduleSrcPath && altAlias && altAlias.match(/\/\w+$/)) {
      try {
        moduleSrcPath = dirname(resolve(altAlias, ...options))
      } catch (subsequentError) {
        log.debug(subsequentError)
        altAlias = altAlias.replace(/\/\w+$/, '')
      }
      log.debug('altAlias:', altAlias)
    }

    if (moduleSrcPath) {
      log.debug('moduleSrcPath:', moduleSrcPath)
      targetSrcPath = target.replace(new RegExp(`^${escapeRegExp(altAlias)}`), moduleSrcPath)
    } else {
      throw error
    }
  }

  log.debug({ targetSrcPath })

  return targetSrcPath
}

export function copyWithDependencies ({ src: source, copy: destination, base = dirname(destination) }) {
  log.debug('copyWithDependencies:', { source, destination })

  const sourceCache = cache.get(source)

  if (sourceCache?.has(destination)) {
    return
  } else {
    if (sourceCache) {
      sourceCache.add(destination)
    } else {
      cache.set(source, new Set([destination]))
    }
  }

  const code = readFileSync(source)
  let transformedCode = code

  const dependencies = extractDependencies(
    String(code), { includeExports: true }
  )

  const jsDependencies = dependencies.filter(
    ({ target, type }) =>
      (target.startsWith('./') || target.startsWith('../')) &&
      type === PLAIN_JS_TYPE
  )

  if (log.logLevel === 'debug') {
    log.debug('copyWithDependencies:', { dependencies, jsDependencies })
  }

  const splice = createOffsettedSplice()

  for (const { target, targetBounds: { start, end } } of jsDependencies) {
    const targetAbsolutePath = resolvePath(dirname(source), target)

    const targetOriginalDestPath = resolvePath(dirname(destination), target)
    const targetRelativeDestPath = relativize(base, targetOriginalDestPath)
    const targetDestinationPath = `${base}/${targetRelativeDestPath}`.replaceAll('../', '--/')

    const containedTarget = normalize(relativize(dirname(destination), targetDestinationPath))
      .replace(/^(?!\.\.?\/)/, './')

    const targetDestinationFolderPath = dirname(targetDestinationPath)

    if (!existsSync(targetDestinationFolderPath)) {
      mkdirSync(targetDestinationFolderPath, { recursive: true })
    }

    transformedCode = splice(transformedCode, `'${containedTarget}'`, start, end)
    copyWithDependencies({ src: targetAbsolutePath, copy: targetDestinationPath, base })
  }

  const destinationFolder = dirname(destination)

  if (!existsSync(destinationFolder)) {
    mkdirSync(destinationFolder, { recursive: true })
  }

  writeFileSync(destination, transformedCode)
}

export function resolveRelativeImports ({
  code, source, destination, moduleResolutionPaths, resolveModule = require.resolve
}) {
  const componentDestFolder = join(destination, basename(source))
  const imports = extractDependencies(code)
    .filter(({ target }) => target.startsWith('./') || target.startsWith('../'))

  const splice = createOffsettedSplice()
  let transformedCode = code

  for (const { target, start, end } of imports) {
    const dependencyPath = resolveModule(
      target, { paths: [componentDestFolder, ...moduleResolutionPaths] }
    )

    const importRelativePath = relativize(componentDestFolder, dependencyPath)
    const destImportTarget = !importRelativePath.startsWith('.') ? './' + importRelativePath : importRelativePath

    log.debug({
      target, source, destination, componentDestFolder, moduleResolutionPaths, dependencyPath, importRelativePath, destImportTarget
    })

    const statement = code.substring(start, end)
    const targetLitteral = new RegExp(`("|')${escapeRegExp(target)}\\1`)
    const rewrittenImport = statement.replace(targetLitteral, `$1${destImportTarget}$1`)
    transformedCode = splice(transformedCode, rewrittenImport, start, end)
  }

  return transformedCode
}

// only for test purpose
export function clearCache () {
  cache.clear()
}
