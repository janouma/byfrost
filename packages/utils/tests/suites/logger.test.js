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
    const logMessage = 'log message'
    const loggerName = 'test'

    {
      const logger = await importLogger()
      const log = logger.getLogger(loggerName)

      logger.logLevel = 'info'
      log.info(logMessage)
      td.verify(console.info(' INFO |', loggerName + ' ▷', logMessage))
      td.reset()
    }

    globalThis.window = {}

    {
      const logger = await importLogger()
      const log = logger.getLogger(loggerName)

      logger.logLevel = 'info'
      log.info(logMessage)
      td.verify(console.info(' INFO', loggerName, logMessage))
    }
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

  for (const level of logLevels.slice(1)) {
    test(`#${level} should log only from logger matched by filters`, async () => {
      const childLogMessage = 'child log message'
      const rootLogMessage = 'root log message'
      const logger = await importLogger()
      const childLoggerBaseName = 'logger.test/'
      const childLoggerName = childLoggerBaseName + level

      logger.logLevel = level
      logger.filters = [childLoggerName]
      logger[level](rootLogMessage)

      {
        const childLogger = logger.getLogger(childLoggerName)
        childLogger[level](childLogMessage)
      }

      td.verify(console[level](
        level.toUpperCase().padStart(5, ' ') + ' |',
        `${childLoggerName} ▷`,
        childLogMessage
      ))

      td.verify(
        console[level](
          level.toUpperCase().padStart(5, ' ') + ' |',
          rootLogMessage
        ),
        { times: 0 }
      )

      td.reset()

      {
        const childLogger = logger.getLogger(childLoggerName + '-bis')
        childLogger.filters = [new RegExp(`^${childLoggerBaseName}`)]
        childLogger[level](childLogMessage + ' bis')
        logger.getLogger(childLoggerName)[level](childLogMessage)
      }

      logger.getLogger('filteredOutLogger')[level]('filtered out log message')

      td.verify(console[level](
        level.toUpperCase().padStart(5, ' ') + ' |',
        `${childLoggerName + '-bis'} ▷`,
        childLogMessage + ' bis'
      ))

      td.verify(console[level](
        level.toUpperCase().padStart(5, ' ') + ' |',
        `${childLoggerName} ▷`,
        childLogMessage
      ))

      td.verify(
        console[level](
          level.toUpperCase().padStart(5, ' ') + ' |',
          'filteredOutLogger ▷',
          'filtered out log message'
        ),
        { times: 0 }
      )

      td.reset()

      logger.filters = undefined

      logger[level](rootLogMessage)
      logger.getLogger(childLoggerName)[level](childLogMessage)

      td.verify(
        console[level](
          level.toUpperCase().padStart(5, ' ') + ' |',
          rootLogMessage
        )
      )

      td.verify(console[level](
        level.toUpperCase().padStart(5, ' ') + ' |',
        `${childLoggerName} ▷`,
        childLogMessage
      ))
    })
  }

  test('#loadLogLevel setter should load stored config', async ({ expect }) => {
    const logger = await importLogger()

    logger.loadLogLevel = () => Promise.resolve('info')
    await nextTick()

    expect(logger.logLevel).toBe('info')

    const childLoggerName = 'logger.test'
    const childLogger = logger.getLogger(childLoggerName)

    const loadLogLevel = td.when(td.function('loadLogLevel')(childLoggerName))
      .thenReturn(Promise.resolve('warn'))

    childLogger.loadLogLevel = loadLogLevel
    await nextTick()
    expect(childLogger.logLevel).toBe('warn')
  })

  test('#saveLogLevel should cause level to be persisted when logLevel is set', async () => {
    const logger = await importLogger()

    logger.saveLogLevel = td.function('saveLogLevel')
    logger.logLevel = 'info'

    td.verify(logger.saveLogLevel('info', undefined))

    const childLoggerName = 'logger.test'
    const childLogger = logger.getLogger(childLoggerName)

    childLogger.logLevel = 'warn'
    td.verify(logger.saveLogLevel('warn', childLoggerName))
  })

  test('#logLevel setter should set level on current logger', async ({ expect }) => {
    const logger = await importLogger()
    const childLoggerName = 'logger.test'
    const childLogger = logger.getLogger(childLoggerName)

    logger.logLevel = 'info'
    childLogger.logLevel = 'log'

    expect(logger.logLevel).toBe('info')
    expect(childLogger.logLevel).toBe('log')

    logger.info('root info log')
    logger.log('root simple log')
    childLogger.info('child info log')
    childLogger.log('child simple log')

    td.verify(console.info(' INFO |', 'root info log'))
    td.verify(console.log('  LOG |', 'root simple log'), { times: 0 })
    td.verify(console.info(' INFO |', `${childLoggerName} ▷`, 'child info log'))
    td.verify(console.log('  LOG |', `${childLoggerName} ▷`, 'child simple log'))

    td.reset()

    logger.logLevel = undefined
    expect(logger.logLevel).toBe('info')

    childLogger.logLevel = undefined
    expect(childLogger.logLevel).toBe('info')

    logger.info('root info log')
    logger.log('root simple log')
    childLogger.info('child info log')
    childLogger.log('child simple log')

    td.verify(console.info(' INFO |', 'root info log'))
    td.verify(console.log('  LOG |', 'root simple log'), { times: 0 })
    td.verify(console.info(' INFO |', `${childLoggerName} ▷`, 'child info log'))
    td.verify(console.log('  LOG |', `${childLoggerName} ▷`, 'child simple log'), { times: 0 })
  })

  test('#filters setter should validate arguments', async ({ expect }) => {
    const logger = await importLogger()
    const baseErrorMessage = '"newFilters" argument must be a non-empty array of non-empty strings or RegExps. actual: '

    expect(() => { logger.filters = '' }).toThrow(baseErrorMessage + '""')
    expect(() => { logger.filters = [''] }).toThrow(baseErrorMessage + '[""]')
    expect(() => { logger.filters = [] }).toThrow(baseErrorMessage + '[]')
    expect(() => { logger.filters = [undefined] }).toThrow(baseErrorMessage + '[null]')
    expect(() => { logger.filters = [null] }).toThrow(baseErrorMessage + '[null]')
    expect(() => { logger.filters = [5] }).toThrow(baseErrorMessage + '[5]')
  })

  test('#filters getter should return a frozen array', async ({ expect }) => {
    const logger = await importLogger()
    const initialFilters = ['one', /two/]
    logger.filters = initialFilters

    const retrievedFilters = logger.filters

    expect(logger.filters).not.toBe(initialFilters)
    expect(() => { retrievedFilters[0] = 'two' }).toThrow()
    expect(() => { retrievedFilters[2] = 'two' }).toThrow()
    expect(() => { retrievedFilters.push('two') }).toThrow()
    expect(() => { logger.filters[1].lastIndex = 1 }).toThrow()
  })
})
