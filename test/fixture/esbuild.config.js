import esbuild from "esbuild"
import htmlModulesPlugin from "esbuild-plugin-html-modules"

/**
 * @typedef { import("esbuild").BuildOptions } BuildOptions
 * @type {BuildOptions}
 */
esbuild.build({
  bundle: true,
  target: "es2022",
  entryPoints: ['test/fixture/main.js'],
  outfile: 'test/fixture/out.js',
  plugins: [
    htmlModulesPlugin()
  ]
}).catch(() => process.exit(1))
