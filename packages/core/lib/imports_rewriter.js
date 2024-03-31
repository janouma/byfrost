import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname, basename, relative as relativize, resolve as resolvePath } from 'path'
import logger from '@bifrost/utils/logger.js'
import { escapeRegExp, createOffsettedSplice } from '@bifrost/utils/string.js'
import { extractImports, COMPONENT_TYPE } from './imports_parser.js'

const require = createRequire(import.meta.url)
const log = logger.getLogger('utils/imports_rewriter')

export function rewriteModulesImports ({
  code, modulesMapping, copyModules: copyAllModules, source, destination, moduleResolutionPaths,
  configWorkingDirectory, resolveModule = require.resolve
}) {
  const splice = createOffsettedSplice()
  const imports = extractImports(code)

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

      const { alias, configAlias, moduleDestination, configModuleDest, copyModule } = parseConfig({
        srcTarget, target, config, componentDestFolder, configWorkingDirectory, copyAllModules
      })

      log.debug({ alias, configAlias, moduleDestination, configModuleDest, copyModule, copyAllModules })

      const statement = code.substring(start, end)
      const targetLitteral = new RegExp(`("|')${escapeRegExp(srcTarget)}\\1`)

      const componentMark = type === COMPONENT_TYPE && !moduleDestination.endsWith('.svelte')
        ? 'component:'
        : ''

      const rewrittenImport = statement.replace(targetLitteral, `$1${componentMark}${moduleDestination}$1`)

      transformedCode = splice(transformedCode, rewrittenImport, start, end)

      if (copyModule) {
        const aliasDestFolder = dirname(configModuleDest)

        log.debug('aliasDestFolder:', aliasDestFolder)

        if (!existsSync(aliasDestFolder)) {
          mkdirSync(aliasDestFolder, { recursive: true })
        }

        const aliasSrcPath = tryResolvingModule(
          resolveModule, configAlias, { paths: moduleResolutionPaths }
        )

        log.debug('aliasSrcPath:', aliasSrcPath)

        const { error, status, stderr } = spawnSync('cp', [aliasSrcPath, configModuleDest])

        if (error || status) {
          throw new Error(stderr)
        }
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

  return { alias, configAlias, moduleDestination, configModuleDest, copyModule }
}

function relativizeMapping (componentDestFolder, mapping, configWorkingDirectory) {
  if (mapping.startsWith('./') || mapping.startsWith('../')) {
    log.debug(
      `resolvePath('${configWorkingDirectory}', '${mapping}'):`,
      resolvePath(configWorkingDirectory, mapping)
    )

    return relativize(resolvePath(componentDestFolder), resolvePath(configWorkingDirectory, mapping))
  } else {
    return mapping
  }
}

function tryResolvingModule (resolve, target, ...options) {
  let targetSrcPath

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

  return targetSrcPath
}

export function resolveRelativeImports ({
  code, source, destination, moduleResolutionPaths, resolveModule = require.resolve
}) {
  const componentDestFolder = join(destination, basename(source))
  const imports = extractImports(code)
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
