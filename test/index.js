/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const co = require('co')
const { assert } = require('chai')
const { parse, _:{ getExplicitTokenRefs } } = require('../src')
const { join } = require('path')

describe('index', () => {
	describe('#parse', () => {
		it('Should parse a serverless.yml file to JSON.', done => { co(function *(){
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const config = yield parse(ymlPath)
			const { service, functions } = config || {}
			assert.equal(service, 'graphql', '01')
			assert.equal(functions.graphql.handler, 'handler.handler', '03')
			assert.equal(functions.graphql.events[0].http.path, '/', '04')
			assert.equal(functions.graphql.events[0].http.method, 'ANY', '05')
			done()
		}).catch(done)})

		it('Should resolve the dynamic variables using the default settings inside the serverless.yml file.', done => { co(function *(){
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const config = yield parse(ymlPath)
			const { custom, provider, resources } = config || {}
			assert.equal(custom.stage, 'dev', '01')
			assert.equal(provider.stage, 'dev', '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_dev', '03')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 1, '04')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 1, '05')
			done()
		}).catch(done)})
		
		it('Should resolve the dynamic variables inside the serverless.yml file.', done => { co(function *(){
			const ymlPath = join(__dirname, './data/serverless_01.yml')
			const config = yield parse(ymlPath, { stage:'prod' })
			const { custom, provider, resources } = config || {}
			assert.equal(custom.stage, 'prod', '01')
			assert.equal(provider.stage, 'prod', '02')
			assert.equal(resources.Resources.UserTable.Properties.TableName, 'user_prod', '03')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.ReadCapacityUnits, 2, '04')
			assert.equal(resources.Resources.UserTable.Properties.ProvisionedThroughput.WriteCapacityUnits, 2, '05')
			done()
		}).catch(done)})
	})
	describe('#_.getExplicitTokenRefs', () => {
		it('Should parse a serverless.yml file to JSON.', () => {
			const tokenRefs = getExplicitTokenRefs({
				'service': 'graphql',
				'custom': {
					'stage': '${opt:stage, \'dev\'}',
					'dynamoDb': {
						'devProvisionedThroughput': {
							'ReadCapacityUnits': 1,
							'WriteCapacityUnits': 1
						},
						'prodProvisionedThroughput': {
							'ReadCapacityUnits': 2,
							'WriteCapacityUnits': 2
						}
					}
				},
				'provider': {
					'name': 'aws',
					'runtime': 'nodejs10.x',
					'region': 'ap-southeast-2',
					'profile': 'fairplay',
					'stage': '${self:custom.stage}'
				},
				'functions': {
					'graphql': {
						'handler': 'handler.handler',
						'events': [
							{
								'http': {
									'path': '/',
									'method': 'ANY'
								}
							}
						]
					}
				},
				'resources': {
					'Resources': {
						'UserTable': {
							'Type': 'AWS::DynamoDB::Table',
							'Properties': {
								'TableName': 'user_${self:provider.stage}',
								'AttributeDefinitions': [
									{
										'AttributeName': 'id',
										'AttributeType': 'N'
									},
									{
										'AttributeName': 'username',
										'AttributeType': 'S'
									},
									{
										'AttributeName': 'data',
										'AttributeType': 'M'
									}
								],
								'KeySchema': [
									{
										'AttributeName': 'id',
										'KeyType': 'N'
									}
								],
								'ProvisionedThroughput': '${self:custom.dynamodb.${self:provider.stage}ProvisionedThroughput}',
								'Tags': [
									{
										'Key': 'Type',
										'Value': 'test'
									},
									{
										'Key': 'Name',
										'Value': 'graphql'
									}
								]
							}
						}
					}
				}
			})

			assert.equal(tokenRefs.length, 4, '01')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'custom' && p[1] == 'stage').raw, '${opt:stage, \'dev\'}', '02')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'custom' && p[1] == 'stage').ref.opt.path[0], 'stage', '03')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'custom' && p[1] == 'stage').ref.opt.alt, 'dev', '04')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').raw, '${self:custom.stage}', '05')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').ref.self.path[0], 'custom', '06')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').ref.self.path[1], 'stage', '07')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'provider' && p[1] == 'stage').ref.self.alt, null, '08')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').raw, 'user_${self:provider.stage}', '09')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').ref.self.path[0], 'provider', '10')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').ref.self.path[1], 'stage', '11')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'TableName').ref.self.alt, null, '12')

			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').raw, '${self:custom.dynamodb.${self:provider.stage}ProvisionedThroughput}', '13')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').ref.self.path[0], 'provider', '14')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').ref.self.path[1], 'stage', '15')
			assert.equal(tokenRefs.find(({ path:p }) => p[0] == 'resources' && p[4] == 'ProvisionedThroughput').ref.self.alt, null, '16')
		})
	})
})









