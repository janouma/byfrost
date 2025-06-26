import pathUtil from 'path'
import { readFileSync, existsSync } from 'fs'
import htmlFrom from 'mjml'
import createGmailSender from 'gmail-send'
import { render } from './string.js'

const emailPattern = /^[\w-+._*$'/?!`#&]+@\w+(\.\w+)?$/

function findTemplatesFor ({ templatesDir, id }) {
  return {
    text: readFileSync(
      pathUtil.join(templatesDir, `${id}.txt`)
    ).toString(),

    mjml: readFileSync(
      pathUtil.join(templatesDir, `${id}.mjml`)
    ).toString()
  }
}

function createTransporter ({ to, apiKey, from }) {
  return createGmailSender({
    user: from,
    pass: apiKey,
    to
  })
}

function send ({
  apiKey,
  from,
  subjects,
  templatesDir,
  templateId,
  to,
  params
} = {}) {
  const templates = findTemplatesFor({ templatesDir, id: templateId })
  const subject = render(subjects[templateId], params)
  const text = render(templates.text, params)
  const { html } = htmlFrom(render(templates.mjml, params))
  const sendViaGmail = createTransporter({ to, apiKey, from })

  return sendViaGmail({
    subject,
    text,
    html
  })
}

export function createSender ({
  apiKey,
  from,
  templatesDir,
  subjectsFile
} = {}) {
  if (!apiKey) {
    throw new Error('apiKey is required')
  }

  if (!from) {
    throw new Error('from is required')
  }

  if (!templatesDir) {
    throw new Error('templatesDir is required')
  }

  if (!existsSync(templatesDir)) {
    throw new Error('templatesDir does not exists: ' + templatesDir)
  }

  if (!subjectsFile) {
    throw new Error('subjectsFile is required')
  }

  if (!existsSync(subjectsFile)) {
    throw new Error('subjectsFile does not exists: ' + subjectsFile)
  }

  const subjects = JSON.parse(
    readFileSync(subjectsFile)
      .toString()
  )

  return ({ templateId, to, params }) => {
    if (!templateId) {
      throw new Error('templateId is required')
    }

    if (!to || !to.match(emailPattern)) {
      throw new Error('to must be an email, actual: ' + to)
    }

    return send({
      apiKey,
      from,
      subjects,
      templatesDir,
      templateId,
      to,
      params
    })
  }
}
