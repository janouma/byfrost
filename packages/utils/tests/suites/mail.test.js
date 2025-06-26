import { test } from '@japa/runner'
import * as td from 'testdouble'

const templatesDir = 'assets/mail_templates'
const subjectsFile = 'assets/subjects.json'
const apiKey = 'tiuyuydg8767=='
const from = 'heimdallinsight@gmail.com'

/* eslint-disable no-template-curly-in-string */
const fileMockContents = {
  [templatesDir + '/error.txt']: 'an error occurred on ${app}: ${logLink}',
  [templatesDir + '/error.mjml']: '<h1>an error occured on ${app}: <a href="${logLink}">${logLink}</a></h1>',
  [subjectsFile]: '{"error": "an error occured on ${app}"}'
}
/* eslint-endable no-template-curly-in-string */

let readFileSync
let existsSync
let createGmailSender
let htmlFrom
let createSender

test.group('#createSender', group => {
  group.each.setup(async () => {
    ({ readFileSync, existsSync } = await td.replaceEsm('fs'));
    ({ default: createGmailSender } = await td.replaceEsm('gmail-send'));
    ({ default: htmlFrom } = await td.replaceEsm('mjml'));
    ({ createSender } = await import('../../mail.js'))

    td.when(readFileSync(td.matchers.isA(String))).thenDo(path => fileMockContents[path])
    td.when(existsSync(td.matchers.isA(String))).thenReturn(true)
    td.when(htmlFrom(td.matchers.isA(String))).thenReturn({})
  })

  group.each.teardown(() => td.reset())

  for (const arg of ['apiKey', 'from', 'templatesDir', 'subjectsFile']) {
    test('should reject missing ' + arg, ({ expect }) => {
      expect(
        () => createSender({
          apiKey,
          from,
          templatesDir,
          subjectsFile,
          [arg]: undefined
        })
      ).toThrow(arg + ' is required')
    })
  }

  for (const [arg, value] of Object.entries({ templatesDir, subjectsFile })) {
    test('should reject non-existing ' + arg, ({ expect }) => {
      td.when(existsSync(value)).thenReturn(false)

      expect(
        () => createSender({
          apiKey,
          from,
          templatesDir,
          subjectsFile
        })
      ).toThrow(arg + ' does not exists: ' + value)
    })
  }

  for (const [arg, value, error] of [
    ['templateId', undefined, 'templateId is required'],
    ['to', undefined, 'to must be an email, actual: undefined'],
    ['to', 'adminemail.com', 'to must be an email, actual: adminemail.com']
  ]) {
    test(`should create sender that rejects ${arg} with value ${JSON.stringify(value)}`, ({ expect }) => {
      const send = createSender({
        apiKey,
        from,
        templatesDir,
        subjectsFile
      })

      expect(() => send({
        to: 'admin@email.com',
        templateId: 'error',
        [arg]: value
      })).toThrow(error)
    })
  }

  test('should create sender that passes the right parameters to mail transporter', ({ expect }) => {
    const send = createSender({
      apiKey,
      from,
      templatesDir,
      subjectsFile
    })

    const to = 'admin@email.com'

    const params = {
      app: 'ZeApp',
      logLink: 'https://path/to/log/file'
    }

    const sendExpectedResult = 'email successfully sent'

    const template =
      `<h1>an error occured on ${params.app}: <a href="${params.logLink}">${params.logLink}</a></h1>`

    const html = `<html>${template}</html>`

    const gmailSend = td.when(td.function('send')({
      subject: 'an error occured on ' + params.app,
      text: `an error occurred on ${params.app}: ${params.logLink}`,
      html
    })).thenResolve(sendExpectedResult)

    td.when(createGmailSender({
      pass: apiKey,
      to,
      user: from
    })).thenReturn(gmailSend)

    td.when(htmlFrom(template)).thenReturn({ html })

    const sendResult = send({
      templateId: 'error',
      to,
      params
    })

    return expect(sendResult).resolves.toBe(sendExpectedResult)
  })
})
