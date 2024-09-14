import {defineCustomElement }from 'vue'import {toDisplayString as _toDisplayString,openBlock as _openBlock,createElementBlock as _createElementBlock }from "vue"import {ref }from 'vue'import schema,{validate }from 'joi'import './lib/link.js'const TheBestComponent =defineCustomElement({...{__name:'the_best_component',props:{name:String },setup(__props){const props =__props const message =ref('in the world')return (_ctx,_cache)=>{return (_openBlock(),_createElementBlock("h1",null,"The best Vue component \""+_toDisplayString(__props.name)+"\""+_toDisplayString(message.value),1 /*TEXT */))}}},styles:[`h1 {font-size:2px;}`]})

class __TheBestComponent__ extends TheBestComponent {
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
          console.warn(`'${prop}' already in component 'the-best-component' instance`)
        }
      }
    }
  }
}

customElements.define('the-best-component',__TheBestComponent__)
