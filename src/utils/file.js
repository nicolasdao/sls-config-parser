/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const fs = require('fs')


/**
 * Checks if a file or folder exists
 * 
 * @param  {String}  filePath 	Absolute path to file or folder on the local machine
 * @return {Boolean}   
 */
const fileExists = (filePath, options) => {
	if (options && options.sync)
		return fs.existsSync(filePath)

	return new Promise(onSuccess => fs.exists(filePath, yes => onSuccess(yes ? true : false)))
}

/**
 * Gets a file under a Google Cloud Storage's 'filePath'.
 * 
 * @param  {String}  filePath 	Absolute file path on the local machine
 * @return {Buffer}
 */
const readFile = (filePath, options) => {
	if (options && options.sync)
		return fs.readFileSync(filePath)

	return new Promise((onSuccess, onFailure) => fs.readFile(filePath, (err, data) => err ? onFailure(err) : onSuccess(data)))
}

module.exports = {
	exists: fileExists,
	read: readFile
}