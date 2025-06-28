const browserToNodejsColorMap = {
  green: 32,
  red: 31,
  yellow: 33,
  blue: 34,
  magenta: 35
}

export function green (text) {
  return colored('green', text)
}

export function red (text) {
  return colored('red', text)
}

export function yellow (text) {
  return colored('yellow', text)
}

export function blue (text) {
  return colored('blue', text)
}

export function magenta (text) {
  return colored('magenta', text)
}

function colored (color, text) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    return nodeColored(browserToNodejsColorMap[color], text)
  }

  if (typeof window !== 'undefined') {
    return browserColored(color, text)
  }

  console.warn('unable to detect environment (neither nodejs nor browser)')
  return text
}

function nodeColored (color, text) {
  return `\x1b[1m\x1b[${color}m${text}\x1b[89m\x1b[22m\x1b[0m`
}

function browserColored (color, text) {
  return ['%c' + text, 'color: ' + color]
}

// compatobility with chalk
for (const color of [green, red, yellow, blue, magenta]) {
  color.bold = color.dim = color
}
