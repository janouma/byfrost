import { promisify } from 'util'

// in case setTimeout is mocked
const nativeSetTimeout = setTimeout

export const nextTick = globalThis.setImmediate ? promisify(setImmediate) : () => new Promise(resolve => nativeSetTimeout(resolve, 0))

export function waitForPredicate ({ checkPredicate, delay = 100, timeout = 3000 }) {
  if (typeof timeout !== 'number' || Number.isNaN(timeout) || timeout <= 0) {
    throw new Error('timeout must be a positive, non-zero number. Actual: ' + timeout)
  }

  if (typeof delay !== 'number' || Number.isNaN(delay) || delay < 0) {
    throw new Error('timeout must be a positive number. Actual: ' + delay)
  }

  const start = performance.now()

  return new Promise(function waitForVerifiedPredicate (resolve, reject) {
    if (checkPredicate()) {
      resolve()
    } else {
      if (performance.now() - start < timeout) {
        nativeSetTimeout(() => waitForVerifiedPredicate(resolve, reject), delay)
      } else {
        reject(new Error('predicate failed too many times:\n' + checkPredicate))
      }
    }
  })
}
