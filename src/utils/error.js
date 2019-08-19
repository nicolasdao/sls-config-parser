/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { validate } = require('./core')

const throwError = (message, extraData) => {
	extraData = extraData || {}
	if (!extraData || typeof(extraData) != 'object' || Object.keys(extraData).length == 0)
		throw new Error(message || '')

	let e = new Error(message || '')
	Object.assign(e, extraData)
	throw e
}

const throwIfInvalidEmail = (email, valueName, extraData) => {
	if (!validate.email(email))
		throwError(`Invalid email${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return email
}

const throwIfInvalidURL = (url, valueName, extraData) => {
	if (!validate.url(url))
		throwError(`Invalid URL${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return url
}

const throwIfUndefined = (value, valueName, extraData) => {
	if (value === undefined)
		throwError(`Missing required argument${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return value
}

const throwIfNotTruthy = (value, valueName, extraData) => {
	if (!value)
		throwError(`Missing required argument${valueName ? ` '${valueName}'` : ''}.`, extraData)
	return value
}

const throwIfNotNumber = (value, valueName, extraData) => {
	const t = typeof(value)
	if (t != 'number')
		throwError(`Wrong argument exception. ${valueName ? ` '${valueName}'` : 'The value'} must be a number (current: ${t}).`, extraData)
	return value
}

// e.g., throwIfWrongValue(type, 'type', ['YEAR', 'MONTH'])
const throwIfWrongValue = (value, valueName, validValues, extraData) => {
	if (!value)
		throwError('Failed to test value against a list of valid value. No value was passed.', extraData)
	if (!valueName)
		throwError('Failed to test value against a list of valid value. Missing second argument \'valueName\'.', extraData)
	if (typeof(valueName) != 'string')
		throwError('Failed to test value against a list of valid value. Wrong argument exception. The second argument \'valueName\' must be a string.', extraData)
	if (!validValues)
		throwError('Failed to test value against a list of valid value. Missing third required argument \'validValues\'.', extraData)

	const valid = Array.isArray(validValues) ? validValues.some(v => v == value) : value == validValues
	if (valid)
		return value
	else
		throwError(`Value for variable '${valueName}' is invalid. Valid values are ${validValues} (current: ${value}).`, extraData)
}

const throwIfNoMatch = (value, valueName, regex, extraData) => {
	if (!value)
		throwError('Failed to test value against a regex. No value was passed.', extraData)
	if (!valueName)
		throwError('Failed to test value against a regex. Missing second argument \'valueName\'.', extraData)
	if (typeof(valueName) != 'string')
		throwError('Failed to test value against a regex. Wrong argument exception. The second argument \'valueName\' must be a string.', extraData)
	if (!regex)
		throwError('Failed to test value against a regex. Missing third required argument \'regex\'.', extraData)
	if (!(regex instanceof RegExp))
		throwError('Failed to test value against a regex. Third required argument \'regex\' is not a RegExp.', extraData)

	const valid = regex.test(value)
	if (valid)
		return value
	else
		throwError(`Value for variable '${valueName}' is invalid. It does not match regex ${regex}.`, extraData)
}

// e.g., throwIfGreaterThan(startDate, endDate, 'startDate', 'endDate')
const throwIfGreaterThan = (value1, value2, valueName1, valueName2, extraData) => {
	if (!value1)
		throwError('Failed to compare value1 with value2. No value1 was passed.', extraData)
	if (!value2)
		throwError('Failed to compare value1 with value2. No value2 was passed.', extraData)

	const valid = value1 <= value2
	if (valid)
		return [value1, value2]
	else {
		if (valueName1 && valueName2)
			throwError(`'${valueName1}' must be smaller or equal to '${valueName2}' (current: ${value1}(${valueName1}) > ${value2}(${valueName2})).`, extraData)
		else
			throwError(`'value1' must be smaller or equal to 'value2' (current: ${value1}(value1) > ${value2}(value2)).`, extraData)
	}
}

// e.g., throwIfNotBetween(age, 'age', [18, 65])
const throwIfNotBetween = (value, valueName, validValues, extraData) => {
	if (!value)
		throwError('Failed to test value against a list of valid value. No value was passed.', extraData)
	if (!valueName)
		throwError('Failed to test value against a list of valid value. Missing second argument \'valueName\'.', extraData)
	if (typeof(valueName) != 'string')
		throwError('Failed to test value against a list of valid value. Wrong argument exception. The second argument \'valueName\' must be a string.', extraData)
	if (!validValues)
		throwError('Failed to test value against a list of valid value. Missing third required argument \'validValues\'.', extraData)
	if (validValues.length != 2)
		throwError('Failed to test value against a list of valid value. 3rd argument \'validValues\' must be an array with 2 values.', extraData)
	if (validValues[0] > validValues[1])
		throwError('Failed to test value against a list of valid value. 1st element of the \'validValues\' array must be smaller or equal to the 2nd element.', extraData)

	const valid = validValues[0] <= value && value <= validValues[1]
	if (valid)
		return value
	else
		throwError(`Value for variable '${valueName}' is invalid. ${value} is not between ${validValues[0]} and ${validValues[1]}`, extraData)
}

module.exports = {
	throwError,
	throwIfUndefined,
	throwIfNotTruthy,
	throwIfNotNumber,
	throwIfWrongValue,
	throwIfNoMatch,
	throwIfGreaterThan,
	throwIfNotBetween,
	throwIfInvalidURL,
	throwIfInvalidEmail
}

