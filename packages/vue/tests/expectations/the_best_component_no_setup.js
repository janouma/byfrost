
   import { defineCustomElement } from 'vue'

  import schema, { validate } from 'joi'
  import './lib/link.js'


    import { toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("h1", null, "The best Vue component \"" + _toDisplayString(_ctx.name) + "\" " + _toDisplayString(_ctx.message), 1 /* TEXT */))
}
    const TheBestComponentNoSetup = defineCustomElement({
      ...{
    props: { name: String },

    data () {
      return {
        message: 'in the world'
      }
    }
  },
      render,
      styles: [`
h1 { font-size: 2em;
}
`]
    })

class __TheBestComponentNoSetup__ extends TheBestComponentNoSetup {
  connectedCallback () {
    super.connectedCallback()

    if (this._instance?.exposed) {
      const exposedProps = Reflect.ownKeys(this._instance.exposed)
        .filter(prop => !prop.startsWith('_'))

      for (const prop of exposedProps) {
        const value = this._instance.exposed[prop]

        if (!(prop in this)) {
          this[prop] = typeof value === 'function' ? value.bind(this._instance.proxy) : value
        } else {
          console.warn(`'${prop}' already in component 'the-best-component-no-setup' instance`)
        }
      }
    }
  }
}

customElements.define('the-best-component-no-setup', __TheBestComponentNoSetup__)
