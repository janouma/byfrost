import { test } from '@japa/runner'
import * as td from 'testdouble'
import { debounce, curry } from '../../function.js'

test.group('#debounce', group => {
  const TIMEOUT_ID = 'timeout_id'
  const nativeSetTimeout = setTimeout
  const nativeClearTimeout = clearTimeout

  group.setup(() => Object.assign(globalThis, {
    setTimeout: td.function('setTimeout'),
    clearTimeout: td.function('clearTimeout')
  }))

  group.each.setup(() => {
    td.when(setTimeout(td.matchers.isA(Function), td.matchers.isA(Number)))
      .thenDo(() => TIMEOUT_ID)
  })

  group.each.teardown(() => td.reset())

  group.teardown(() => Object.assign(globalThis, {
    setTimeout: nativeSetTimeout,
    clearTimeout: nativeClearTimeout
  }))

  test('should validate arguments', ({ expect }) => {
    expect(() => debounce()).toThrow('fn argument must be a function. Actual: undefined')

    expect(() => debounce('not a function'))
      .toThrow('fn argument must be a function. Actual: not a function')

    expect(() => debounce(() => {})).toThrow('delay argument must be a number. Actual: undefined')

    expect(() => debounce(() => {}, 'not a number'))
      .toThrow('delay argument must be a number. Actual: not a number')
  })

  test('should delay function call until no subsequent call occurs before delay', () => {
    const fn = td.function('fn')
    const captor = td.matchers.captor()
    const delay = 500
    const args = ['arg_1', 'arg_2']
    const debouncedFn = debounce(fn, delay)

    debouncedFn('arg_3')

    td.verify(clearTimeout(undefined))
    td.verify(setTimeout(td.matchers.isA(Function), delay), { times: 1 })
    td.verify(fn(), { times: 0, ignoreExtraArgs: true })

    debouncedFn(...args)

    td.verify(clearTimeout(TIMEOUT_ID))
    td.verify(setTimeout(td.matchers.isA(Function), delay), { times: 2 })
    td.verify(fn(), { times: 0, ignoreExtraArgs: true })

    td.verify(setTimeout(captor.capture(), delay))
    const [firstCall, sndCall] = captor.values

    firstCall()
    td.verify(fn('arg_3'))

    sndCall()
    td.verify(fn(...args))
  })
})

test.group('#curry', () => {
  test('should create function with partially applied parameters', () => {
    const g = td.function('g')

    function f (a, b) {
      g(a, b)
    }

    const curried = curry(f)
    const partial = curried('a')

    td.verify(g(), { times: 0, ignoreExtraArgs: true })

    partial('b')
    td.verify(g('a', 'b'))
  })

  test('should create function with parameters applied', () => {
    const g = td.function('g')

    function f (a, b) {
      g(a, b)
    }

    const curried = curry(f)
    curried('a', 'b')

    td.verify(g('a', 'b'))
  })
})
