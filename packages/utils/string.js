export function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createOffsettedSplice () {
  let offset = 0

  return function splice (string, replacement, start, end) {
    // eslint-disable-next-line eqeqeq
    if (string == undefined) {
      throw new Error('string argument is required')
    }

    // eslint-disable-next-line eqeqeq
    if (replacement == undefined) {
      throw new Error('replacement argument is required')
    }

    if (!Number.isInteger(start)) {
      throw new Error(`start argument must be an integer. Actual: ${start} (${typeof start})`)
    }

    if (start < 0) {
      throw new Error('start argument must be a positive integer')
    }

    if (!Number.isInteger(end)) {
      throw new Error(`end argument must be an integer. Actual: ${end} (${typeof end})`)
    }

    if (end < 0) {
      throw new Error('end argument must be a positive integer')
    }

    if (end < start) {
      throw new Error('end must be greater or equal to start')
    }

    const from = start + offset
    const to = end + offset
    offset += replacement.length - (end - start)
    return string.slice(0, from) + replacement + string.slice(to)
  }
}
