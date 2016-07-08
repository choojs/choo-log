const deepDiff = require('deep-diff')
const padRight = require('pad-right')
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

const paddings = {
  type: 7,
  actionType: 7
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
  function onAction (data, state, name, trace, createSend) {
    const split = trace.split(':')
    const actionType = split[0].trim()
    const caller = split[1].trim()

    const line = []
    colorify('lightGray', renderTime(startTime) + ' ', line)
    colorify('gray', renderType('action') + ' ', line)
    colorify('gray', renderActionType(actionType) + ' ', line)

    colorify('default', "'" + caller + "'", line)
    colorify('default', '->', line)
    colorify('default', "'" + name + "'", line)

    if (console.groupCollapsed) {
      logGroup(line)
      logInner(name, data)
      console.groupEnd()
    } else {
      log(line)
      logInner(name, data)
    }

    function logInner (name, action) {
      console.log('action name:', name)
      console.log('data:', data)
    }
  }

  // handle onError() calls
  // (str, obj, fn) -> null
  function onError (err, state, createSend) {
    const line = []
    colorify('lightGray', renderTime(startTime) + ' ', line)
    colorify('red', renderType('error') + ' ', line)
    colorify('default', err.message + ' ', line)

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
    const diff = deepDiff(prev, state)
    const inlineText = (diff.length === 1) ? 'diff' : 'diffs'

    const line = []
    colorify('lightGray', renderTime(startTime) + ' ', line)
    colorify('gray', renderType('state') + ' ', line)
    colorify('default', diff.length + ' ' + inlineText, line)

    if (console.groupCollapsed) {
      logGroup(line)
      logInner(prev, state)
      console.groupEnd()
    } else {
      log(line)
      logInner(prev, state)
    }

    function logInner (prev, state) {
      console.log('prev ', prev)
      console.log('state', state)
      console.log('diff ', diff)
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
  const leftPad = paddings.type
  const rightPad = paddings.actionType + leftPad + 2
  return (msg === 'state' || msg === 'error')
    ? padRight(padLeft(msg, leftPad, ' '), rightPad, ' ')
    : padLeft(msg, leftPad, ' ')
}

// indent action types
// str -> str
function renderActionType (msg) {
  const padding = paddings.actionType
  if (msg === 'subscription') msg = 'subs'
  return padRight(msg, padding, ' ')
}

// toHtml + chalk
// (str, str, [str, ...str]) -> [str, str]
function colorify (color, line, prev) {
  if (prev) {
    if (!prev[0]) prev[0] = ''
    prev[0] = prev[0] += ' %c' + line
    prev.push('color: ' + colors[color])
    return prev
  } else {
    return [ '%c' + line, 'color: ' + colors[color] ]
  }
}

// render the time
// num -> null
function renderTime (startTime) {
  var offset = String(Math.round((Date.now() - startTime) / 1000) % 10000)
  var msg = '[' + padLeft(offset, 4, '0') + ']'
  return msg
}
