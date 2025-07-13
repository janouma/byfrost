const SILENT = 'silent'
const logLevels = [SILENT, 'error', 'warn', 'info', 'log', 'debug', 'trace']

let [logLevel] = logLevels
let logConfig
let loadLogLevel
let saveLogLevel
let loggers

export default Object.freeze({
  set logLevel (level) {
    if (level) {
      logLevel = level

      if (saveLogLevel) {
        saveLogLevel(logLevel)
      }
    } else {
      this.warn(`logLevel unchanged (${logLevel}) because provided value was falsy`)
    }
  },

  get logLevel () { return logLevel },

  set loadLogLevel (logLevelLoader) {
    loadLogLevel = logLevelLoader
    logConfig = loadLogLevel()

    logConfig.then(storedLevel => {
      if (storedLevel) {
        logLevel = storedLevel
      } else {
        this.warn(`logLevel unchanged (${logLevel}) because stored value was falsy`)
      }
    })
  },

  get loadLogLevel () { return loadLogLevel },
  get logLevelLoading () { return logConfig ?? Promise.resolve() },

  set saveLogLevel (logLevelSaver) { saveLogLevel = logLevelSaver },
  get saveLogLevel () { return saveLogLevel },

  getLogger (name) {
    if (!name || (typeof name === 'string' && !name.trim())) { throw new Error('logger name is required') }

    if (typeof name !== 'string') {
      throw new Error(`logger name must be of type string. Actual: ${typeof name} (${name})`)
    }

    loggers = loggers || new Map()

    if (!loggers.has(name)) {
      const logger = Object.create(this)
      logger.name = name
      loggers.set(name, Object.freeze(logger))
    }

    return loggers.get(name)
  },

  ...logLevels.filter(level => level !== SILENT)
    .reduce((logMethods, level) => Object.assign(logMethods, {
      [level] (...args) {
        log(level, this.name, ...args)
      }
    }), {})
})

function log (level, name, ...args) {
  if (canLog(level)) {
    const isBrowserEnvironment = typeof window !== 'undefined'
    const [nameSeparator, levelSeparator] = isBrowserEnvironment
      ? ['', '']
      : [' ▷', ' |']

    const LEVEL = level.toUpperCase()
    const prefixedArgs = name ? [name + nameSeparator, ...args] : args
    console[level](LEVEL.padStart(5, ' ') + levelSeparator, ...prefixedArgs)
  }
}

function canLog (level) {
  return logLevels.indexOf(level) <= logLevels.indexOf(logLevel)
}
