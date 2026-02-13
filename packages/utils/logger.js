const SILENT = 'silent'
const logLevels = [SILENT, 'error', 'warn', 'info', 'log', 'debug', 'trace']
const isBrowserEnvironment = typeof window !== 'undefined'

let filters
let stringFilters
let regExpFilters
let logConfig
let loadLogLevel
let saveLogLevel
let loggers
let frozenLoggers

const rootLogger = {
  _logLevel: SILENT,

  get isChildLogger () {
    // eslint-disable-next-line eqeqeq
    return this.name != undefined
  },

  set logLevel (level) {
    const logger = this.isChildLogger ? loggers.get(this.name) : rootLogger

    if (level) {
      logger._logLevel = level
      setLogMethods(logger)

      if (saveLogLevel) {
        saveLogLevel(this._logLevel, this.name)
      }
    } else {
      if (logger.isChildLogger) {
        delete logger._logLevel
        resetLogMethods(logger)
      } else {
        this.warn(`logLevel unchanged (${this._logLevel}) because provided value was falsy`)
      }
    }
  },

  get logLevel () { return this._logLevel },

  set filters (newFilters) {
    if (
      // eslint-disable-next-line eqeqeq
      newFilters != undefined && (
        !Array.isArray(newFilters) ||
        newFilters.length === 0 ||
        newFilters.some(filter => !filter || (typeof filter !== 'string' && !(filter instanceof RegExp)))
      )
    ) {
      throw new Error(
        '"newFilters" argument must be a non-empty array of non-empty strings or RegExps. actual: ' + JSON.stringify(newFilters)
      )
    }

    filters = newFilters && [...newFilters]
    stringFilters = newFilters?.filter(filter => typeof filter === 'string')
    regExpFilters = newFilters?.filter(filter => filter instanceof RegExp)

    setMuteFlag(rootLogger)

    if (loggers?.size > 0) {
      for (const logger of loggers.values()) {
        setMuteFlag(logger)
      }
    }
  },

  get filters () {
    const filtersWithFrozenItems = filters.map(filter => typeof filter === 'object' ? Object.freeze(filter) : filter)
    return Object.freeze(filtersWithFrozenItems)
  },

  set loadLogLevel (logLevelLoader) {
    loadLogLevel = logLevelLoader
    logConfig = loadLogLevel(this.name)

    logConfig.then(storedLevel => {
      const logger = this.isChildLogger ? loggers.get(this.name) : rootLogger

      if (storedLevel) {
        logger._logLevel = storedLevel
        setLogMethods(logger)
      } else {
        if (logger.isChildLogger) {
          delete logger._logLevel
          resetLogMethods(logger)
        } else {
          this.warn(`logLevel unchanged (${this._logLevel}) because provided value was falsy`)
        }
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

    loggers ||= new Map()
    frozenLoggers ||= new Map()

    if (!loggers.has(name)) {
      const logger = Object.create(this)
      logger.name = name

      logger.getPrefixedArgs = isBrowserEnvironment
        ? args => [name, ...args]
        : args => [name + ' ▷', ...args]

      setMuteFlag(logger)
      loggers.set(name, logger)
      frozenLoggers.set(name, Object.freeze(Object.create(logger)))
    }

    return frozenLoggers.get(name)
  },

  getPrefixedArgs: args => args,

  ...logLevels
    .filter(level => level !== SILENT).reduce((logMethods, level) => Object.assign(logMethods, { [level]: silent }), {}),

  canLog (level) {
    return logLevels.indexOf(level) <= logLevels.indexOf(this._logLevel)
  }
}

export default Object.freeze(Object.create(rootLogger))

function setLogMethods (logger) {
  for (const level of logLevels.filter(lvl => lvl !== SILENT)) {
    if (logger.canLog(level)) {
      logger[level] = function printLog (...args) {
        if (!this.mute) {
          log({
            level,
            displayedLevel: level.toUpperCase(),
            args: this.getPrefixedArgs(args)
          })
        }
      }
    } else {
      logger[level] = silent
    }
  }
}

function resetLogMethods (logger) {
  for (const level of logLevels.filter(lvl => lvl !== SILENT)) {
    delete logger[level]
  }
}

function setMuteFlag (logger) {
  logger.mute = filters && !stringFilters.includes(logger.name) && !regExpFilters.some(filter => logger.name?.match(filter))
}

function silent () { }

const logSeparator = isBrowserEnvironment ? '' : ' |'

function log ({ level, displayedLevel, args }) {
  console[level](displayedLevel.padStart(5, ' ') + logSeparator, ...args)
}
