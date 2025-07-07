import { createRequire } from 'module'

import {
  join, basename, dirname, relative as relativize, resolve as resolvePath, sep as pathSeparator
} from 'path'

import { curry } from '@byfrost/utils/function.js'
import { createOffsettedSplice } from '@byfrost/utils/string.js'
import { rewriteModulesImports, copyWithDependencies } from './imports_rewriter.js'
import compile from './compiler.js'

import {
  COMPONENT_TYPE,
  PLAIN_JS_TYPE,
  ASSET_TYPE,
  getComponentUriPattern,
  extractDependencies
} from './dependencies_parser.js'

const require = createRequire(import.meta.url)
const leadingDotSlash = /^\.\//

export default curry(async (
  {
    source,
    destination,
    prefix,
    enableSourcemap,
    config,
    moduleResolutionPaths,
    configWorkingDirectory,
    cache,

    // only for test purpose
    resolveModule = require.resolve
  },
  { content: code }
) => {
  const hostComponentName = basename(source)
  const hostComponentDestFolder = join(destination, hostComponentName)
  const sourceTypes = Object.keys(config.srcTypesCompilerMapping)
  let transformedCode = code

  const dependencyImports = extractDependencies(transformedCode, { sourceTypes }).filter(({ type }) => type === PLAIN_JS_TYPE)

  {
    const splice = createOffsettedSplice()

    for (const { target, targetBounds: { start, end } } of dependencyImports) {
      const dependencySourcePath = resolveModule(target, { paths: [source] })
      const depInitialDestPath = resolvePath(hostComponentDestFolder, target)

      const depRelativeDestPath = relativize(destination, depInitialDestPath)
        .replaceAll('..' + pathSeparator, '--' + pathSeparator)

      const depFinalDestPath = join(destination, depRelativeDestPath)
        .replace(/\.js$/, '') + '.js'

      copyWithDependencies({ src: dependencySourcePath, copy: depFinalDestPath, base: destination })

      const updatedImportPath = relativize(hostComponentDestFolder, depFinalDestPath)
      const leadingDot = updatedImportPath.startsWith('.') ? '' : './'
      transformedCode = splice(transformedCode, `'${leadingDot}${updatedImportPath}'`, start, end)
    }
  }

  if (config) {
    const { modulesMapping = {}, copyModules = false } = config

    transformedCode = rewriteModulesImports({
      code: transformedCode,
      modulesMapping,
      copyModules,
      configWorkingDirectory,
      source,
      sourceTypes,
      destination,
      moduleResolutionPaths
    })
  }

  const componentImports = extractDependencies(transformedCode, { sourceTypes })
    .filter(({ type }) => type === COMPONENT_TYPE)

  {
    const splice = createOffsettedSplice()

    for (const { target, sourceType, targetBounds: { start, end } } of componentImports) {
      const [component, file] = Array.from(target.match(getComponentUriPattern(sourceType))).slice(-2)
      const dependencyPath = resolveModule(target, { paths: [source] })
      let targetDestinationPath

      if (cache.has(dependencyPath)) {
        targetDestinationPath = cache.get(dependencyPath)
      } else {
        const dependencySourceFolder = dirname(dependencyPath)
        const componentDestFolder = join(destination, component)

        targetDestinationPath = join(componentDestFolder, `${file}.js`)
        cache.set(dependencyPath, targetDestinationPath)

        try {
          await compile({
            source: dependencySourceFolder,
            destination,
            prefix,
            enableSourcemap,
            config,
            configWorkingDirectory,
            cache,

            moduleResolutionPaths: [
              dependencySourceFolder,
              join(destination, hostComponentName),
              source
            ]
          })
        } catch (error) {
          cache.delete(dependencyPath)
          throw error
        }
      }

      const destImportTarget = relativize(hostComponentDestFolder, targetDestinationPath)
      transformedCode = splice(transformedCode, `'component:${destImportTarget}'`, start, end)
    }
  }

  const assetImports = extractDependencies(transformedCode).filter(({ type }) => type === ASSET_TYPE)
  const componentRelativePath = prefix ? join(prefix, hostComponentName) : hostComponentName

  {
    const splice = createOffsettedSplice()

    for (const { start, end, variables: [variable], target } of assetImports) {
      transformedCode = splice(
        transformedCode,
        `const ${variable} = '${componentRelativePath}/${target.replace(leadingDotSlash, '')}'`,
        start,
        end
      )
    }
  }

  return { code: transformedCode }
})
