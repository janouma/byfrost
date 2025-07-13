import { test } from '@japa/runner'
import * as td from 'testdouble'

const systemSignals = ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'unhandledRejection', 'SIGTERM']
const cleaners = []
let register

test.group('shutdown_cleaner', group => {
  const nativeProcess = process

  group.setup(() => {
    globalThis.process = Object.create(process)

    Object.assign(process, {
      on: td.function('on'),
      exit: td.function('exit')
    })

    cleaners.push(
      td.function('stopServer'),
      td.function('closeChromium')
    )
  })

  group.each.setup(async () =>
    ({ register } = await import('../../shutdown_cleaner.js?version=' + performance.now()))
  )

  group.each.teardown(() => td.reset())

  group.teardown(() => { globalThis.process = nativeProcess })

  test('should not listen to system signals when no cleaner is registered', () => {
    td.verify(process.on(), { times: 0, ignoreExtraArgs: true })
  })

  test('should register clean for all system signals', () => {
    register(...cleaners)
    td.verify(process.on(), { times: systemSignals.length, ignoreExtraArgs: true })

    for (const systemSignal of systemSignals) {
      td.verify(process.on(systemSignal, td.matchers.isA(Function)))
    }
  })

  test('should call all cleaners when any system signal is emitted', async () => {
    register(...cleaners)
    const captor = td.matchers.captor()
    td.verify(process.on('SIGTERM', captor.capture()))

    const [cleanFn] = captor.values

    const allCleanersCompletion = cleanFn()
    cleanFn()

    await allCleanersCompletion

    for (const cleaner of cleaners) { td.verify(cleaner(), { times: 1 }) }
    td.verify(process.exit(0), { times: 1 })
  })

  test('should wait for async cleaners', async () => {
    register(...cleaners)
    const captor = td.matchers.captor()
    td.verify(process.on('SIGTERM', captor.capture()))

    let completeCleaner
    const cleanerCompletion = new Promise(resolve => { completeCleaner = resolve })
    td.when(cleaners[0]()).thenReturn(cleanerCompletion)

    const [cleanFn] = captor.values

    cleanFn()

    td.verify(cleaners[1](), { times: 0 })

    completeCleaner()
    await cleanerCompletion

    td.verify(cleaners[1](), { times: 1 })
  })

  test('cleaners call sequence should be the same as batch register sequence', async ({ expect }) => {
    register(...cleaners)
    const captor = td.matchers.captor()
    td.verify(process.on('SIGTERM', captor.capture()))

    const callSequence = []
    const [stopServer, closeChromium] = cleaners

    td.when(stopServer()).thenDo(() => callSequence.push('stopServer'))
    td.when(closeChromium()).thenDo(() => callSequence.push('closeChromium'))

    const [cleanFn] = captor.values

    await cleanFn()
    expect(callSequence).toEqual(['stopServer', 'closeChromium'])
  })

  test('cleaners call sequence should be reversed from single register sequence', async ({ expect }) => {
    const callSequence = []
    const [stopServer, closeChromium] = cleaners

    register(stopServer)
    register(closeChromium)

    const captor = td.matchers.captor()
    td.verify(process.on('SIGTERM', captor.capture()))

    td.when(stopServer()).thenDo(() => callSequence.push('stopServer'))
    td.when(closeChromium()).thenDo(() => callSequence.push('closeChromium'))

    const [cleanFn] = captor.values

    await cleanFn()
    expect(callSequence).toEqual(['closeChromium', 'stopServer'])
  })

  test('should not stop cleaning when a cleaner fails', async () => {
    register(...cleaners)

    const captor = td.matchers.captor()
    td.verify(process.on('SIGTERM', captor.capture()))
    td.when(cleaners[0]()).thenReject(new Error('[fake test error] failure to stop server'))

    const [cleanFn] = captor.values

    await cleanFn()
    td.verify(cleaners[1](), { times: 1 })
  })
})
