#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8')

const errors = []
if (pkg.private === true) errors.push('package.json must not be private')
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') {
  errors.push('package.json must declare dsh.bundle.patch = "./cordis.patch.yml"')
}
if (pkg.dsh?.client?.platform !== 'web') errors.push('package.json must declare dsh.client.platform = "web"')
if (!Array.isArray(pkg.keywords) || !pkg.keywords.includes('dsh-plugin')) {
  errors.push('package.json keywords must include dsh-plugin')
}
for (const name of ['preinstall', 'install', 'postinstall', 'prepare']) {
  if (pkg.scripts?.[name] !== undefined) errors.push(`lifecycle script "${name}" is not allowed`)
}
if (!pkg.exports?.['.'] || !pkg.exports?.['./client']) {
  errors.push('package.json must export "." and "./client"')
}
if (!patch.includes('name: dsh-plugin-session-archive')) {
  errors.push('cordis.patch.yml must insert dsh-plugin-session-archive')
}

if (errors.length > 0) {
  console.error(errors.map((line) => `error: ${line}`).join('\n'))
  process.exit(1)
}
console.log('dsh-plugin-session-archive: package check ok')
