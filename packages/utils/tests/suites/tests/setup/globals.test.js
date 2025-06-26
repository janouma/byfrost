import { test } from '@japa/runner'
import { mockLocalStorage } from '../../../setup/globals.js'

test('mockLocalStorage should simulate the native localStorage behaviour', ({ expect }) => {
  const obj = { a: 'a' }
  const num = 123

  mockLocalStorage.setItem('obj', obj)
  expect(mockLocalStorage.obj).toBe(String(obj))

  mockLocalStorage.objBis = obj
  expect(mockLocalStorage.getItem('objBis')).toBe(String(obj))

  mockLocalStorage.setItem('num', num)
  expect(mockLocalStorage.num).toBe(String(num))

  mockLocalStorage.numBis = num
  expect(mockLocalStorage.getItem('numBis')).toBe(String(num))

  expect('obj' in mockLocalStorage).toBe(true)

  mockLocalStorage.removeItem('obj')
  expect(mockLocalStorage.obj).toBeUndefined()
  expect(mockLocalStorage.getItem('obj')).toBeUndefined()

  delete mockLocalStorage.objBis
  expect(mockLocalStorage.objBis).toBeUndefined()
  expect(mockLocalStorage.getItem('objBis')).toBeUndefined()

  mockLocalStorage.clear()

  for (const property of ['num', 'numBis']) {
    expect(mockLocalStorage[property]).toBeUndefined()
    expect(property in mockLocalStorage).toBe(false)
  }

  mockLocalStorage.objTer = obj
  mockLocalStorage.numTer = num

  mockLocalStorage.clearFakeStorage()

  for (const property of ['objTer', 'numTer']) {
    expect(mockLocalStorage[property]).toBeUndefined()
    expect(property in mockLocalStorage).toBe(false)
  }
}).teardown(() => mockLocalStorage.clear())

test('should prevent own properties overwrite', ({ expect }) => {
  expect(() => { mockLocalStorage._values = {} }).toThrow()
  expect(() => { delete mockLocalStorage._values }).toThrow()
})

test('should make "_values" property non enumerable', ({ expect }) => {
  expect(Object.keys(mockLocalStorage).includes('_values')).toBe(false)
})
