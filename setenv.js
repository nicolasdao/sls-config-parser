#!/usr/bin/env node

/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

(() => {
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

	const _getOptionValue = option => {
		const idx = process.argv.indexOf(`--${option}`)
		return idx >= 0 ? process.argv[idx+1] : null
	}

	const inclCreds = process.argv.indexOf('--inclcreds') >= 0
	const stage = _getOptionValue('stage')
	const _force = _getOptionValue('force')
	const ymlPath = process.argv.indexOf('--path') >= 0 ? _getFullPath(process.argv[process.argv.indexOf('--path')+1]) : null

	const cfg = Config({ _path:ymlPath, _force, stage, profile })

	return cfg.setEnv({ inclAccessCreds:inclCreds })
})()


