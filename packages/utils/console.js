const browserToNodejsColorMap = {
  green: 32,
  red: 31,
  yellow: 33,
  blue: 34,
  magenta: 35
}

export function green (...texts) {
  return colored('green', ...texts)
}

export function red (...texts) {
  return colored('red', ...texts)
}

export function yellow (...texts) {
  return colored('yellow', ...texts)
}

export function blue (...texts) {
  return colored('blue', ...texts)
}

export function magenta (...texts) {
  return colored('magenta', ...texts)
}

function colored (color, text, ...details) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    return nodeColored(browserToNodejsColorMap[color], text, ...details)
  }

  if (typeof window !== 'undefined') {
    return browserColored(color, text, ...details)
  }

  console.warn('unable to detect environment (neither nodejs nor browser)')
  return text
}

function nodeColored (color, text, ...details) {
  return details.length === 0
    ? `\x1b[1m\x1b[${color}m${text}\x1b[89m\x1b[22m\x1b[0m`
    : [`\x1b[1m\x1b[${color}m`, text, ...details, '\x1b[89m\x1b[22m\x1b[0m']
}

function browserColored (color, ...texts) {
  return texts.flatMap(text => ['%c' + text, 'color: ' + color])
}

// compatobility with chalk
for (const color of [green, red, yellow, blue, magenta]) {
  color.bold = color.dim = color
}
