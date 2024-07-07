#!/usr/bin/env node

import { dirname, resolve } from 'path'
import compileComponent from '../lib/compiler.js'

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
  const { source, destination, sourceMap, prefix, config: configPath = 'bifrost.config.js' } = readCommandArguments()
  let absoluteConfigPath

  try {
    absoluteConfigPath = resolve(configPath)
  } catch (error) {
    console.warn(configPath + ' config file not found')
  }

  const { default: config } = absoluteConfigPath ? await import(absoluteConfigPath) : {}

  return compileComponent({
    source,
    destination,
    prefix,
    enableSourcemap: sourceMap === 'yes' && { js: true },
    config,
    configWorkingDirectory: config && dirname(absoluteConfigPath)
  })
}

function readCommandArguments () {
  return process.argv.slice(3)
    .reduce((result, arg) => {
      const [name, ...values] = arg.split('=')

      return {
        ...result,
        [name]: values.join('=')
      }
    }, {})
}
