import * as async from './tests/helpers/async.js'
import * as reporter from './tests/helpers/reporter.js'
import * as globals from './tests/setup/globals.js'

export * as function from './function.js'
export * as string from './string.js'
export * as logger from './logger.js'
export * as args from './args.js'
export * as object from './object.js'
export * as shutdownCleaner from './shutdown_cleaner.js'
export * as mail from './mail.js'
export * as colorize from './console.js'

export const tests = {
  helpers: { async, reporter },
  setup: { globals }
}
