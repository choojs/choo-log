var nanologger = require('nanologger')
var assert = require('assert')

var ChooApm = require('./lib/apm')

module.exports = logger

function logger (opts) {
  opts = opts || {}

  assert.equal(typeof opts, 'object', 'choo-log: opts should be type object')

  return function (state, emitter) {
    var hook = ChooApm(emitter)
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
        if (data) log[level](eventName, data, duration + 'ms')
        else log[level](eventName, duration + 'ms')
      } else {
        if (data) log.info(eventName, data)
        else log.info(eventName)
      }
    })

    hook.on('use', function (count, duration) {
      log.debug('use', { count: count }, duration + 'ms')
    })

    hook.on('unhandled', function (eventName, data) {
      log.error('No listeners for ' + eventName)
    })

    hook.on('DOMContentLoaded', function (time) {
      if (!time) return log.info('DOMContentLoaded')
      var level = time.interactive < 1000 ? 'info' : 'warn'
      log[level]('DOMContentLoaded', time.interactive + 'ms to interactive')
    })

    hook.on('render', function (renderTiming, createTiming, morphTiming) {
      if (!renderTiming) return log.info('render')
      var duration = renderTiming.duration.toFixed()

      // each frame has 10ms available for userland stuff
      var fps = Math.min((600 / duration).toFixed(), 60)

      if (fps === 60) {
        log.info('render', fps + 'fps ' + duration + 'ms')
      } else {
        log.warn('render', fps + 'fps', {
          total: duration + 'ms',
          create: createTiming.duration.toFixed() + 'ms',
          morph: morphTiming.duration.toFixed() + 'ms'
        })
      }
    })

    hook.on('resource-timing-buffer-full', function () {
      log.error("The browser's Resource Resource timing buffer is full. Cannot store any more timing information")
    })

    hook.start()
  }
}
