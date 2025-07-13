# @byfrost/utils

A utility package providing essential tools for command execution, logging, string manipulation, object operations, email sending, and more.

## Installation

```bash
npm install @byfrost/utils
```

## Modules

- [Args](#args)
- [Console](#console)
- [Function](#function)
- [Logger](#logger)
- [Mail](#mail)
- [Object](#object)
- [Run](#run)
- [Shutdown Cleaner](#shutdown-cleaner)
- [String](#string)
- [Test Utilities](#test-utilities)

### Args

Utilities for parsing command line arguments.

```js
import { argsArrayToArgsObject, not } from '@byfrost/utils/args.js'

// Convert process.argv to object
const parsedArgs = argsArrayToArgsObject()
// Example: --port=3000 debug no-cache sourceMap=yes
// becomes: { '--port': '3000', debug: true, cache: false, sourceMap: 'yes' }

// Create negated argument names
const negatedArg = not('debug') // returns 'no-debug'
```

### Console

Cross-platform console coloring utilities compatible with both Node.js and browsers.

```js
import { green, red, yellow, blue, magenta } from '@byfrost/utils/console.js'

// Nodejs
console.log(green('Success message')) // => console.log('\x1B[1m\x1B[32mSuccess message\x1B[89m\x1B[22m\x1B[0m')
console.error(...red('Error message', error)) // => console.error(...['\x1B[1m\x1B[31m', 'Error message', error, '\x1B[89m\x1B[22m\x1B[0m'])
console.warn(yellow('Warning message')) // => console.warn('\x1B[1m\x1B[33mWarning message\x1B[89m\x1B[22m\x1B[0m')

// Browser
console.info(...blue('Info message')) // => console.info(...['%cInfo message', 'color: blue'])
console.debug(...magenta('Debug message', 'with details')) // => console.info(...['%cDebug message', 'color: magenta', '%cwith details', 'color: magenta'])
```

### Logger

Flexible logging system with level-based filtering and named loggers.

```js
import logger from '@byfrost/utils/logger.js'

// Set global log level
logger.logLevel = 'debug' // 'silent', 'error', 'warn', 'info', 'log', 'debug', 'trace'

// Create named logger
const log = logger.getLogger('my-module')

// Log at different levels
log.error('Error message')
log.warn('Warning message')
log.info('Info message')
log.debug('Debug message')
log.trace('Trace message')

// Add async log level loading function
logger.loadLogLevel = async () => {
  // Load from api
  const logLevel = await (await fetch('/api/persisted/log-level')).text()
  return logLevel
}

// Add async log level saving function
logger.saveLogLevel = async (level) => {
  // Save to storage
  localStorage.logLevel = level
}
```

### Mail

Email sending utilities using Gmail API with MJML template support.

```js
import { createSender } from '@byfrost/utils/mail.js'

// Create email sender
const sendEmail = createSender({
  apiKey: 'your-gmail-api-key',
  from: 'sender@example.com',
  templatesDir: './email-templates',
  subjectsFile: './email-subjects.json'
})

// Send email
await sendEmail({
  templateId: 'welcome',
  to: 'recipient@example.com',
  params: {
    name: 'John Doe',
    activationLink: 'https://example.com/activate'
  }
})
```

**Template Structure:**
- `./email-templates/welcome.txt` - Plain text template
- `./email-templates/welcome.mjml` - MJML template for HTML
- `./email-subjects.json` - Subject line templates

**Example of subjects file:**
```json
{
  "welcome": "Welcome ${name}!",
  "reset-password": "Reset your password"
}
```

**Example of template files:**

**• MJML**

```HTML
<mjml>
  <mj-body width="100%" background-color="#ebebeb">
    <mj-section>
      <mj-column>
        <mj-text font-size="20px">The following error occured on ${app}:</mj-text>
        <mj-text>
          <mj-raw>
            <code style="white-space: pre-wrap;">${log}</code>
          </mj-raw>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

**• Text**

```
The following error occured on ${app}:

${log}
```

> Notice params placeholders `${app}` and `${log}` in both template contents

### Object

Object manipulation utilities with deep merging capabilities.

```js
import { merge, shallowMerged } from '@byfrost/utils/object.js'

// Deep merge objects (clone all objects/arrays)
const merged = merge(
  { a: 1, b: { c: 2 } },
  { b: { d: 3 }, e: 4 }
)
// Result: { a: 1, b: { c: 2, d: 3 }, e: 4 }

// Arrays are concatenated during merge
const withArrays = merge(
  { items: [1, 2] },
  { items: [3, 4] }
)
// Result: { items: [1, 2, 3, 4] }

// Shallow merge (nested objects/arrays are not cloned)
const shallowMerged = shallowMerge({ a: 1 }, { b: 2 })
// Result: { a: 1, b: 2 }
```

### Run

Utility for running commands with environment file support.

#### Usage

```bash
npx @byfrost/utils run command=<command> [envFile=<path>] [additional-args]
```

#### Examples

```bash
# Run a command with default .env file
npx @byfrost/utils run command="node server.js"

# Run with custom env file
npx @byfrost/utils run command="npm start" envFile=".env.production"

# Pass additional arguments
npx @byfrost/utils run command="node app.js" port=3000 debug
```

Set higher or lower log level with `LOG_LEVEL` environment variable.
All log levels accepted by the logger module can be used.

### Shutdown Cleaner

Register cleanup functions to run before process shutdown.

```js
import { rm } from 'fs'
import { register } from '@byfrost/utils/shutdown_cleaner.js'
import db from './db.js'

// Register cleanup functions
register(
  async () => {
    console.log('Closing database connection...')
    await db.close()
  },
  async () => {
    console.log('Cleaning up temp files...')
    await rm('./temp', { recursive: true })
  }
)
```

Cleanup will run on the following process events:

- `exit`
- `SIGINT`
- `SIGUSR1`
- `SIGUSR2`
- `uncaughtException`
- `unhandledRejection`
- `SIGTERM`

### String

String manipulation utilities with template rendering.

```js
import { escapeRegExp, render, compile, createOffsettedSplice } from '@byfrost/utils/string.js'

// Escape regex special characters
const escaped = escapeRegExp('Hello. World?')
// Result: 'Hello\\. World\\?'

// Template rendering string templates
const template = 'Hello ${name}, you have ${count} messages'

const rendered = render(template, {
  name: 'John',
  count: 5
})
// Result: 'Hello John, you have 5 messages'

// Custom variable marker
const customTemplate = 'Hello @{name}'
const customRendered = render(customTemplate, {
  name: 'Jane',
  $: '@' // Custom variable marker
})
// Result: 'Hello Jane'

// Use js expressions within templates
const importsMap = {
  imports: {
    vue: '/node_modules/vue/dist/vue.runtime.esm-browser.prod.js',
    vuex: '/node_modules/vuex/dist/vuex.esm-browser.prod.js'
  }
}

render('<script type="importmap">${JSON.stringify(importsMap)}</script>', { importsMap })
/* Result:
'<script type="importmap">{"imports":{"vue":"/node_modules/vue/dist/vue.runtime.esm-browser.prod.js","vuex":"/node_modules/vuex/dist/vuex.esm-browser.prod.js"}}</script>'
*/

render(
  `<script type="importmap">
    @{JSON.stringify(\{
      imports: \{
        ...importsMap.imports,
        "@hapi/nes/lib/client": "/test/helpers/nes_client.js"
      \}
    \})}
  </script>`,
  { importsMap }
)
/* Result:
`<script type="importmap">
{"imports":{"vue":"/node_modules/vue/dist/vue.runtime.esm-browser.prod.js","vuex":"/node_modules/vuex/dist/vuex.esm-browser.prod.js","@hapi/nes/lib/client":"/test/helpers/nes_client.js"}}
</script>`
*/


// Compile template for reuse
const compiled = compile('Hello ${name}')
compiled({ name: 'Alice' }) // => 'Hello Alice'
compiled({ name: 'Bob' }) // => 'Hello Bob'

// Offsetted splice for multiple replacements
const splice = createOffsettedSplice()
let text = 'Hello world'
text = splice(text, 'Hi', 0, 5)     // 'Hi world'
text = splice(text, 'there', 3, 8)  // 'Hi there'
```

### Test Utilities

Testing helpers and setup utilities.

```js
// Async helpers
import { nextTick, waitForPredicate } from '@byfrost/utils/tests/helpers/async.js'

await nextTick()

await waitForPredicate({
  checkPredicate: () => document.querySelector('#loaded'),
  delay: 100,      // Check every 100ms
  timeout: 3000    // Give up after 3 seconds
})

// Mock localStorage for testing
import { mockLocalStorage } from '@byfrost/utils/tests/setup/globals.js'

if (globalThis.localStorage) {
  jest.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => mockLocalStorage)
} else {
  globalThis.localStorage = mockLocalStorage
}
```

## Requirements

- Node.js 20.x
- npm 10.x

## License

ISC
