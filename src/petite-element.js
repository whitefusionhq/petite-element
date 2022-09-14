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
    if (options.template) {
      this.template = options.template.cloneNode(true)
      if (this.template.querySelector("template")?.attributes?.length === 0) {
        const embeddedTemplate = this.template.querySelector("template")
        this.template.prepend(embeddedTemplate.content)
        embeddedTemplate.remove()
      }
    }
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

    host.hydrated = true
    this.data = reactive(this.data)
    this.app = createApp(host)

    if (this.useShadowRoot) {
      // petite-vue doesn't like mounting directly on the root, so we mount on a root node instead
      const rootShadowMount = document.createElement("petite-root")
      rootShadowMount.style.display = "contents"
      if (host.shadowRoot || host.querySelector("template[shadowroot]")) {
        if (host.shadowRoot) {
          // DSD is a go!
          rootShadowMount.append(...host.shadowRoot.childNodes)
        } else {
          // We'll copy template content manually
          rootShadowMount.append(host.querySelector("template[shadowroot]").content.cloneNode(true))
        }
      } else {
        if (this.template) {
          rootShadowMount.append(this.template)
        }
      }
      this.clearShorthandClasses(rootShadowMount)
      this.app.mount(rootShadowMount)

      if (!host.shadowRoot) {
        // Polyfill that DSD!
        host.attachShadow({ mode: "open" })
      }
      host.shadowRoot.replaceChildren(rootShadowMount)
    } else {
      if (this.template) {
        host.replaceChildren(this.template)
      }
      this.clearShorthandClasses(host)
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

  // Since petite-vue will render out the right classes on mount, we need to strip
  // the SSRed classes first, otherwise there's class duplication
  clearShorthandClasses(fragment) {
    fragment.querySelectorAll("[\\:class]").forEach(node => {
      node.removeAttribute("class")
    })
    fragment.querySelectorAll("[v-bind\\:class]").forEach(node => {
      node.removeAttribute("class")
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
