/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const co = require('co')
const { assert } = require('chai')
const { parse } = require('../src')
const { join } = require('path')

describe('index', () => {
	describe('#parse', () => {
		it('Should parse a serverless.yml file to JSON.', done => { co(function *(){
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const config = yield parse(ymlPath)
			const { service, custom, functions } = config || {}
			assert.equal(service, 'graphql', '01')
			assert.equal(functions.graphql.handler, 'handler.handler', '03')
			assert.equal(functions.graphql.events[0].http.path, '/', '04')
			assert.equal(functions.graphql.events[0].http.method, 'ANY', '05')
			done()
		}).catch(done)})
		it('Should resolve the dynamic variables inside the serverless.yml file.', done => { co(function *(){
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const config = yield parse(ymlPath)
			const { custom, provider, resources } = config || {}
			assert.equal(custom.stage, 'dev', '01')
			assert.equal(provider.stage, 'dev', '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_dev', '03')
			done()
		}).catch(done)})
	})
})









