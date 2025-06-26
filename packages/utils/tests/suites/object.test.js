import { test } from '@japa/runner'
import { merge, shallowMerge } from '../../object.js'

test.group('#shallowMerge', () => {
  test('should merge several sources shallowly into a new object', ({ expect }) => {
    const sources = [
      { a: 'a', b: 'b' },

      {
        c: 'c',
        de: { d: 'd', e: 'e' }
      }
    ]

    const merged = shallowMerge(...sources)

    expect(merged).toStrictEqual({
      a: 'a',
      b: 'b',
      c: 'c',
      de: { d: 'd', e: 'e' }
    })

    expect(merged).not.toBe(sources[0])
    expect(merged.de).toBe(sources[1].de)
  })
})

test.group('#merge', () => {
  const sources = [
    {
      a: 'a',
      b: 'b',

      de: {
        'd’': 'd’',
        e: { e: 'e', 'e’': 'e’' },
        jk: ['j', 'k'],
        lm: ['l', 'm', { q: 'q' }]
      },

      fg: { f: 'g', g: 'g' },
      hi: { h: 'h', i: 'i' },
      no: ['n', 'o']
    },

    {
      c: 'c',

      de: {
        d: 'd',
        e: 'e',
        jk: { j: 'j', k: 'k' },
        lm: ['l', 'm', 'l’', 'm’']
      },

      fg: 'fg',
      hi: ['h', 'i'],
      no: ['n’', 'o’', { r: 'r' }]
    }
  ]

  const expected = {
    a: 'a',
    b: 'b',

    de: {
      'd’': 'd’',
      e: 'e',
      jk: { j: 'j', k: 'k' },
      lm: ['l', 'm', { q: 'q' }, 'l', 'm', 'l’', 'm’'],
      d: 'd'
    },

    fg: 'fg',
    hi: ['h', 'i'],
    no: ['n', 'o', 'n’', 'o’', { r: 'r' }],
    c: 'c'
  }

  test('should merge several sources deeply', ({ expect }) => {
    const merged = merge(...sources)

    expect(merged).toStrictEqual(expected)
    expect(merged).not.toBe(sources[0])
    expect(merged.de).not.toBe(sources[0].de)
    expect(merged.de).not.toBe(sources[1].de)
    expect(merged.hi).not.toBe(sources[1].hi)
    expect(merged.no).not.toBe(sources[0].no)
    expect(merged.no).not.toBe(sources[1].no)
    expect(merged.de.jk).not.toBe(sources[1].de.jk)
    expect(merged.de.lm).not.toBe(sources[0].de.lm)
    expect(merged.de.lm).not.toBe(sources[1].de.lm)
    expect(merged.de.lm[2]).not.toBe(sources[0].de.lm[2])
    expect(merged.no[4]).not.toBe(sources[1].no[2])
  })

  test('should polyfill structuredClone() when missing', ({ expect }) => {
    const nativeStructuredClone = global.structuredClone

    try {
      delete global.structuredClone

      const merged = merge(...sources)

      expect(merged).toStrictEqual(expected)
      expect(merged).not.toBe(sources[0])
      expect(merged.de).not.toBe(sources[0].de)
      expect(merged.de).not.toBe(sources[1].de)
      expect(merged.hi).not.toBe(sources[1].hi)
      expect(merged.no).not.toBe(sources[0].no)
      expect(merged.no).not.toBe(sources[1].no)
      expect(merged.de.jk).not.toBe(sources[1].de.jk)
      expect(merged.de.lm).not.toBe(sources[0].de.lm)
      expect(merged.de.lm).not.toBe(sources[1].de.lm)
      expect(merged.de.lm[2]).not.toBe(sources[0].de.lm[2])
      expect(merged.no[4]).not.toBe(sources[1].no[2])
    } finally {
      global.structuredClone = nativeStructuredClone
    }
  })
})
