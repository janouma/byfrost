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

export function render (str, { $: variableMarker = '$', ...locals } = {}) {
  return compile(str, variableMarker).call(this, locals)
}

export function compile (str, $) {
  const es6TemplateRegex = new RegExp(
    `(\\\\)?${escapeRegExp($)}\\{(([^{}]*((?<=\\\\)(\\{|\\}))[^{}]*)+|([^{}\\\\]+))\\}`,
    'g'
  )

  if (typeof str !== 'string') {
    throw new Error('The argument must be a string type')
  }

  return function (locals) {
    return str.replace(es6TemplateRegex, function (matched) {
      return parse(matched).call(locals || {})
    })
  }
}

const { hasOwnProperty } = Object.prototype

function parse (variable) {
  if (variable[0] === '\\') {
    return function () {
      return variable.slice(1)
    }
  }

  const { expression } = variable.match(/\{\s*(?<expression>.*)\s*\}/s).groups
  const escapeFreeExpression = expression.replace(/\\(\{|\})/g, '$1')

  return function () {
    let declare = ''

    for (const key in this) {
      if (hasOwnProperty.call(this, key)) {
        declare += `const ${key} = locals.${key};`
      }
    }

    /* eslint-disable-next-line no-new-func */
    return new Function('locals', declare + 'return ' + escapeFreeExpression)(this)
  }
}
