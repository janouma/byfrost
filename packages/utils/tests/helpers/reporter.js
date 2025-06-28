import { basename, dirname } from 'path'
import { existsSync, unlinkSync, writeFileSync, statSync } from 'fs'
import { green, red, magenta, blue } from '../../console.js'

const BROWSER_NAME_MAX_LENGTH = 8

function getStatusConfig (status) {
  switch (status) {
    case 'passed': return { icon: '✔', log (message) { console.info(green(message)) }, status }
    case 'skipped': return { icon: '⤵', log (message) { console.info(message) }, status }
    case 'interrupted': return { icon: '⚡', log (message) { console.info(magenta(message)) }, status }
    default: return { icon: '✘', log (message) { console.error(red(message)) }, status: 'failed' }
  }
}

export default class Reporter {
  #suiteLength = 0
  #testsCount = 0
  #failedCount = 0
  #passedCount = 0
  #skippedCount = 0
  #outputFile
  #report

  constructor ({ outputFile }) {
    if (!outputFile) {
      throw new Error('outputFile option is missing')
    }

    if (existsSync(this.#outputFile) && statSync(outputFile).isDirectory()) {
      throw new Error(outputFile + ' is a directory')
    }

    this.#outputFile = outputFile
  }

  onBegin (_ /* config */, suite) {
    this.#suiteLength = suite.allTests().length
    console.info(
      blue(`Running suite${suite.title ? ' ' + suite.title : ''} (${this.#suiteLength} tests)\n`)
    )
  }

  onTestEnd (test, result) {
    this.#testsCount++

    const progress = Math.floor((this.#testsCount / this.#suiteLength) * 100)
    const progressString = (String(progress) + '%').padEnd(4, ' ')
    const { icon: statusIcon, log, status: unifiedStatus } = getStatusConfig(result.status)
    const [, project, file, ...titleSegments] = test.titlePath()

    switch (unifiedStatus) {
      case 'passed': {
        this.#passedCount++
        break
      }

      case 'skipped': {
        this.#skippedCount++
        break
      }

      case 'failed': {
        this.#failedCount++
        this.#report ??= {}
        this.#report[project] ??= {}
        this.#report[project][file] ??= []

        this.#report[project][file].push({
          title: titleSegments.join(' '),
          error: (result.error?.message || red(result.error?.value))
        })

        break
      }
    }

    const name = basename(dirname(file))

    const testId =
      `${progressString} | ${project.padEnd(BROWSER_NAME_MAX_LENGTH, ' ')} | ${name} ▷ ${titleSegments.join(' ▷ ')}`

    const detailsAnnotation = test.annotations?.find(annotation => annotation.type === 'details')
    const details = detailsAnnotation ? ' ▷ ' + detailsAnnotation.description : ''

    log(`${statusIcon} ${testId}${details}`)

    if (result.errors.length > 0) {
      console.error(
        '    ↳ ' + result.errors
          .map(
            error =>
              `${error.message || red(error.value)}\n\n${error.snippet ? red(error.snippet) : ''}`
                .trim()
          )
          .join('\n    ↳ ')
      )
    }
  }

  onEnd (result) {
    const { log } = getStatusConfig(result.status)
    console.info(blue('\nSuite results:'))
    console.info(green('✔ ' + this.#passedCount))
    log('✘ ' + this.#failedCount)
    console.info('⤵ ' + this.#skippedCount)

    if (this.#suiteLength === 0) {
      return
    }

    if (result.status === 'passed') {
      if (existsSync(this.#outputFile)) {
        unlinkSync(this.#outputFile)
      }
    } else {
      writeFileSync(this.#outputFile, JSON.stringify(this.#report, undefined, 2))
    }
  }

  onStdOut (chunk) {
    process.stdout.write(chunk)
  }

  onStdErr (chunk) {
    process.stderr.write(chunk)
  }
}
