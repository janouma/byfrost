#!/usr/bin/env node

import { argsArrayToArgsObject } from '../args.js'
import run from '../run.js'
import logger from '../logger.js'

logger.logLevel = process.env.LOG_LEVEL

const log = logger.getLogger('utils/bin/index')
const [command] = process.argv.slice(2)

if (!command) {
  throw new Error('missing arguments (--help for usage)')
}

switch (command) {
  case '--help': {
    log.info('\x1b[1m\x1b[32m--help\x1b[89m\x1b[22m\x1b[0m\t\tPrint the current help\n')
    log.info('\x1b[1m\x1b[32mrun\x1b[89m\x1b[22m\x1b[0m\t\tRun a command after loading the provided env file\n')
    log.info('  Arguments:\n')
    log.info('  \x1b[1m\x1b[34mcommand=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34mpath\x1b[89m\x1b[23m\x1b[0m\t\t\x1b[1m\x1b[31mrequired\x1b[89m\x1b[22m\x1b[0m\t\tThe command to run')
    log.info('  \x1b[1m\x1b[34menvFile=\x1b[89m\x1b[22m\x1b\x1b[3m\x1b[34mpath\x1b[89m\x1b[23m\x1b[0m\t\x1b[1m\x1b[31moptional\x1b[89m\x1b[22m\x1b[0m\t\tEnv file to load (default to .env)')
    break
  }

  case 'run': {
    try {
      run(argsArrayToArgsObject())
    } catch (error) {
      process.stderr.write(error.stack + '\n')
      process.exit(1)
    }

    break
  }

  default: {
    throw new Error(`unknown argument ${command} (--help for usage)`)
  }
}
