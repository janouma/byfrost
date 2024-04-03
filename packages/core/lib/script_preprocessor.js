import { createRequire } from 'module'

import {
  join, basename, dirname, relative as relativize, resolve as resolvePath, sep as pathSeparator
} from 'path'

import { mkdirSync } from 'fs'
import { spawnSync } from 'child_process'
import { curry } from '@bifrost/utils/function.js'
import { createOffsettedSplice } from '@bifrost/utils/string.js'
import { rewriteModulesImports } from './imports_rewriter.js'
import compile from './compiler.js'

import {
  COMPONENT_TYPE,
  DEPENDENCY_TYPE,
  ASSET_TYPE,
  getComponentUriPattern,
  extractImports
} from './imports_parser.js'

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

    // only for test purpose, since it is not possible to mock require.resolve at this moment
    resolveModule = require.resolve
  },
  { content: code }
) => {
  const hostComponentName = basename(source)
  const hostComponentDestFolder = join(destination, hostComponentName)
  const sourceTypes = Object.keys(config.srcTypesCompilerMapping)
  let transformedCode = code

  const dependencyImports = extractImports(transformedCode, { sourceTypes }).filter(({ type }) => type === DEPENDENCY_TYPE)

  {
    const splice = createOffsettedSplice()

    for (const { start, end, default: defaultImport, variables, target } of dependencyImports) {
      const dependencySourcePath = resolveModule(target, { paths: [source] })
      const depInitialDestPath = resolvePath(hostComponentDestFolder, target)

      const depRelativeDestPath = relativize(destination, depInitialDestPath)
        .replaceAll('..' + pathSeparator, '--' + pathSeparator)

      const depFinalDestPath = join(destination, depRelativeDestPath)
        .replace(/\.js$/, '') + '.js'

      mkdirSync(dirname(depFinalDestPath), { recursive: true })
      spawnSync('cp', [dependencySourcePath, depFinalDestPath])

      const updatedImportPath = relativize(hostComponentDestFolder, depFinalDestPath)
      const leadingDot = updatedImportPath.startsWith('.') ? '' : './'
      const variablesStatements = []

      if (defaultImport) {
        variablesStatements.push(defaultImport)
      }

      const namedImports = variables.filter(name => name !== defaultImport)

      if (namedImports.length > 0) {
        variablesStatements.push(`{${namedImports.join(',')}}`)
      }

      const from = variables.length > 0 ? ' from ' : ''

      transformedCode = splice(
        transformedCode,
        `import ${variablesStatements.join(',')}${from}'${leadingDot}${updatedImportPath}'`,
        start,
        end
      )
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
      destination,
      moduleResolutionPaths
    })
  }

  const componentImports = extractImports(transformedCode, { sourceTypes })
    .filter(({ type }) => type === COMPONENT_TYPE)

  {
    const splice = createOffsettedSplice()

    for (const { target, sourceType, start, end } of componentImports) {
      const [component, file] = Array.from(target.match(getComponentUriPattern(sourceType))).slice(-2)
      const dependencyPath = resolveModule(target, { paths: [source] })
      const dependencySourceFolder = dirname(dependencyPath)
      const componentDestFolder = join(destination, component)
      const destImportTarget = join(relativize(hostComponentDestFolder, componentDestFolder), `${file}.js`)

      await compile({
        source: dependencySourceFolder,
        destination,
        prefix,
        enableSourcemap,
        config,
        configWorkingDirectory,

        moduleResolutionPaths: [
          dependencySourceFolder,
          join(destination, hostComponentName),
          source
        ]
      })

      transformedCode = splice(transformedCode, `import 'component:${destImportTarget}'`, start, end)
    }
  }

  const assetImports = extractImports(transformedCode).filter(({ type }) => type === ASSET_TYPE)
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
