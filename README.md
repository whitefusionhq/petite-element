# petite-element (WIP)

Create web components using a custom element reactivity subsystem powered by [petite-vue](https://github.com/vuejs/petite-vue).

Built for use in particular with [HTML Modules and this esbuild plugin](https://github.com/whitefusionhq/esbuild-plugin-html-modules).

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
```

```html
<petite-el te-xt="Hello">
  <p>Greetings to you all.</p>
</petite-el>
```
