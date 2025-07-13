import { test } from '@japa/runner'
import * as td from 'testdouble'
import { nextTick } from '../helpers/async.js'

const nativeConsole = console

const logLevels = [
  'silent',
  'error',
  'warn',
  'info',
  'log',
  'debug',
  'trace'
]

async function importLogger () {
  return (await import('../../logger.js?version=' + performance.now())).default
}

test.group('logger', group => {
  group.each.setup(() => {
    globalThis.console = {
      ...logLevels.filter(level => level !== 'silent')
        .reduce((logMethods, level) => Object.assign(logMethods, { [level]: td.function(level) }), {})
    }
  })

  group.each.teardown(() => {
    td.reset()
    delete globalThis.window
    globalThis.console = nativeConsole
  })

  test('#getLogger should return logger delagate', async ({ expect }) => {
    const logger = await importLogger()
    const loggerName = 'test'
    const log = logger.getLogger(loggerName)

    expect(log).not.toBe(logger)
    expect(log).toBe(logger.getLogger(loggerName))
  })

  test('#getLogger should add prefix to logs', async () => {
    const logger = await importLogger()
    const loggerName = 'test'
    const log = logger.getLogger(loggerName)
    const logMessage = 'log message'

    logger.logLevel = 'info'
    log.info(logMessage)
    td.verify(console.info(' INFO |', loggerName + ' ▷', logMessage))
    td.reset()

    globalThis.window = {}

    log.info(logMessage)
    td.verify(console.info(' INFO', loggerName, logMessage))
  })

  test('#getLogger should validate name argument', async ({ expect }) => {
    const logger = await importLogger()

    expect(() => logger.getLogger(undefined)).toThrow('logger name is required')
    expect(() => logger.getLogger('')).toThrow('logger name is required')

    expect(() => logger.getLogger({}))
      .toThrow('logger name must be of type string. Actual: object ([object Object])')
  })

  for (const level of logLevels) {
    test(`#${level} should log only for levels ${level} and above`, async () => {
      const logMessage = 'log message'
      const logger = await importLogger()

      logger.logLevel = level

      const mutedMethods = logLevels.filter((_, index) => logLevels.indexOf(level) < index)

      for (const methodName of mutedMethods) {
        logger[methodName](logMessage)
        td.verify(console[methodName](), { times: 0, ignoreExtraArgs: true })
        td.reset()
      }

      const voicedMethods = logLevels
        .filter(logLevel => !mutedMethods.includes(logLevel) && logLevel !== 'silent')

      for (const methodName of voicedMethods) {
        logger[methodName](logMessage)

        td.verify(console[methodName](
          methodName.toUpperCase().padStart(5, ' ') + ' |',
          logMessage
        ))
        td.reset()
      }
    })
  }

  test('#loadLogLevel setter should load stored config', async ({ expect }) => {
    const storedLevel = 'info'
    const logger = await importLogger()

    logger.loadLogLevel = () => Promise.resolve(storedLevel)
    await nextTick()

    expect(logger.logLevel).toBe(storedLevel)
  })

  test('#saveLogLevel should cause level to be persisted when logLevel is set', async () => {
    const logLevel = 'info'
    const saveLogLevel = td.function('saveLogLevel')
    const logger = await importLogger()

    logger.saveLogLevel = saveLogLevel
    logger.logLevel = logLevel

    td.verify(saveLogLevel(logLevel))
  })
})
