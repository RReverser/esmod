#!/usr/bin/env node
'use strict'

const acorn = require('acorn')
const Benchmark = require('benchmark')
const fs = require('fs')
const path = require('path')
const prettyBytes = require('pretty-bytes')
const prettyMs = require('pretty-ms')

const parse = (content) => acorn.parse(content, { 'sourceType': 'module' })
const content = fs.readFileSync(path.join(__dirname, 'fixture/react@15.4.2.js'), 'utf8')
const size = prettyBytes(Buffer.byteLength(content, 'utf8'))
const bench = new Benchmark(`acorn parses ${ size }`, () => parse(content))

bench.on('complete', ({ target }) => {
  const time = prettyMs(1e3 / target.hz)
  console.log(`${ target }`.replace(' x ', ` in ${ time }; `))
})

if (require.main === module) {
  bench.run({ 'async': true })
}
module.exports = bench
