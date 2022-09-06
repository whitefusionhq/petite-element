import { createApp, reactive } from "petite-vue"

export class ControlledElement extends HTMLElement {
  addController(controller) {
    ;(this.__controllers ??= []).push(controller)
    if (this.initialized && this.isConnected) {
      controller.hostConnected?.()
    }
  }

  connectedCallback() {
    this.__controllers?.forEach((c) => c.hostConnected?.())
    this.initialized = true
  }

  disconnectedCallback() {
    this.__controllers?.forEach((c) => c.hostDisconnected?.())
    this.initialized = false
  }
}

export class PetiteController {
  host
  data
  app

  constructor(host, options = {}) {
    this.template = options.template.cloneNode(true)
    if (this.template.querySelector("template")?.attributes?.length === 0) {
      const embeddedTemplate = this.template.querySelector("template")
      this.template.prepend(embeddedTemplate.content)
      embeddedTemplate.remove()
    }
    this.findScopedStyles(host)
    this.data = this.findProps(host)
    this.useShadowRoot = options.shadowRoot ?? true
    ;(this.host = host).addController(this)
  }

  hostConnected() {
    if (this.app) {
      // Our app's still running, so we'll just let it continue to flourish!
      return
    }

    const host = this.host

    const petite = this
    Object.keys(this.data).forEach((key) => {
      const { type, attribute } = this.propDefinitions[key]
      Object.defineProperty(host, key, {
        get() {
          return petite.data[key]
        },
        set(newValue) {
          petite.data[key] = newValue
          if (attribute) {
            petite.reflectingAttribute = attribute
            if (type === Array || type === Object) {
              this.setAttribute(attribute, JSON.stringify(newValue))
            } else {
              if (newValue === null || newValue === false) {
                this.removeAttribute(attribute)
              } else if (newValue === true) {
                this.setAttribute(attribute, "")
              } else {
                this.setAttribute(attribute, newValue)
              }
            }
          }
        },
      })
    })

    this.data = reactive(this.data)
    this.app = createApp(host)

    if (this.useShadowRoot) {
      // petite-vue doesn't like mounting directly on the root, so we mount on a root node instead
      const rootShadowMount = document.createElement("petite-root")
      rootShadowMount.style.display = "contents"
      rootShadowMount.append(this.template)
      this.app.mount(rootShadowMount)

      if (!host.shadowRoot) {
        host.attachShadow({ mode: "open" })
        host.shadowRoot.append(rootShadowMount)
      } else {
        host.shadowRoot.replaceChildren(rootShadowMount)
      }
    } else {
      host.replaceChildren(this.template)
      this.app.mount(host)
    }
  }

  hostDisconnected() {
    // no-op
  }

  updateAttribute(attr, newValue) {
    if (this.reflectingAttribute) {
      this.reflectingAttribute = null
      return
    }

    const [key, definition] = Object.entries(this.propDefinitions).find(
      ([key, definition]) => definition.attribute == attr
    )

    if (definition.type === Boolean) {
      this.data[key] = newValue !== null
    } else if (newValue !== null && definition.type === Number) {
      this.data[key] = Number(newValue)
    } else if (definition.type === Array || definition.type === Object) {
      this.data[key] = newValue ? JSON.parse(newValue) : definition.type()
    } else {
      this.data[key] = newValue
    }
  }

  findProps(host) {
    const data = {}
    this.propDefinitions = host.constructor.defineProps
    Object.entries(this.propDefinitions).forEach(([key, options]) => {
      const defaultValue = options.default
      if (typeof defaultValue === "function") {
        // TODO: figure out "rawProps" later
        data[key] = defaultValue({})
      } else {
        data[key] = defaultValue ?? null
      }
    })

    return data
  }

  findScopedStyles(host) {
    const tagName = host.localName
    const scopeId = `${tagName}-scope`
    this.template.querySelectorAll("template[scoped-style]").forEach((styleTemplate) => {
      if (!document.head.querySelector(`style#${scopeId}`)) {
        const styleTag = styleTemplate.content.querySelector("style")
        const styles = styleTag.textContent
        styleTag.textContent = styles
          .replaceAll(/[\s,]*(.+?)\s*?([{,])/g, ` ${tagName} $1 $2`)
          .replaceAll(RegExp(`${tagName} :host\\(?(.*?)\\)?\\s+`, "g"), `${tagName}$1 `)
        styleTag.id = scopeId
        document.head.append(styleTag)
      }

      styleTemplate.remove()
    })
  }
}

export const reflect = (hostClass, name) => {
  hostClass.observedAttributes ??= []
  hostClass.observedAttributes.push(name)
  return name
}

export class PetiteElement extends ControlledElement {
  static define() {
    if (!customElements.get(this.setup.tagName)) {
      customElements.define(this.setup.tagName, this)
    }
  }

  static get observedAttributes() {
    return Object.values(this.defineProps)
      .map((definition) => definition.attribute)
      .filter((name) => name)
  }

  constructor() {
    super()
    this.petite = new PetiteController(this, this.constructor.setup)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.petite.updateAttribute(name, newValue)
  }
}
