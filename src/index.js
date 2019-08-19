const co = require('co')
const YAML = require('yamljs')
const { file:fileHelp } = require('./utils')

const _parse = (str, ymlPath) => {
	try {
		return YAML.parse(str)
	} catch(err) {
		throw new Error(`Failed to parse YAML file ${ymlPath}. ${err.stack || err.message}`)
	}
}

const parse = (ymlPath, options) => co(function *() {
	const fileExists = yield fileHelp.exists(ymlPath)
	if (!fileExists)
		throw new Error(`YAML file ${ymlPath} not found.`)

	const ymlContent = yield fileHelp.read(ymlPath)
	if (!ymlContent || !ymlContent.length)
		throw new Error(`YAML file ${ymlPath} is empty.`)
	
	const config = _parse(ymlContent.toString(), ymlPath)

	return config
}).catch(err => {
	throw new Error(err.stack)
})

module.exports = {
	parse
}