import { exec } from 'child_process'
import { readFileSync } from 'fs'
import logger from './logger.js'
import { not } from './args.js'

const log = logger.getLogger('utils/run')
const runUtilityArgs = ['command', 'envFile', 'run']

export default function run (args) {
  log.debug({ args })

  const envFile = process.env.envFile || args.envFile || '.env'
  process.env.envFile = envFile

  log.info(`\x1b[4m\x1b[3menvFile: ${process.env.envFile}\x1b[23m\x1b[24m\n`)

  const env = JSON.parse(String(readFileSync(envFile)))
  Object.assign(process.env, env)

  const commandExtraArgs = Object.entries(args)
    .filter(([name]) => !runUtilityArgs.includes(name))
    .map(([name, value]) => {
      log.debug({ name, value })

      if (typeof value !== 'boolean') {
        const delimiter = value.includes?.('"') ? "'" : '"'
        return `${name}=${delimiter}${value}${delimiter}`
      }

      return value ? name : not(name)
    })
    .join(' ')

  const command = `${args.command} ${commandExtraArgs}`

  log.debug(`\x1b[7m\x1b[1m\x1b[94m running command "${command.trim()}" \n\x1b[39m\x1b[22m\x1b[27m`)

  const subProcess = exec(command)

  subProcess.stdout.pipe(process.stdout)
  subProcess.stderr.pipe(process.stderr)

  function onEnd (code) {
    process.exit(code)
  }

  subProcess.on('close', onEnd)
  subProcess.on('exit', onEnd)
}
