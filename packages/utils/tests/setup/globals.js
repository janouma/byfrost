/* Mocking localStorage */

const proxyTarget = {
  setItem (key, value) {
    this._values[key] = String(value)
  },

  getItem (key) {
    return this._values[key]
  },

  removeItem (key) {
    delete this._values[key]
  },

  clearFakeStorage () { this.clear() },

  clear () {
    for (const key of Reflect.ownKeys(this._values)) {
      this.removeItem(key)
    }
  }
}

Object.defineProperty(proxyTarget, '_values', { value: {}, enumerable: false })

export const mockLocalStorage = new Proxy(
  Object.freeze(proxyTarget),
  {
    get (target, prop) {
      return prop in target ? Reflect.get(target, prop) : target.getItem(prop)
    },

    set (target, prop, value) {
      prop in target ? Reflect.set(target, prop, value) : target.setItem(prop, value)
      return true
    },

    has (target, prop) {
      return prop in target._values
    },

    deleteProperty (target, prop) {
      return delete target._values[prop]
    }
  }
)
