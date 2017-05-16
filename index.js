var nanologger = require('nanologger')
var nanotiming = require('nanotiming')
var assert = require('assert')

module.exports = logger

function logger (opts) {
  opts = opts || {}

  return function (state, emitter) {
    var hook = ChooApm('choo-log', emitter)
    var log = nanologger('choo')

    hook.on('event', function (eventName, data, timing) {
    })

    hook.on('DOMContentLoaded', function (time) {
      var level = time < 1000 ? 'info' : 'warn'
      log[level]('DOMContentLoaded', time + 'ms')
    })

    hook.on('render', function (data, timing) {
    })

    hook.on('log:debug', function (message, data) {
      log.debug(message, data)
    })

    hook.on('log:info', function (message, data) {
      log.info(message, data)
    })

    hook.on('log:warn', function (message, data) {
      log.warn(message, data)
    })

    hook.on('log:error', function (message, data) {
      log.error(message, data)
    })

    hook.on('log:fatal', function (message, data) {
      log.fatal(message, data)
    })
  }
}

// TODO: keep a cursor for trace events so that whenever an event is
// received the curr counter is upped, then progress the cursor when
// requestIdleCallback fires
function ChooApm (name, emitter) {
  if (!(this instanceof ChooApm)) return new ChooApm(name, emitter)

  assert.equal(typeof name, 'string')
  assert.equal(typeof emitter, 'object')

  this.hasWindow = typeof window !== 'undefined'
  this.hasIdleCallback = this.hasWindow && window.requestIdleCallback
  this.hasPerformance = this.hasWindow && window.performance && window.performance.getEntriesByName

  this.timing = nanotiming('choo-log')
  this.emitter = emitter
  this.listeners = {}
  this.cursors = {}
}

ChooApm.prototype.on = function (name, handler) {
  this.listeners[name] = handler
}

ChooApm.prototype.start = function (name) {
  this.emitter.on('*', function (eventName, data) {
    var uuid = this.timing.start('all')

    if (this.hasPerformance && this.timingEnabled && eventName === 'render') {
      this._renderPerformance()
    } else if (eventName === 'DOMContentLoaded') {
      this._renderDomStart()
    } else if (!/^log:\w{4,5}/.test(eventName)) {
      this._renderEvent(eventName, data)
    }

    var listeners = this.emitter.listeners(eventName)
    if (eventName !== 'pushState' &&
      eventName !== 'DOMContentLoaded' &&
      !listeners.length) {
      log.error('No listeners for ' + eventName)
    }

    this.timing.end(uuid, 'all')
  })
}

// compute and log time till interactive when DOMContentLoaded event fires
ChooApm.prototype._domStart = function () {
  var timing = window.performance.timing
  var time = timing.domInteractive - timing.navigationStart
  var listener = this.listeners['DOMContentLoaded']
  if (listener) listener(time)
}

ChooApm.prototype._renderPerformance = function () {
  window.requestIdleCallback(function () {
    var entries = window.performance.getEntriesByName('choo/render')
    var index = entries.length - 1
    if (index < 0) return log.info('render')
    var entry = entries[index]
    var duration = entry.duration.toFixed()
    // each frame has 10ms available for userland stuff
    var fps = Math.min((600 / duration).toFixed(), 60)
    var details = fps + 'fps ' + duration + 'ms'
    if (fps === 60) log.info('render', details)
    else log.warn('render', details)
  }, { timeout: 1000 })
}

ChooApm.prototype._renderEvent = function (eventName, data) {
  window.requestIdleCallback(function () {
    var name = 'choo:emit/' + eventName
    var entries = window.performance.getEntriesByName(name)

    var index = entries.length - 1
    if (index < 0) return log.info('render')
    var entry = entries[index]
    var duration = entry.duration.toFixed()
    var level = duration < 50 ? 'info' : 'warn'

    if (data) log[level](eventName, data, duration + 'ms')
    else log[level](eventName, duration + 'ms')
  }, { timeout: 1000 })
}

ChooApm.prototype._ric = function (cb, opts) {
  if (this.hasIdleCallback) window.requestIdleCallback(cb, opts)
  else setTimeout(cb, 0)
}
