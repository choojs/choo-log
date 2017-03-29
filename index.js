var nanologger = require('nanologger')

module.exports = logger

function logger (opts) {
  opts = opts || {}

  var hasPerformance = typeof window !== 'undefined' && window.performance
  var clear = opts.clearResourceTimings === undefined ? true : opts.clearResourceTimings
  var timing = opts.timing === undefined ? true : opts.timing

  if (hasPerformance && clear) {
    window.performance.onresourcetimingbufferfull = function () {
      window.performance.clearResourceTimings()
    }
  }

  return function (state, bus) {
    var log = nanologger('choo')

    bus.on('*', function (eventName, data) {
      if (hasPerformance && timing && eventName === 'render') {
        window.requestAnimationFrame(function () {
          var entries = window.performance.getEntriesByName('choo:render')
          var index = entries.length - 1
          var entry = entries[index]
          var duration = entry.duration.toFixed()
          var fps = Math.min((1000 / duration).toFixed(), 60)
          var details = fps + 'fps ' + duration + 'ms'
          if (fps === 60) log.info('render', details)
          else log.warn('render', details)
        })
      } else if (!/^log:\w{4,5}/.test(eventName)) {
        log.info(eventName, data)
      }

      var listeners = bus.listeners(eventName)
      if (eventName === 'pushState') return
      if (eventName === 'DOMContentLoaded') return
      if (!listeners.length) {
        log.error('No listeners for ' + eventName)
      }
    })

    bus.on('log:debug', function (message, data) {
      log.debug(message, data)
    })

    bus.on('log:info', function (message, data) {
      log.info(message, data)
    })

    bus.on('log:warn', function (message, data) {
      log.warn(message, data)
    })

    bus.on('log:error', function (message, data) {
      log.error(message, data)
    })

    bus.on('log:fatal', function (message, data) {
      log.fatal(message, data)
    })
  }
}
