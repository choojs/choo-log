var nanologger = require('nanologger')
var assert = require('assert')

var ChooInstrument = require('./lib/instrument')

module.exports = logger

function logger (opts) {
  opts = opts || {}
  var initialRender = true

  assert.equal(typeof opts, 'object', 'choo-log: opts should be type object')

  return function (state, emitter) {
    var hook = ChooInstrument(emitter)
    var log = nanologger('choo')

    hook.on('log:debug', log.debug.bind(log))
    hook.on('log:info', log.info.bind(log))
    hook.on('log:warn', log.warn.bind(log))
    hook.on('log:error', log.error.bind(log))
    hook.on('log:fatal', log.fatal.bind(log))

    hook.on('event', function (eventName, data, timing) {
      if (timing) {
        var duration = timing.duration.toFixed()
        var level = duration < 50 ? 'info' : 'warn'
        if (data !== undefined) log[level](eventName, data, duration + 'ms')
        else log[level](eventName, duration + 'ms')
      } else {
        if (data !== undefined) log.info(eventName, data)
        else log.info(eventName)
      }
    })

    hook.on('use', function (count, duration) {
      log.debug('use', { count: count }, duration + 'ms')
    })

    hook.on('unhandled', function (eventName, data) {
      log.error('No listeners for ' + eventName)
    })

    hook.on('DOMContentLoaded', function (timing) {
      if (!timing) return log.info('DOMContentLoaded')
      var level = timing.interactive < 1000 ? 'info' : 'warn'
      log[level]('DOMContentLoaded', timing.interactive + 'ms to interactive')
    })

    hook.on('render', function (timings) {
      if (!timings) return log.info('render')
      var duration = timings.render.duration.toFixed()
      var msg = 'render'

      if (initialRender) {
        initialRender = false
        msg = 'initial ' + msg
      }

      // each frame has 10ms available for userland stuff
      var fps = Math.min((600 / duration).toFixed(), 60)

      if (fps === 60) {
        log.info(msg, fps + 'fps', duration + 'ms')
      } else {
        log.warn(msg, fps + 'fps', duration + 'ms', {
          render: timings.render.duration.toFixed() + 'ms',
          morph: timings.morph.duration.toFixed() + 'ms'
        })
      }
    })

    hook.on('resource-timing-buffer-full', function () {
      log.error("The browser's Resource Resource timing buffer is full. Cannot store any more timing information")
    })

    hook.start()
  }
}
