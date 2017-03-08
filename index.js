var nanologger = require('nanologger')

module.exports = logger

function logger () {
  return function (state, bus) {
    var log = nanologger('choo')

    bus.on('*', function (eventName, data) {
      if (!/^log:\w{4,5}/.test(eventName)) {
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
