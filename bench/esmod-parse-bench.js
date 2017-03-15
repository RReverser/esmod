#!/usr/bin/env node
'use strict'

const Benchmark = require('benchmark')
const fs = require('fs')
const { parse } = require('../index.js')
const path = require('path')
const prettyBytes = require('pretty-bytes')
const prettyMs = require('pretty-ms')

const content = fs.readFileSync(path.join(__dirname, 'fixture/react@15.4.2.js'), 'utf8')
const size = prettyBytes(Buffer.byteLength(content, 'utf8'))
const bench = new Benchmark(`esmod parses ${ size }`, () => parse(content))

bench.on('complete', ({ target }) => {
  const time = prettyMs(1e3 / target.hz)
  console.log(`${ target }`.replace(' x ', ` in ${ time }; `))
})

if (require.main === module) {
  bench.run({ 'async': true })
}
module.exports = bench
