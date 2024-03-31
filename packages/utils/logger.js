const SILENT = 'silent'
const logLevels = [SILENT, 'error', 'warn', 'info', 'log', 'debug']

let [logLevel] = logLevels
let logConfig = Promise.resolve()
let loadLogLevel
let saveLogLevel
let loggers

export default Object.freeze({
  set logLevel (level) {
    logLevel = level

    if (saveLogLevel) {
      saveLogLevel(logLevel)
    }
  },

  get logLevel () { return logLevel },

  set loadLogLevel (logLevelLoader) {
    loadLogLevel = logLevelLoader
    logConfig = loadLogLevel()
    logConfig.then(storedLevel => { logLevel = storedLevel })
  },

  get loadLogLevel () { return loadLogLevel },

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

  ...logLevels.reduce((logMethods, level) => Object.assign(logMethods, {
    [level] (...args) { log(level, this.name, ...args) }
  }), {})
})

function log (level, name, ...args) {
  logConfig.then(() => {
    if (canLog(level)) {
      const prefixedArgs = name ? [name + ':', ...args] : args
      console[level](...prefixedArgs)
    }
  })
}

function canLog (level) {
  return level !== SILENT && logLevels.indexOf(level) <= logLevels.indexOf(logLevel)
}
