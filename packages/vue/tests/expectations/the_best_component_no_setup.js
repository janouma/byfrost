
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
  

  customElements.define('the-best-component-no-setup', TheBestComponentNoSetup)
  