import { parse } from 'acorn'

export const COMPONENT_TYPE = 'component'
export const DEPENDENCY_TYPE = 'dependency'
export const ASSET_TYPE = 'asset'
export const componentUri = /^(.*?\/)*(.+?)\/(.+?)\.svelte$/
export const dependencyUri = /^\.(.*?\/)+([^.]+?)(\.js)?$/
export const assetUri = /^\.\/assets\/.+/

export function extractImports (code) {
  let body

  try {
    ({ body } = parse(code, { ecmaVersion: 'latest', sourceType: 'module' }))
  } catch (error) {
    if (error instanceof SyntaxError) {
      const { message, loc: { line, column } } = error
      throw new SyntaxError(`${message}\n${getSample(code, line, column)}`, { cause: error })
    }

    throw error
  }

  return body.filter(({ type }) => type === 'ImportDeclaration').map(({
    source: { value: target }, start, end, specifiers
  }) => {
    const defaultSpecifier = specifiers.find(({ type }) => type === 'ImportDefaultSpecifier')

    return {
      type: target.match(componentUri)
        ? COMPONENT_TYPE
        : target.match(assetUri)
          ? ASSET_TYPE
          : target.match(dependencyUri)
            ? DEPENDENCY_TYPE
            : 'other',

      start,
      end,
      default: defaultSpecifier && defaultSpecifier.local.name,
      variables: specifiers.map(({ local: { name } }) => name),
      target
    }
  })
}

function getSample (code, line, column) {
  const windowHeight = 5
  const numSize = String(line + windowHeight).length
  const zeroBasedLine = line - 1
  const lines = code.split('\n')
  const previousLines = lines.slice(Math.max(zeroBasedLine - windowHeight, 0), zeroBasedLine)
  const nextLines = lines.slice(zeroBasedLine + 1, zeroBasedLine + 1 + windowHeight)

  return [
    addLineNumbersBackward(previousLines, line, numSize).join('\n') + '\n',
    `▶ ${String(line).padStart(numSize, '0')} │ ${lines[line - 1]}\n`,
    `  ${' '.repeat(numSize)}   ${' '.repeat(column)}▲\n`,
    addLineNumbersForward(nextLines, line, numSize).join('\n')
  ].join('')
}

function addLineNumbersBackward (lines, referenceLine, columnSize) {
  return addLineNumbers(lines, referenceLine, columnSize, -1)
}

function addLineNumbersForward (lines, referenceLine, columnSize) {
  return addLineNumbers(lines, referenceLine, columnSize, 1)
}

function addLineNumbers (lines, referenceLine, columnSize, direction) {
  const computeLineNumber = direction > 0
    ? index => referenceLine + index + 1
    : index => referenceLine - (lines.length - (index + 1)) - 1

  return lines.reduce(
    (numberedLines, lineContent, index) => numberedLines.concat(
      `  ${String(computeLineNumber(index)).padStart(columnSize, '0')} │ ${lineContent}`
    ),
    []
  )
}
