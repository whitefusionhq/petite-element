# petite-element (WIP)

Create web components using a custom element reactivity subsystem powered by [petite-vue](https://github.com/vuejs/petite-vue). Built for use in particular with [HTML Modules and this esbuild plugin](https://github.com/whitefusionhq/esbuild-plugin-html-modules).

Styles are scoped by default due to the use of Shadow DOM, and reflection from attributes to properties and back again is handled for basic data types beyond mere strings such as numbers, arrays, and objects. 

Example:

```html
<script type="module">
  import { PetiteElement } from "petite-element"

  export class TestPetiteElement extends PetiteElement {
    static setup = {
      tagName: "petite-el",
      template: import.meta.document,
    }

    static defineProps = {
      count: {
        type: Number,
        attribute: "count",
        default: 10
      },
      text: {
        type: String,
        attribute: "te-xt",
      },
    }

    myButtonHandler(e) {
      this.text = "Clicked!"
    }
  }

  TestPetiteElement.define()
</script>

<h1>{{ text }}</h1>

<p>{{ count }}</p>

<slot></slot>

<button @click="myButtonHandler">Click me</button>

<style>
  :host {
    display: block;
  }

  h1 {
    color: var(--heading-color);
  }

  button {
    font: inherit;
  }
</style>
```

```html
<petite-el te-xt="Hello">
  <p>Greetings to you all.</p>
</petite-el>
```
