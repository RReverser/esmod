#!/usr/bin/env node
'use strict'

const glob = require('glob')
const { Suite } = require('benchmark')

const suite = new Suite
glob.sync('./*-bench.js', { 'cwd': __dirname }).forEach((id) => suite.push(require(id)))
suite.run({ 'async': true })
