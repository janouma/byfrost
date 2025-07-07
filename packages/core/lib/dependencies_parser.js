import { extname } from 'path'
import { parse } from 'acorn'
import * as walk from 'acorn-walk'
import logger from '@byfrost/utils/logger.js'

const log = logger.getLogger('core/dependencies_parser')

export const COMPONENT_TYPE = 'component'
export const PLAIN_JS_TYPE = 'plainJs'
export const ASSET_TYPE = 'asset'
export const plainJsUri = /^\.(.*?\/)+(.+?)\.js$/
export const assetUri = /^\.\/assets\/.+/

export function extractDependencies (code, { sourceTypes = [], includeExports = false } = {}) {
  const selectedNodes = []
  const nodeTypes = ['ImportDeclaration', 'ImportExpression']

  if (includeExports) {
    nodeTypes.push(
      'ExportNamedDeclaration',
      'ExportDefaultDeclaration',
      'ExportAllDeclaration',
      'ExportSpecifier'
    )
  }

  const processors = nodeTypes.reduce(
    (partialProcessors, nodeType) => Object.assign(
      partialProcessors,
      { [nodeType]: createAstNodeProcessor({ selectedNodes, code }, nodeType) }
    ),
    {}
  )

  let ast

  try {
    ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
  } catch (error) {
    if (error instanceof SyntaxError) {
      const { message, loc: { line, column } } = error
      throw new SyntaxError(`${message}\n${getSample(code, line, column)}`, { cause: error })
    }

    throw error
  }

  walk.recursive(ast, undefined, processors)

  const componentUriPatterns = sourceTypes.map(getComponentUriPattern)

  return selectedNodes.map(({
    source: { value: target, start: targetStart, end: targetEnd }, start, end, specifiers
  }) => {
    const defaultSpecifier = specifiers?.find(({ type }) => type === 'ImportDefaultSpecifier')

    return {
      type: componentUriPatterns.some(pattern => target.match(pattern))
        ? COMPONENT_TYPE
        : target.match(assetUri)
          ? ASSET_TYPE
          : target.match(plainJsUri)
            ? PLAIN_JS_TYPE
            : 'other',

      sourceType: extname(target).replace(/^\./, '') || undefined,
      start,
      end,
      default: defaultSpecifier && defaultSpecifier.local.name,
      variables: specifiers?.map(({ local: { name } }) => name),
      target,
      targetBounds: { start: targetStart, end: targetEnd }
    }
  })
}

export function getComponentUriPattern (sourceType) {
  return new RegExp(`^(.*?/)*(.+?)/(.+?)\\.${sourceType}$`)
}

function createAstNodeProcessor ({ selectedNodes, code }, nodeType) {
  return function processAstNode (node, state, keepWalking) {
    const { source, start, end } = node

    if (source?.value) {
      if (!source.value.match(/^https?:/)) { selectedNodes.push(node) }
    } else if (source) {
      const margin = 200
      const [startWithMargin, endWithMargin] = [Math.max(0, start - margin), Math.min(end + margin, code.length)]
      const relativeStart = start - startWithMargin

      const sample = code.slice(startWithMargin, endWithMargin)
        .split('')
        .toSpliced(relativeStart, 0, '▶')
        .join('')

      log.warn('The following dependency (marked with ▶) will be ignored:\n\n' + sample)
    }

    walk.base[nodeType](node, state, keepWalking)
  }
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
