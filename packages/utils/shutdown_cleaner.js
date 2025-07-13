import logger from './logger.js'

const log = logger.getLogger('shutdown_cleaner')

const cleaners = []
let shuttingDown = false

async function clean (signal) {
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

    if (signal !== 'exit') {
      const code = ['uncaughtException', 'unhandledRejection'].includes(signal) ? 1 : 0
      process.exit(code)
    }
  }
}

const systemSignals = ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'unhandledRejection', 'SIGTERM']

export const register = (...args) => {
  if (cleaners.length === 0) {
    systemSignals.forEach(signal => process.on(signal, () => clean(signal)))
  }

  cleaners.unshift(...args)
}
