import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { test } from '@japa/runner'
import { extractDependencies, getComponentUriPattern } from '../../lib/dependencies_parser.js'

const require = createRequire(import.meta.url)

test.group('#extractDependencies', () => {
  test('should extract all uncommented imports', ({ expect }) => {
    const code = `
    '//'; import 'joi'
    /*
    import fuse from 'fuse.js'
    */
    import { onMount } from 'svelte'
    // import { tick } from 'svelte'

    import {
      process,
      amend
    } from '^/lib/core'

    import './ubutton/*index.js'
    import fuse from 'fuse.js'
//    import fuse from 'fuse.js'
    /*import fuse from 'fuse.js'*/
    import widget from '@heimdall/shared/widget/index.svelte'
    import link, { type, sym } from './link/index.mjs'
    import './media/index'

    export let title
    export * from './dev.js';`

    const expectations = [
      {
        type: 'other',
        start: 11,
        end: 23,
        variables: [],
        target: 'joi',
        targetBounds: { end: 23, start: 18 }
      },
      {
        type: 'other',
        start: 73,
        end: 105,
        variables: ['onMount'],
        target: 'svelte',
        targetBounds: { end: 105, start: 97 }
      },
      {
        type: 'other',
        start: 148,
        end: 207,
        variables: ['process', 'amend'],
        target: '^/lib/core',
        targetBounds: { end: 207, start: 195 }
      },
      {
        type: 'plainJs',
        sourceType: 'js',
        start: 213,
        end: 241,
        variables: [],
        target: './ubutton/*index.js',
        targetBounds: { end: 241, start: 220 }
      },
      {
        type: 'other',
        sourceType: 'js',
        start: 246,
        end: 272,
        default: 'fuse',
        variables: ['fuse'],
        target: 'fuse.js',
        targetBounds: { end: 272, start: 263 }
      },
      {
        type: 'other',
        sourceType: 'svelte',
        start: 345,
        end: 402,
        default: 'widget',
        variables: ['widget'],
        target: '@heimdall/shared/widget/index.svelte',
        targetBounds: { end: 402, start: 364 }
      },
      {
        type: 'other',
        sourceType: 'mjs',
        start: 407,
        end: 457,
        default: 'link',
        variables: ['link', 'type', 'sym'],
        target: './link/index.mjs',
        targetBounds: { end: 457, start: 439 }
      },
      {
        type: 'plainJs',
        start: 462,
        end: 484,
        variables: [],
        target: './media/index',
        targetBounds: { end: 484, start: 469 }
      }
    ]

    expect(extractDependencies(code)).toEqual(expectations)

    expect(extractDependencies(code, { includeExports: true })).toEqual([
      ...expectations,
      {
        type: 'plainJs',
        sourceType: 'js',
        start: 511,
        end: 536,
        target: './dev.js',
        targetBounds: { end: 535, start: 525 }
      }
    ])

    expect(extractDependencies(code, { sourceTypes: ['svelte'] })).toEqual(
      expectations.map(
        parsed => parsed.sourceType === 'svelte' ? { ...parsed, type: 'component' } : parsed
      )
    )
  })

  test('should format syntax errors', ({ expect }) => {
    const code = `
    '//'; import 'joi'
    /*
    import fuse from 'fuse.js'
    */
    import { onMount } from 'svelte'
    // import { tick } from 'svelte'

    import {
      process,
      amend
    } from '^/lib/core'

    import './ubutton/*index.js'
    import fuse from 'fuse.js'
//    import fuse from 'fuse.js'
    /*import fuse from 'fuse.js'*/
    import widget from '@heimdall/shared/widget/index.svelte'

    export let title`

    const useCases = {
      import_error: code.replace("from '^/lib/core'", "'^/lib/core'"),
      declaration_error: code.replace("'//';", "const '//';"),
      export_error: code.replace('export let title', 'const\n\n      export let title')
    }

    for (const [filename, erroneousCode] of Object.entries(useCases)) {
      const expectationsFile = require.resolve(`../fixtures/${filename}.txt`)
      const expectedError = String(readFileSync(expectationsFile)).trim()
      expect(() => extractDependencies(erroneousCode)).toThrow(expectedError)
    }
  })
})

test.group('#getComponentUriPattern', () => {
  test('should match component uri', ({ expect }) => {
    expect(
      Array.from(
        '@heimdall/shared/widget/index.svelte'.match(getComponentUriPattern('svelte'))
      ).slice(-2)
    ).toEqual(['widget', 'index'])
  })
})
