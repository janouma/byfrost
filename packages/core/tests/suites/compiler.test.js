import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { test } from '@japa/runner'
import compile from '../../lib/compiler.js'

const require = createRequire(import.meta.url)

test('should compile component', async ({ expect }) => {
  const filename = require.resolve('../fixtures/the_best_component/index.svelte')

  const expectedCompiled = String(readFileSync(
    require.resolve('../fixtures/the_best_component.js.out')
  )).trim()

  const source = dirname(filename)
  const destination = resolve(source, '../../output')

  await compile({ source, destination })

  const compiled = String(readFileSync(`${destination}/the_best_component/index.js`))
  expect(compiled).toBe(expectedCompiled)
})
