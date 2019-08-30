# Serverless Config File Parser &middot; [![Tests](https://travis-ci.org/nicolasdao/sls-config-parser.svg?branch=master)](https://travis-ci.org/nicolasdao/sls-config-parser) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)
__*sls-config-parser*__ parses serverless.yml files so that its values can be used locally in JS code during development, including automatically setting up environment variables. Its main usage is to set up the environment variables (including the access key and secret from the `~/.aws/credentials` as well as the region from the `~/.aws/config`) locally so it is possible to test functions locally. Setting up the environment variables is done in a package.json script as follow:

```js
"scripts": {
	"start": "node -r sls-config-parser/setenv index.js --inclcreds --stage prod"
}
```

This script sets up the environment variables based on the profile defined in the `serverless.yml` file and the credentials defined in the `~/.aws/credentials` and `~/.aws/config` the file.

> IMPORTANT: [You should probably rewrite how you `require('aws-sdk')`](#you-should-probably-rewrite-how-you-requireaws-sdk`)

> WARNING: The package is in beta. Limitations:
>	- Not tested on Windows.
>	- Only works with YAML files (JSON support coming soon).
>	- No support for CloudFormation intrinsic functions yet (e.g., Ref, !Sub, !Join).

# Table of Contents

> * [Install](#install) 
> * [Getting started](#getting-started) 
>	- [Parsing the serverless.yml](#parsing-the-serverlessyml)
>	- [Getting the environment variables](#getting-the-environment-variables)
>	- [Setting up environment variables](#setting-up-environment-variables)
>		- [Why is it important?](#why-is-it-important)
>		- [Setting things up](#setting-things-up)
> * [Gotchas](#gotchas)
>	- [You should probably rewrite how you `require('aws-sdk')`](#you-should-probably-rewrite-how-you-requireaws-sdk)
> * [Annexes](#annexes)
>	- [`sls-config-parser/setenv` API](#sls-config-parsersetenv-api)
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)


# Install

```
npm i sls-config-parser
```

> Dev dependency VS App dependency:
> Depending on your use case, install it as a dev dependency or as an app dependency. The dev dependency case occurs when, for example, you're only interested in setting environment variables based on your .aws/credentials and your serverless.yml.

# Getting started
## Parsing the serverless.yml
Assuming there is a `serverless.yml` file in your root folder:

```js
const { Config } = require('sls-config-parser')

const defaultCfg = new Config()
const stagingCfg = new Config({ stage: 'staging' })
const prodCfg = new Config({ stage: 'prod' })
const customCfg = new Config({ stage: 'prod', path:'../path-to-another-config/some-other.yml' })

defaultCfg.config().then(serverlessConfig => { console.log('STAGING CONFIG:'); console.log(serverlessConfig) })
stagingCfg.config().then(serverlessConfig => { console.log('STAGING CONFIG:'); console.log(serverlessConfig) })
prodCfg.config().then(serverlessConfig => { console.log('PROD CONFIG:'); console.log(serverlessConfig) })
customCfg.config().then(serverlessConfig => { console.log('CUSTOM CONFIG:'); console.log(serverlessConfig) })
```

## Getting the environment variables

Let's imagine we have the following `serverless.yml` file:

```yml
service: graphql

custom:
  stage: ${opt:stage, 'dev'}
  dynamoDB:${file(./config/local.yml)}

provider:
  name: aws
  runtime: nodejs10.x
  region: ap-southeast-2
  profile: fairplay
  stage: ${self:custom.stage}
  environment:
    DATA_01: hello ${self:provider.stage}
    DATA_02: boom boom

functions:
  graphql:
    handler: handler.handler
    events:
      - http:
          path: /
          method: ANY
    environment:
      GRAPHQL_ENV_01: graphql_01
      GRAPHQL_ENV_02: graphql_02
  rest:
    handler: handler.rest
    events:
      - http:
          path: /rest
          method: ANY
    environment:
      REST_ENV_01: rest_01
      REST_ENV_02: rest_02

resources:
  Resources:
    UserTable:
      Type: AWS::DynamoDB::Table
      Properties: 
        TableName: user_${self:provider.stage}
        AttributeDefinitions: 
          - AttributeName: id
            AttributeType: N
          - AttributeName: username
            AttributeType: S
          - AttributeName: data
            AttributeType: M
        KeySchema: 
          - AttributeName: id
            KeyType: N
        ProvisionedThroughput: ${self:custom.dynamoDB.${self:provider.stage}ProvisionedThroughput}
        Tags: 
          - Key: Type
            Value: test
          - Key: Name
            Value: graphql
```

```js
const { Config } = require('sls-config-parser')

const cfg = new Config()

// EXAMPLE 01: Returns an object with all the environment variables (both global and local to all functions).
// For example: env.DATA_01 -> 'hello dev', env.GRAPHQL_ENV_01 -> 'graphql_01', env.REST_ENV_01 -> 'rest_01'
defaultCfg.env().then(env => console.log(env)) 

// EXAMPLE 02: Returns the same data as above, but as an array rather than an object.
// For example: [{ name: 'DATA_01', value: 'hello dev' }, { name:'GRAPHQL_ENV_01', value: 'graphql_01' }, ...]
defaultCfg.env({ format:'array' }).then(env => console.log(env)) 

// EXAMPLE 03: Returns the same data as #01, but only focus on the global variables and the 'graphql' function variables.
defaultCfg.env({ functions:['graphql'] }).then(env => console.log(env)) 

// EXAMPLE 04: Returns the same data as #03, but ignore the global variables.
defaultCfg.env({ functions:['graphql'], ignoreGlobal:true }).then(env => console.log(env)) 

// EXAMPLE 05: Returns the global variables only.
defaultCfg.env({ ignoreFunctions:true }).then(env => console.log(env)) 

// EXAMPLE 06: Returns the same data as #01 with the additionnal AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY defined
// in the ~/.aws/credentials file. If there are multiple profiles in the credentials file, sls-config-parser uses the
// profile defined under the provider.profile property in the serverless.yml file (in our case, that profile is called 
// 'fairplay').
// For example: env.AWS_ACCESS_KEY_ID -> 'SHWKHSKWHKHKWSW', env.AWS_SECRET_ACCESS_KEY -> 'dbwjdejewgdewdjjgjewdgewdg'
defaultCfg.env({ inclAccessCreds:true }).then(env => console.log(env)) 

// EXAMPLE 07: Same as #06, but with a custom credentials file.
defaultCfg.env({ inclAccessCreds:true, awsCreds:'../path-to-other-creds/other-creds-file' }).then(env => console.log(env)) 
```

## Setting up environment variables

This is the original purpose of this package. This section contains some context in the [Why is it important?](#why-is-it-important) section. If you're already aware of the running a Lambda locally, you can jump to the [Setting things up](#setting-things-up) section.

### Why is it important?

To use the nodeJS AWS SDK (e.g., using it to read or write to a DynamoDB), it must be configured with the access key and access secret or with an IAM policy. The easiest way to perform this is to explicitly set it up in your code:

```js
const AWS = require('aws-sdk')
AWS.config = new AWS.Config({ accessKeyId:'WHIWHHIHH', secretAccessKey: 'debwjkdbewkjbdkjedbk', region:'ap-southeast-2' })

const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
```

This code makes it straightforward to test locally. However, the above approach is not recommended, as it explicitly exposes the access key and secret. A nefarious conributor could use those credentials to exploit your system.

The recommended approach is to configure an IAM policy in the `iamRoleStatements` property of the `provider` section in the `serverless.yml`. Once this is done, the AWS SDK does not require explicit access key and secret, as those are safely set up as environment variables on your Lambda at deployment time. You can then simply use this instead:

```js
const AWS = require('aws-sdk')

const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
```

And yet, this creates another issue: How do you test this code locally? The answer to this question is easy to understand, but annoying to implement, and that where this package comes into play. To make the above code work locally, the following environment variables must be set up:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION

The first two variables are located under the `~/.aws/credentials` file while the third one is under the `~/.aws/config`. You could manually set those variables in a start script in your package.json as follow:

```js
"scripts": {
	"start": "AWS_ACCESS_KEY_ID=******* AWS_SECRET_ACCESS_KEY=********** AWS_REGION=ap-southeast-2 node index.js"
}
```

However, this is far from being flexible. Besides, there might be more environment variables to set up based on your `serverless.yml` file (which could also define a specific `provider.profile` value influencing the value of the access key and secret). Ideally, those variables are automatically set up based on the correct selected stage of the `serverless.yml` file. That's exactly what this package offers.

### Setting things up

> PREREQUISITE: The following assumes that you have a `~/.aws/credentials` and a `~/.aws/config` file properly configured (i.e., the profile defined in the `serverless.yml` under the `provider.profile` property exists).

To set up all the environment variables in your local environment, add a script in your package.json similar to this:

```js
"scripts": {
	"dev": "node -r sls-config-parser/setenv index.js --inclcreds --stage dev"
}
```

> To know more about this script's API, please refer to the [`sls-config-parser/setenv` API](#sls-config-parsersetenv-api) section of the [Annexes](#annexes).

Unfortunately, [you have to rewrite how you `require('aws-sdk')`](#you-should-probably-rewrite-how-you-requireaws-sdk) in your code.

Instead of doing this:

```js
const AWS = require('aws-sdk')
const db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
```

Do this:

```js
let _db
const getDB = () => {
	if (!db) {
		const AWS = require('aws-sdk')
		_db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
	}
	return _db
}
```

To know more about this gotchas, please refer to [You should probably rewrite how you `require('aws-sdk')`](#you-should-probably-rewrite-how-you-requireaws-sdk) section of the [Gotchas](#gotchas).

To run your Lambda locally, just run:

```
npm run dev
```

# Gotchas
## You should probably rewrite how you `require('aws-sdk')`

When `node -r sls-config-parser/setenv index.js --inclcreds --stage prod` is executed, it asynchronously sets up the environment variables (what `-r sls-config-parser/setenv` simply means require the module `sls-config-parser/setenv.js`). This means that the other modules required in the `index.js` might load before environment variables are set. This means that this snippet could faild to load the AWS credentials:

```js
const AWS = require('aws-sdk')
const db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
```

To fix this, you should lazy load your code so that the first set up happens only when the server has been long running and all the variables have been set up:

```js
let _db
const getDB = () => {
	if (!db) {
		const AWS = require('aws-sdk')
		_db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
	}
	return _db
}
```

If putting the `const AWS = require('aws-sdk')` inside that function is an issue, you can also do this:

```js
const AWS = require('aws-sdk')

let _db
const getDB = () => {
	if (!db) {
		AWS.config = new AWS.Config({ 
			accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
			region: process.env.AWS_REGION
		})
		_db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
	}
	return _db
}
```

Finally, if you want to make sure the enviroment variables have been set up before configuring the SDK, you could also add a check:


```js
const AWS = require('aws-sdk')

let _db
const getDB = () => {
	if (!db) {
		if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION)
			throw new Error(`AWS credentials have not been set.`)
		
		AWS.config = new AWS.Config({ 
			accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
			region: process.env.AWS_REGION
		})
		_db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'})
	}
	return _db
}
```

# Annexes
## `sls-config-parser/setenv` API

```js
"scripts": {
	"dev": "node -r sls-config-parser/setenv index.js --inclcreds --stage dev"
}
```

The `-r` options means _require_. This requires the JS file located under the path `sls-config-parser/setenv.js`. This file executes a function which takes the options `--inclcreds` and `--stage dev` and sets up the environment variables defined in the `serverless.yml` and in the `~/.aws/credentials` and a `~/.aws/config` files. Once this is done, the `index.js` file is executed. 

The options for the `sls-config-parser/setenv.js` function are:
- __`--inclcreds`__: If specified, this means the environment variables defined in the `~/.aws/credentials` file and in the `~/.aws/config` file must be set up. Otherwise, only the variables of the `serverless.yml` are included.
- __`--stage <stage-name>`__: Defines which stage must be used in the `serverless.yml`.
- __`--path <path-value>`__: Specifies another location for the `serverless.yml`.


# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:
#### GraphQL
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-authorize*__](https://github.com/nicolasdao/graphql-authorize.git): Authorization middleware for [graphql-serverless](https://github.com/nicolasdao/graphql-serverless). Add inline authorization straight into your GraphQl schema to restrict access to certain fields based on your user's rights.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### Authentication & Authorization
* [__*userin*__](https://github.com/nicolasdao/userin): UserIn let's App engineers to implement custom login/register feature using Identity Providers (IdPs) such as Facebook, Google, Github. 

#### General Purposes
* [__*core-async*__](https://github.com/nicolasdao/core-async): JS implementation of the Clojure core.async library aimed at implementing CSP (Concurrent Sequential Process) programming style. Designed to be used with the npm package 'co'.
* [__*jwt-pwd*__](https://github.com/nicolasdao/jwt-pwd): Tiny encryption helper to manage JWT tokens and encrypt and validate passwords using methods such as md5, sha1, sha256, sha512, ripemd160.

#### Google Cloud Platform
* [__*google-cloud-bucket*__](https://github.com/nicolasdao/google-cloud-bucket): Nodejs package to manage Google Cloud Buckets and perform CRUD operations against them.
* [__*google-cloud-bigquery*__](https://github.com/nicolasdao/google-cloud-bigquery): Nodejs package to manage Google Cloud BigQuery datasets, and tables and perform CRUD operations against them.
* [__*google-cloud-tasks*__](https://github.com/nicolasdao/google-cloud-tasks): Nodejs package to push tasks to Google Cloud Tasks. Include pushing batches.

# License
Copyright (c) 2017-2019, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>
