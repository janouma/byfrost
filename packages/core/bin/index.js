#!/usr/bin/env node

import { dirname, resolve } from 'path'
import { existsSync } from 'fs'
import compileComponent from '../lib/compiler.js'
import logger from '@bifrost/utils/logger.js'
import { argsArrayToArgsObject } from '@bifrost/utils/args.js'

logger.logLevel = process.env.LOG_LEVEL

const log = logger.getLogger('core/bin/index')
const [command] = process.argv.slice(2)

if (!command) {
  throw new Error('missing arguments (--help for usage)')
}

switch (command) {
  case '--help': {
    console.info('\x1b[1m\x1b[32m--help\x1b[89m\x1b[22m\x1b[0m\t\tPrint the current help\n')

    console.info('\x1b[1m\x1b[32mcompile\x1b[89m\x1b[22m\x1b[0m\t\tCompile a component folder and save the result under the given build folder\n')

    console.info('  Arguments:\n')

    console.info('  \x1b[1m\x1b[34msource=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34mpath\x1b[89m\x1b[23m\x1b[0m\t\t\x1b[1m\x1b[31mrequired\x1b[89m\x1b[22m\x1b[0m\t\tPath to the component folder')

    console.info('  \x1b[1m\x1b[34mdestination=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34mpath\x1b[89m\x1b[23m\x1b[0m\t\x1b[1m\x1b[31mrequired\x1b[89m\x1b[22m\x1b[0m\t\tPath to the build folder hosting all built components')

    console.info('  \x1b[1m\x1b[34msourceMap=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34myes/no\x1b[89m\x1b[23m\x1b[0m\t\x1b[1m\x1b[92moptional\x1b[39m\x1b[22m\x1b[0m\t\tWhether or not the sourcemap should be generated')

    console.info('  \x1b[1m\x1b[34mprefix=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34murl\x1b[89m\x1b[23m\x1b[0m\t\t\x1b[1m\x1b[92moptional\x1b[39m\x1b[22m\x1b[0m\t\tCss assets absolute or relative url prefix')

    console.info('  \x1b[1m\x1b[34mconfig=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34mpath\x1b[89m\x1b[23m\x1b[0m\t\t\x1b[1m\x1b[92moptional\x1b[39m\x1b[22m\x1b[0m\t\tPath to the compile config file. Default to bifrost.config.js')

    console.info(`  \x1b[1m\x1b[34mcache=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34mpath\x1b[89m\x1b[23m\x1b[0m\t\t\x1b[1m\x1b[92moptional\x1b[39m\x1b[22m\x1b[0m\t\tPath to a module exporting an object, as default, having the following interface:

\t\t\t\t\t\t{
\t\t\t\t\t\t  has: (sourcePath: String) => Boolean;
\t\t\t\t\t\t  get: (sourcePath: String) => String;
\t\t\t\t\t\t  set: (sourcePath: String, compiledPath: String) => void;
\t\t\t\t\t\t  delete: (sourcePath: String) => void;
\t\t\t\t\t\t}`)

    break
  }

  case 'compile': {
    compile().catch(error => {
      process.stderr.write(error.stack + '\n')
      process.exit(1)
    })

    break
  }

  default: {
    throw new Error(`unknown argument ${command} (--help for usage)`)
  }
}

async function compile () {
  const {
    source, destination, sourceMap, prefix, cache: cachePath, config: configPath = 'bifrost.config.js'
  } = argsArrayToArgsObject()

  log.debug({ source, destination, sourceMap, prefix, configPath, cachePath })

  const absoluteConfigPath = resolve(configPath)

  log.debug({ absoluteConfigPath })

  const { default: config } = absoluteConfigPath && existsSync(absoluteConfigPath) ? await import(absoluteConfigPath) : {}

  if (!config) {
    log.warn(configPath + ' config file not found')
  }

  const cacheAbsolutePath = cachePath && resolve(cachePath)

  log.debug({ cacheAbsolutePath })

  if (cacheAbsolutePath && !existsSync(cacheAbsolutePath)) {
    throw new Error(`cache module ${cacheAbsolutePath} not found`)
  }

  const { default: cache } = await import(cacheAbsolutePath)

  log.trace({ cache })

  return compileComponent({
    source,
    destination,
    prefix,
    enableSourcemap: sourceMap === 'yes' && { js: true },
    config,
    configWorkingDirectory: config && dirname(absoluteConfigPath),
    cache
  })
}
