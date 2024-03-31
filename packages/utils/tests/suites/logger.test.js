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
  'debug'
]

async function importLogger () {
  return (await import('../../logger.js')).default
}

test.group('logger', group => {
  group.setup(() => {
    globalThis.console = {
      ...logLevels.reduce((logMethods, level) => Object.assign(logMethods, {
        [level]: td.function(level)
      }), {})
    }
  })

  group.each.teardown(() => td.reset())
  group.teardown(() => { globalThis.console = nativeConsole })

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
    await nextTick()
    td.verify(console.info(loggerName + ':', logMessage))
  })

  test('#getLogger should validate name argument', async ({ expect }) => {
    const logger = await importLogger()

    expect(() => logger.getLogger(undefined)).toThrow('logger name is required')
    expect(() => logger.getLogger('')).toThrow('logger name is required')

    expect(() => logger.getLogger({}))
      .toThrow('logger name must be of type string. Actual: object ([object Object])')
  })

  for (const level of logLevels) {
    test(`#${level} should be mute according to set level`, async () => {
      const logMessage = 'log message'
      const logger = await importLogger()

      logger.logLevel = level

      const mutedLevels = logLevels
        .filter((logLevel, index) => logLevel === 'silent' || logLevels.indexOf(level) < index)

      for (const mutedLevel of mutedLevels) {
        logger[mutedLevel](logMessage)
        await nextTick()

        td.verify(console[mutedLevel](), { times: 0, ignoreExtraArgs: true })
        td.reset()
      }

      const voicedLevels = logLevels.filter(logLevel => !mutedLevels.includes(logLevel))

      for (const voicedLevel of voicedLevels) {
        logger[voicedLevel](logMessage)
        await nextTick()

        td.verify(console[voicedLevel](logMessage))
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
