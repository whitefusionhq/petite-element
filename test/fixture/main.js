import { TestPetiteElement } from "./hello-world.html"

const section = document.createElement("section")
section.innerHTML = `
  <petite-el te-xt="Supplied">
    Slot content
  </petite-el>
`
document.body.append(section)

window.testing = {
  TestPetiteElement,
  section
}
