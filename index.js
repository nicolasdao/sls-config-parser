#!/usr/bin/env node

/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { join } = require('path')
const { homedir } = require('os')
const { Config } = require('./src')

const _getFullPath = p => {
	if (!p || typeof(p) != 'string')
		return null

	if (p.indexOf('~/') == 0)
		return join(homedir(), p.replace('~/',''))
	else if (/^(\.|\.\.)\//.test(p) || p.indexOf('/') != 0)
		return join(process.cwd(), p)
	else
		return p
}

const setEnv = process.argv.indexOf('--setenv') >= 0
const inclCreds = process.argv.indexOf('--inclcreds') >= 0
const stage = process.argv.indexOf('--stage') >= 0 ? process.argv[process.argv.indexOf('--stage')+1] : null
const ymlPath = process.argv.indexOf('--path') >= 0 ? _getFullPath(process.argv[process.argv.indexOf('--path')+1]) : null

const cfg = Config(ymlPath, { stage })

if (setEnv)
	cfg.env({ inclAccessCreds:inclCreds, format:'array' }).then(env => {
		if (!env || !env.length)
			return

		env.forEach(({ name, value }) => {
			process.env[name] = value
		})
	})


