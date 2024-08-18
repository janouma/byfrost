export const argsArrayToArgsObject = () => process.argv.slice(2)
  .reduce((result, arg) => {
    const [name, ...values] = arg.split('=')

    return {
      ...result,
      [name]: values.join('=')
    }
  }, {})
