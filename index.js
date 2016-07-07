module.exports = chooLog

// Development logger for choo
// null -> obj
function chooLog () {
  return {
    onAction: onAction,
    onError: onError,
    onStateChange: onStateChange
  }

  // handle onAction() calls
  // (obj, obj, str, str, fn) -> null
  function onAction (data, state, name, caller, createSend) {
    console.groupCollapsed(`Action: ${caller} -> ${name}`)
    console.log(data)
    console.groupEnd()
  }

  // handle onError() calls
  // (str, obj, fn) -> null
  function onError (err, state, createSend) {
    console.groupCollapsed(`Error: ${err.message}`)
    console.error(err)
    console.groupEnd()
    const send = createSend('onError: ')
    send('app:error', err)
  }

  // handle onStateChange() calls
  // (obj, obj, obj, fn) -> null
  function onStateChange (data, state, prev, createSend) {
    console.groupCollapsed('State')
    console.log(prev)
    console.log(state)
    console.groupEnd()
  }
}
