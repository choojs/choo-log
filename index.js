const padRight = require('pad-right')
const padLeft = require('pad-left')

module.exports = chooLog

// colors from http://clrs.cc/
const GREEN = '#2ECC40'
const RED = '#FF4136'
const BLUE = '#7FDBFF'
const GRAY = '#AAAAAA'

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
    const line = []
      .concat(colorify('gray', renderType('Action:')))
      .concat(' ' + `${caller} -> ${name}`)

    if (console.groupCollapsed) {
      logGroup(line)
      logInner(data)
      console.groupEnd()
    } else {
      log(line)
      logInner(data)
    }

    function logInner (action) {
      console.log('action:', data)
    }
  }

  // handle onError() calls
  // (str, obj, fn) -> null
  function onError (err, state, createSend) {
    var line = []
      .concat(colorify('red', renderType('Error:')))
      .concat(' ' + err.message)

    if (console.groupCollapsed) {
      logGroup(line)
      console.error(err)
      console.groupEnd()
    } else {
      log(line)
      console.error(err)
    }
  }

  // handle onStateChange() calls
  // (obj, obj, obj, fn) -> null
  function onStateChange (data, state, prev, createSend) {
    const line = []
      .concat(colorify('gray', renderType('State:')))

    if (console.groupCollapsed) {
      logGroup(line)
      console.log('state', state)
      console.log('prev', prev)
      console.groupEnd()
    } else {
      log(line)
      console.log('prev', prev)
      console.log('state', state)
    }
  }
}

// create a collapsedGroup log from an array
// str -> [str, str]
function logGroup (line) {
  console.groupCollapsed.apply(console, line)
}

// create a console log from an array
// str -> [str, str]
function log (line) {
  console.log.apply(console, line)
}

// indent message types
// str -> str
function renderType (msg) {
  return padLeft(msg, 7, ' ')
}

// toHtml + chalk
// (str, str) -> str
function colorify (color, line) {
  if (color === 'red') {
    return [
      '%c ' + line + ' ',
      'color: ' + RED
    ]
  } else if (color === 'blue') {
    return [
      '%c ' + line + ' ',
      'color: ' + BLUE
    ]
  } else if (color === 'green') {
    return [
      '%c ' + line + ' ',
      'color: ' + GREEN
    ]
  } else if (color === 'gray') {
    return [
      '%c ' + line + ' ',
      'color: ' + GRAY
    ]
  }
}
