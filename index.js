// const padRight = require('pad-right')
const padLeft = require('pad-left')

module.exports = chooLog

// colors from http://clrs.cc/
const colors = {
  green: '#2ECC40',
  red: '#FF4136',
  blue: '#7FDBFF',
  lightGray: '#DDDDDD',
  gray: '#AAAAAA',
  default: '#293037'
}

// Development logger for choo
// null -> obj
function chooLog () {
  const startTime = Date.now()

  return {
    onAction: onAction,
    onError: onError,
    onStateChange: onStateChange
  }

  // handle onAction() calls
  // (obj, obj, str, str, fn) -> null
  function onAction (data, state, name, caller, createSend) {
    const line = []
    colorify('lightGray', renderTime(startTime), line)
    colorify('gray', renderType('Action:'), line)
    append(`${caller} -> ${name}`, line)

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
    const line = []
    colorify('lightGray', renderTime(startTime), line)
    colorify('red', renderType('Error:'), line)
    append(err.message, line)

    if (console.groupCollapsed) {
      logGroup(line)
      logInner(err)
      console.groupEnd()
    } else {
      log(line)
      logInner(err)
    }

    function logInner (err) {
      console.error(err)
    }
  }

  // handle onStateChange() calls
  // (obj, obj, obj, fn) -> null
  function onStateChange (data, state, prev, createSend) {
    const line = []
    colorify('lightGray', renderTime(startTime), line)
    colorify('gray', renderType('State:'), line)

    if (console.groupCollapsed) {
      logGroup(line)
      logInner(prev, state)
      console.groupEnd()
    } else {
      log(line)
      logInner(prev, state)
    }

    function logInner (prev, state) {
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
// (str, str, [str, ...str]) -> [str, str]
function colorify (color, line, prev) {
  if (prev) {
    if (!prev[0]) prev[0] = ''
    prev[0] = prev[0] += ' %c' + line + ' '
    prev.push('color: ' + colors[color])
    return prev
  } else {
    return [ '%c' + line + ' ', 'color: ' + colors[color] ]
  }
}

// append to line without colorizing
// (str, [str, ...str]) -> [str, str]
function append (line, prev) {
  prev[0] = prev[0] += ' %c' + line + ' '
  prev.push('color: ' + colors.default)
  return prev
}

// render the time
// num -> null
function renderTime (startTime) {
  var offset = String(Math.round((Date.now() - startTime) / 1000) % 10000)
  var msg = '[' + padLeft(offset, 4, '0') + ']'
  return msg
}
