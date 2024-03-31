import { promisify } from 'util'

// in case setTimeout is mocked
const nativeSetTimeout = setTimeout

export const nextTick = globalThis.setImmediate ? promisify(setImmediate) : () => new Promise(resolve => nativeSetTimeout(resolve, 0))
