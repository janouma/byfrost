const clone = typeof global.structuredClone === 'function'
  ? structuredClone
  : source => JSON.parse(JSON.stringify(source))

export function merge (...sources) {
  return mergeWith((destValue, srcValue) => {
    if (Array.isArray(destValue) && Array.isArray(srcValue)) {
      return [...clone(destValue), ...clone(srcValue)]
    }

    return clone(srcValue)
  }, ...sources)
}

export function shallowMerge (...sources) {
  return Object.assign({}, ...sources)
}

function mergeWith (mergeFn, ...sources) {
  return sources.reduce((allMerged, source) => shallowMerge(
    allMerged,

    Object.entries(source).reduce((propertyMerged, [property, value]) => {
      const destValue = allMerged[property]
      const srcValue = mergeFn(destValue, value)

      if (
        Array.isArray(destValue) ||
        Array.isArray(srcValue) ||
        typeof destValue !== 'object' ||
        typeof srcValue !== 'object'
      ) {
        return shallowMerge(propertyMerged, { [property]: srcValue })
      }

      return shallowMerge(propertyMerged, { [property]: mergeWith(mergeFn, destValue, srcValue) })
    }, {})
  ))
}
