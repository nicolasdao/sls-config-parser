/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { obj: { merge }, identity, math } = require('./core')

const TIMEOUT = 'RJDtm78=_timeout'

/**
 * Create an empty promise that returns after a certain delay
 * @param  {Number|[Number]} timeout 	If array, it must contain 2 numbers representing an interval used to select a random number
 * @return {[type]}         			[description]
 */
const delay = timeout => Promise.resolve(null).then(() => {
	let t = timeout || 100
	if (Array.isArray(timeout)) {
		if (timeout.length != 2)
			throw new Error('Wrong argument exception. When \'timeout\' is an array, it must contain exactly 2 number items.')

		const start = timeout[0] * 1
		const end = timeout[1] * 1

		if (isNaN(start))
			throw new Error(`Wrong argument exception. The first item of the 'timeout' array is not a number (current: ${timeout[0]})`)

		if (isNaN(end))
			throw new Error(`Wrong argument exception. The second item of the 'timeout' array is not a number (current: ${timeout[1]})`)

		if (start > end)
			throw new Error(`Wrong argument exception. The first number of the 'timeout' array must be strictly smaller than the second number (current: [${timeout[0]}, ${timeout[1]}])`)			

		t = math.randomNumber(start, end)
	}
	return new Promise(onSuccess => setTimeout(onSuccess, t))
})

const wait = (stopWaiting, options) => Promise.resolve(null).then(() => {
	const now = Date.now()
	const { timeout=300000, start=now, interval=2000 } = options || {}
	
	if ((now - start) > timeout)
		throw new Error('timeout')
	
	return Promise.resolve(null).then(() => stopWaiting()).then(stop => {
		if (stop)
			return
		else
			return delay(interval).then(() => wait(stopWaiting, { timeout, start, interval }))
	})
})

/**
 * Add 3 new functions on a promise. Each one return a boolean:
 * 	1. isFulfilled()
 * 	2. isPending()
 * 	3. isRejected()
 * 	
 * @param  {Promise} promise Original promise
 * @return {Promise}         Same promise as the input, augmented with 3 new functions
 */
const makePromiseQueryable = promise => {
	// Don't modify any promise that has been already modified.
	if (promise.isResolved) return promise

	// Set initial state
	let isPending = true
	let isRejected = false
	let isFulfilled = false

	// Observe the promise, saving the fulfillment in a closure scope.
	let result = promise.then(
		v => {
			isFulfilled = true
			isPending = false
			return v
		}, 
		e => {
			isRejected = true
			isPending = false
			throw e
		}
	)

	result.isFulfilled = () => isFulfilled
	result.isPending = () => isPending
	result.isRejected = () => isRejected
	return result
}

/**
 * Makes a promise throw an error if it times our
 * @param  {Promise} p       	Original promise
 * @param  {Number} timeOut 	Optional. Default is 30,000 milliseconds
 * @return {Promise}         	[description]
 */
const addTimeout = (p, timeOut=30000) => {
	const timeoutMsg = `timout_${identity.new()}`
	const timeoutTask = new Promise(onSuccess => setTimeout(() => onSuccess(timeoutMsg), timeOut))
	return Promise.race([timeoutTask, p])
		.then(res => {
			if (res == timeoutMsg)
				throw new Error('timeout')
			return res
		})
}

/**
 * Retries failed functions max 5 times by default, using an increasing time period after each retry (starting at 5 sec. by default). 
 * 
 * @param  {Function} fn        		Parameterless function that must be retried if something goes wrong.
 * @param  {Function} retryOnSuccess 	Optional, default () => false. (res, options) => Returns a boolean or a Promise returning a boolean. The boolean 
 *                                 		determines if the response is value (false) or if we need to proceed to a retry (true). 
 * @param  {Function} retryOnFailure 	Optional, default () => true. (error, options) => Returns a boolean or a Promise returning a boolean. The boolean 
 *                                  	determines if the error leads to a retry (true) or if the error should interrupt the 'retry' function and make it fail (true).
 * @param  {Boolean}  toggle   			Optional, default true. When set to false, the 'retry' is not toggled.
 * @param  {Number}   retryAttempts   	Optional, default: 5. Number of retry
 * @param  {Number}   attemptsCount   	Read only. Current retry count. When that counter reaches the 'retryAttempts', the function stops. This might be a usefull piece of
 *                                     	information for the 'retryOnSuccess' and 'retryOnFailure'.
 * @param  {Number}   timeout   		Optional, default null. If specified, 'retryAttempts' and 'attemptsCount' are ignored
 * @param  {Number}   retryInterval   	Optional, default: 5000. Time interval in milliseconds between each retry. It can also be a 2 items array.
 *                                    	In that case, the retryInterval is a random number between the 2 ranges (e.g., [10, 100] => 54).
 *                                     	The retry strategy increases the 'retryInterval' by a factor 1.5 after each failed attempt.
 * @param  {Boolean}  ignoreError   	Optional, default false. Only meaninfull when 'retryOnSuccess' is explicitly set. If set to true, the 'retry' 
 *                                   	function returns the 'fn''s output instead of throwing an exception when the last attempt to execute 'retryOnSuccess'
 *                                   	fails.
 * @param  {String}   errorMsg   		Optional, default `${retryAttempts} attempts to retry the procedure failed to pass the test.`. Customize the exception message in case of failure.
 * @return {Promise}             		Promise that return whatever is returned by 'fn'
 * @catch  {String}   err.message
 * @catch  {String}   err.stack
 * @catch  {Object}   err.data.data		In case of timeout, the data is what was last returned by 'fn'
 * @catch  {Object}   err.data.error	In case of timeout, the data is what was last returned by 'fn'
 */
const retry = ({ fn, retryOnSuccess, retryOnFailure, toggle, retryAttempts, retryInterval, attemptsCount, timeout, ignoreError, errorMsg, ignoreTimout }) => { 
	toggle = toggle === undefined ? true : toggle
	retryOnSuccess = retryOnSuccess || (() => false)
	retryOnFailure = !toggle ? (() => false) : (retryOnFailure || (() => true))
	const options = { toggle, retryAttempts, retryInterval, attemptsCount, timeout, ignoreError, errorMsg  }
	const explicitretryOnSuccess = !retryOnSuccess
	const mainPromise = Promise.resolve(null)
		.then(() => fn()).then(data => ({ error: null, data }))
		.catch(error => ({ error, data: null }))
		.then(({ error, data }) => Promise.resolve(null)
			.then(() => {
				if (error && retryOnFailure)
					return retryOnFailure(error, options)
				else if (error)
					throw error 
				else
					return !retryOnSuccess(data, options)
			})
			.then(passed => {
				if (!error && passed)
					return data
				else if ((!error && !passed) || (error && passed)) {
					let { retryAttempts=5, retryInterval=5000, attemptsCount=0 } = options
					const delayFactor = (attemptsCount+1) <= 1 ? 1 : Math.pow(1.5, attemptsCount)

					const i = Array.isArray(retryInterval) && retryInterval.length > 1
						? (() => {
							if (typeof(retryInterval[0]) != 'number' || typeof(retryInterval[1]) != 'number')
								throw new Error(`Wrong argument exception. When 'options.retryInterval' is an array, all elements must be numbers. Current: [${retryInterval.join(', ')}].`)
							if (retryInterval[0] > retryInterval[1])
								throw new Error(`Wrong argument exception. When 'options.retryInterval' is an array, the first element must be strictly greater than the second. Current: [${retryInterval.join(', ')}].`)

							return math.randomNumber(retryInterval[0], retryInterval[1])
						})()
						: retryInterval

					const delayMs = Math.round(delayFactor*i)

					if (attemptsCount < retryAttempts) 
						return delay(delayMs).then(() => retry(merge(options, { fn, retryOnSuccess, retryOnFailure, attemptsCount:attemptsCount+1, ignoreTimout:true })))
					else if (explicitretryOnSuccess && options.ignoreError)
						return data
					else {
						let e = new Error(options.errorMsg ? options.errorMsg : `${retryAttempts} attempt${retryAttempts > 1 ? 's' : ''} to retry the procedure failed to pass the test.`)
						e.data = {
							data,
							error
						}
						throw e
					}
				} else 
					throw error
			})
		)

	return (timeout > 0 && !ignoreTimout ? Promise.race([delay(timeout).then(() => TIMEOUT), mainPromise]) : mainPromise).then(data => {
		if (data === TIMEOUT)
			throw new Error('Retry method timeout.')
		return data
	})
}

const runOnce = (fn) => {
	let _fn
	return (...args) => {
		if (!_fn)
			_fn = Promise.resolve(null).then(() => fn(...args))
		return _fn
	}
}

const DEFAULT_RETURN_TIMEOUT = 60*1000 	// 1 minute
const DEFAULT_EXEC_TIMEOUT = 300*1000 	// 5 minutes
let _execTracker = {}
/**
 * Memory leaks free background execution promises. Make a promise return in any cases after a 
 * 'timeout.return' period. If the promise is resolved before that 'timeout.return' period, then 
 * nothing out of the ordinary happens. If the execution goes over the 'timeout.return' period, 
 * then it carries on in the background. In any cases, the process will be garbage collected.
 * 
 * @param  {Function}   execFn  					[description]
 * @param  {Number}		options.return.timeout
 * @param  {Number}		options.exec.timeout
 * @param  {Function}	options.exec.onTimeout
 * 
 * @return {String}		results.status 				Values: 'COMPLETED', 'PENDING', 'TIMEOUT'
 * @return {Object}		results.data 				Value returned by 'execFn'
 */
const persistExecution = (execFn,options) => Promise.resolve(null).then(() => {
	if (!execFn)
		throw new Error('Missing required \'promise\'')

	if (typeof(execFn) != 'function')
		throw new Error('Bad argument execption. The input must be a function')

	const { return:r, exec:e } = options || {}
	const { timeout:returnTimeout=DEFAULT_RETURN_TIMEOUT } = r || {}
	const { timeout:execTimeout=DEFAULT_EXEC_TIMEOUT, onTimeout } = e || {}

	if (typeof(returnTimeout) != 'number')
		throw new Error('Bad argument execption. The \'options.return.timeout\' is not a number')

	if (typeof(execTimeout) != 'number')
		throw new Error('Bad argument execption. The \'options.exec.timeout\' is not a number')

	if (onTimeout && typeof(onTimeout) != 'function')
		throw new Error('Bad argument execption. The \'options.exec.onTimeout\' is not a function')			

	const pId = identity.new({ long:true })
	const execFnId = `exec-${pId}`
	_execTracker[execFnId] = execFn()
	_execTracker[pId] = Promise.race([delay(execTimeout).then(() => 'execution timeout'), Promise.resolve(null).then(() => _execTracker[execFnId])])
		
	return Promise.race([
		delay(returnTimeout).then(() => ({ status: 'PENDING', data: null })), 
		Promise.resolve(null)
			.then(() => _execTracker[pId])
			.then(res => {
				_execTracker[execFnId] = null
				_execTracker[pId] = null
				const status = res == 'execution timeout' ? 'TIMEOUT' : 'COMPLETED'
				const next = onTimeout && status == 'TIMEOUT'
					? Promise.resolve(null).then(() => onTimeout())
					: Promise.resolve(null)

				return next.then(() => ({ status, data: res }))
			})
			.catch(err => {
				_execTracker[execFnId] = null
				_execTracker[pId] = null
				throw err
			})
	])
})

module.exports = {
	delay,
	wait,
	retry,
	makePromiseQueryable,
	addTimeout,
	runOnce,
	persistExecution
}
