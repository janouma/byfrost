import logger from './logger.js'

const log = logger.getLogger('@bifrost/utils/function')

export function debounce (fn, delay) {
  if (typeof fn !== 'function') {
    throw new Error('fn argument must be a function. Actual: ' + fn)
  }

  if (typeof delay !== 'number') {
    throw new Error('delay argument must be a number. Actual: ' + delay)
  }

  const { setTimeout, clearTimeout } = globalThis
  let timeoutId

  return function debouncedFn (...args) {
    log.debug(timeoutId ? 'reseting debounced call to' : 'debouncing call to', fn.name || fn.toString())
    clearTimeout(timeoutId)

    timeoutId = setTimeout(
      function delayedFn () {
        log.debug('actually calling', fn.name || fn.toString())
        fn(...args)
      },
      delay
    )
  }
}

export function curry (fn) {
  return function curriedFn (...args) {
    let result

    if (fn.length <= args.length) {
      result = fn.apply(this, args)
    } else {
      result = function f (...subArgs) {
        return curriedFn(...args, ...subArgs)
      }
    }

    return result
  }
}
