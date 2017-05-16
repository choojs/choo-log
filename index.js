var nanologger = require('nanologger')
var nanotiming = require('nanotiming')

module.exports = logger

function logger (opts) {
  opts = opts || {}

  var timing = nanotiming('choo-log')
  var hasPerformance = typeof window !== 'undefined' &&
    window.performance &&
    window.performance.getEntriesByName
  var clear = opts.clearResourceTimings === undefined ? true : opts.clearResourceTimings
  var timingEnabled = opts.timing === undefined ? true : opts.timing

  if (hasPerformance && clear) {
    window.performance.onresourcetimingbufferfull = function () {
      window.performance.clearResourceTimings()
    }
  }

  return function (state, bus) {
    var log = nanologger('choo')

    bus.on('*', function (eventName, data) {
      var uuid = timing.start('all')

      if (hasPerformance && timingEnabled && eventName === 'render') {
        window.requestAnimationFrame(renderPerformance)
      } else if (eventName === 'DOMContentLoaded') {
        renderDomStart()
      } else if (!/^log:\w{4,5}/.test(eventName)) {
        log.info(eventName, data)
      }

      var listeners = bus.listeners(eventName)
      if (eventName !== 'pushState' &&
        eventName !== 'DOMContentLoaded' &&
        !listeners.length) {
        log.error('No listeners for ' + eventName)
      }

      timing.end(uuid, 'all')
    })

    bus.on('log:debug', function (message, data) {
      var uuid = timing.start('debug')
      log.debug(message, data)
      timing.end(uuid, 'debug')
    })

    bus.on('log:info', function (message, data) {
      var uuid = timing.start('info')
      log.info(message, data)
      timing.end(uuid, 'info')
    })

    bus.on('log:warn', function (message, data) {
      var uuid = timing.start('warn')
      log.warn(message, data)
      timing.end(uuid, 'warn')
    })

    bus.on('log:error', function (message, data) {
      var uuid = timing.start('error')
      log.error(message, data)
      timing.end(uuid, 'error')
    })

    bus.on('log:fatal', function (message, data) {
      var uuid = timing.start('fatal')
      log.fatal(message, data)
      timing.end(uuid, 'fatal')
    })

    function renderPerformance () {
      var entries = window.performance.getEntriesByName('choo:render')
      var index = entries.length - 1
      if (index < 0) return log.info('render')
      var entry = entries[index]
      var duration = entry.duration.toFixed()
      // each frame has 10ms available for userland stuff
      var fps = Math.min((600 / duration).toFixed(), 60)
      var details = fps + 'fps ' + duration + 'ms'
      if (fps === 60) log.info('render', details)
      else log.warn('render', details)
    }

    // compute and log time till interactive when DOMContentLoaded event fires
    function renderDomStart () {
      var timing = window.performance.timing
      var time = timing.domInteractive - timing.navigationStart
      var level = time < 1000 ? 'info' : 'warn'
      log[level]('DOMContentLoaded', time + 'ms')
    }
  }
}
