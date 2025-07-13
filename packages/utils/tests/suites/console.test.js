import { test } from '@japa/runner'
import { green, red, yellow, blue, magenta } from '../../console.js'

const nativeProcess = process

test.group('node', () => {
  const outputByColor = [
    [
      green,
      '\x1b[1m\x1b[32mtext\x1b[89m\x1b[22m\x1b[0m',
      ['\x1b[1m\x1b[32m', 'text one', 'text two', '\x1b[89m\x1b[22m\x1b[0m']
    ],

    [
      red,
      '\x1b[1m\x1b[31mtext\x1b[89m\x1b[22m\x1b[0m',
      ['\x1b[1m\x1b[31m', 'text one', 'text two', '\x1b[89m\x1b[22m\x1b[0m']
    ],

    [
      yellow,
      '\x1b[1m\x1b[33mtext\x1b[89m\x1b[22m\x1b[0m',
      ['\x1b[1m\x1b[33m', 'text one', 'text two', '\x1b[89m\x1b[22m\x1b[0m']
    ],

    [
      blue,
      '\x1b[1m\x1b[34mtext\x1b[89m\x1b[22m\x1b[0m',
      ['\x1b[1m\x1b[34m', 'text one', 'text two', '\x1b[89m\x1b[22m\x1b[0m']
    ],

    [
      magenta,
      '\x1b[1m\x1b[35mtext\x1b[89m\x1b[22m\x1b[0m',
      ['\x1b[1m\x1b[35m', 'text one', 'text two', '\x1b[89m\x1b[22m\x1b[0m']
    ]
  ]

  for (const [color, singleOutput, multipleOutput] of outputByColor) {
    test(color.name + ' text', ({ expect }) => expect(color('text')).toBe(singleOutput))
    test(color.name + ' texts', ({ expect }) => expect(color('text one', 'text two')).toEqual(multipleOutput))
  }
})

test.group('browser', group => {
  group.each.setup(() => {
    globalThis.window = {}
    delete globalThis.process
  })

  group.each.teardown(() => {
    delete globalThis.window
    globalThis.process = nativeProcess
  })

  const outputByColor = [
    [
      green,
      ['%ctext one', 'color: green', '%ctext two', 'color: green']
    ],

    [
      red,
      ['%ctext one', 'color: red', '%ctext two', 'color: red']
    ],

    [
      yellow,
      ['%ctext one', 'color: yellow', '%ctext two', 'color: yellow']
    ],

    [
      blue,
      ['%ctext one', 'color: blue', '%ctext two', 'color: blue']
    ],

    [
      magenta,
      ['%ctext one', 'color: magenta', '%ctext two', 'color: magenta']
    ]
  ]

  for (const [color, multipleOutput] of outputByColor) {
    test(color.name + ' texts', ({ expect }) => expect(color('text one', 'text two')).toEqual(multipleOutput))
  }
})
