import { test } from '@japa/runner'
import { escapeRegExp, createOffsettedSplice, render, compile } from '../../string.js'

test.group('#escapeRegExp', () => {
  test('should escape RegExp special chars', ({ expect }) => {
    expect(escapeRegExp('^s\\s(q)(j.*qs{3})?[a-z]+'))
      .toBe('\\^s\\\\s\\(q\\)\\(j\\.\\*qs\\{3\\}\\)\\?\\[a-z\\]\\+')
  })
})

test.group('#createOffsettedSplice', () => {
  test('should create a function that validates parameters', ({ expect }) => {
    const splice = createOffsettedSplice()

    expect(() => splice()).toThrow('string argument is required')
    expect(() => splice('string')).toThrow('replacement argument is required')

    expect(() => splice('string', 'replacement'))
      .toThrow('start argument must be an integer. Actual: undefined (undefined)')

    expect(() => splice('string', 'replacement', '5'))
      .toThrow('start argument must be an integer. Actual: 5 (string)')

    expect(() => splice('string', 'replacement', -1)).toThrow('start argument must be a positive integer')

    expect(() => splice('string', 'replacement', 3))
      .toThrow('end argument must be an integer. Actual: undefined (undefined)')

    expect(() => splice('string', 'replacement', 3, '5'))
      .toThrow('end argument must be an integer. Actual: 5 (string)')

    expect(() => splice('string', 'replacement', 3, -1)).toThrow('end argument must be a positive integer')
    expect(() => splice('string', 'replacement', 3, 1)).toThrow('end must be greater or equal to start')
  })

  test('should create a function that replaces substrings by position in a string', ({ expect }) => {
    const splice = createOffsettedSplice()

    let string = splice('abcdefghijklmnopqrstuvwxyz', '010203', 3, 6)
    string = splice(string, '050607', 9, 12)
    string = splice(string, '080910', 15, 18)

    expect(string).toBe('abc010203ghi050607mno080910stuvwxyz')
  })
})

test.group('#render', () => {
  test('should render es6 template', ({ expect }) => {
    const template = `
      const \${a} = 'b';
      const b = '\${c.toUpperCase() + '_1'}';
    `

    expect(render(template, { a: 'a', c: 'c' })).toBe(`
      const a = 'b';
      const b = 'C_1';
    `)
  })

  test('should allow custom variable marker', ({ expect }) => {
    const template = `
      const #?{a} = 'b';
      const b = '#?{c.toUpperCase() + '_1'}';
    `

    expect(render(template, { $: '#?', a: 'a', c: 'c' })).toBe(`
      const a = 'b';
      const b = 'C_1';
    `)
  })
})

test.group('#compile', () => {
  test('should return an es6 template renderer function', ({ expect }) => {
    const template = `
      const #?{a} = 'b';
      const b = '#?{c.toUpperCase() + '_1'}';
    `

    const renderer = compile(template, '#?')

    expect(renderer({ a: 'a', c: 'c' })).toBe(`
      const a = 'b';
      const b = 'C_1';
    `)
  })
})
