import logger from './logger.js'

const log = logger.getLogger('shutdown_cleaner')

const cleaners = []
let shuttingDown = false

async function clean () {
  if (!shuttingDown) {
    shuttingDown = true
    log.info('Cleanning up before shutdown...')

    for (const cleaner of new Set(cleaners)) {
      try {
        await cleaner()
        log.debug(`cleaner ${cleaner.name} was successfully run`)
      } catch (error) {
        log.error('unable to run cleaner\n\n', cleaner, '\n\n', error)
      }
    }

    log.info('Exiting.')
    process.exit(0)
  }
}

const systemSignals = ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'SIGTERM']

systemSignals.forEach(signal => process.on(signal, clean))

export const register = (...args) => cleaners.unshift(...args)
