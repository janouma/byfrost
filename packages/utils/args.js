const NO_PREFIX = 'no-'

export const argsArrayToArgsObject = () => process.argv.slice(2)
  .reduce((result, arg) => {
    const [name, ...values] = arg.split('=')
    const value = values.join('=')

    return Object.assign(
      result,

      values.length > 0
        ? { [name]: value }
        : !name.startsWith(NO_PREFIX)
            ? { [name]: true }
            : { [name.replace(NO_PREFIX, '')]: false }
    )
  }, {})

export const not = argName => NO_PREFIX + argName
