import test from "node:test"
import { strict as assert } from "node:assert"
import { setTimeout } from "timers/promises"
import { readFileSync, writeFileSync, rmSync } from "fs"
import { JSDOM } from "jsdom"

function processBundle() {
  const bundle = readFileSync("test/fixture/out.js").toString()

  const { window } = new JSDOM(``, { runScripts: "outside-only" })
  window.eval(bundle)
  return window
}

test("attributes and properties work", async (t) => {
  const { testing } = processBundle()
  const testPetiteEl = testing.section.children[0]

  assert.equal(testPetiteEl.localName, "petite-el")
  assert.equal(testPetiteEl.count, 10)
  assert.equal(testPetiteEl.text, "Supplied")
  assert.equal(testPetiteEl.shadowRoot.querySelector("h1").textContent, testPetiteEl.text)

  testPetiteEl.count = 20
  await setTimeout()
  assert.equal(testPetiteEl.shadowRoot.querySelector("p").textContent, "20")

  testPetiteEl.setAttribute("count", "30")
  await setTimeout()
  assert.equal(testPetiteEl.shadowRoot.querySelector("p").textContent, "30")
  assert.equal(testPetiteEl.count, 30)
})

test("events work", async (t) => {
  const window = processBundle()
  const { testing } = window
  const testPetiteEl = testing.section.children[0]

  assert.equal(testPetiteEl.text, "Supplied")
  testPetiteEl.shadowRoot.querySelector("button").dispatchEvent(new window.Event("click"))
  await setTimeout()
  assert.equal(testPetiteEl.text, "Clicked!")
  assert.equal(testPetiteEl.shadowRoot.querySelector("h1").textContent, testPetiteEl.text)
})
