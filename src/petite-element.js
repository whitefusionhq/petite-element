import { createApp, reactive } from "https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.es.js"

class PetiteElement extends HTMLElement {
  $delimiters = ['${', '}']
  reactive = reactive

  constructor(data) {
    super()
  }

  vue(data, options = {}) {
    Object.keys(data).forEach(key => {
      Object.defineProperty(this, key, {
        get() { return data[key] },
        set(newValue) { data[key] = newValue }
      })
    })

    const t = options.template ? options.template : document.getElementById(`${this.localName}-template`).content
    this.attachShadow({ mode: "open" })
    this.shadowRoot.append(document.createElement("vue-root"))
    this.shadowRoot.children[0].append(document.importNode(t, true))

    createApp(this).mount(this.shadowRoot.children[0])
  }
}

export default PetiteElement
