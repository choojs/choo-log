var nanologger = require('nanologger')
var assert = require('assert')

module.exports = logger

function logger (opts) {
  opts = opts || {}

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
      log.debug('use', 'count=' + count, duration + 'ms')
    })

    hook.on('unhandled', function (eventName, data) {
      log.error('No listeners for ' + eventName)
    })

    hook.on('DOMContentLoaded', function (time) {
      if (!time) return log.info('DOMContentLoaded')
      var level = time < 1000 ? 'info' : 'warn'
      log[level]('DOMContentLoaded', time + 'ms')
    })

    hook.on('render', function (timing) {
      if (!timing) return log.info('render')
      var duration = timing.duration.toFixed()

      // each frame has 10ms available for userland stuff
      var fps = Math.min((600 / duration).toFixed(), 60)
      var details = fps + 'fps ' + duration + 'ms'

      if (fps === 60) log.info('render', details)
      else log.warn('render', details)
    })

    hook.on('resource-timing-buffer-full', function () {
      log.error("The browser's Resource Resource timing buffer is full. Cannot store any more timing information")
    })

    hook.start()
  }
}

function ChooApm (emitter) {
  if (!(this instanceof ChooApm)) return new ChooApm(emitter)

  assert.equal(typeof emitter, 'object')

  this.hasWindow = typeof window !== 'undefined'
  this.hasIdleCallback = this.hasWindow && window.requestIdleCallback
  this.hasPerformance = this.hasWindow && window.performance && window.performance.getEntriesByName

  this.emitter = emitter
  this.listeners = {}
}

ChooApm.prototype.on = function (name, handler) {
  this.listeners[name] = handler
}

ChooApm.prototype.start = function () {
  var self = this

  if (this.hasPerformance) {
    window.performance.onresourcetimingbufferfull = function () {
      var listener = self.listeners['resource-timing-buffer-full']
      if (listener) listener()
    }
  }

  this.emitter.on('*', function (eventName, data) {
    if (eventName === 'render') {
      console.log('emitting renderrr')
      self._emitRender()
    } else if (eventName === 'DOMContentLoaded') {
      self._emitLoaded()
      clearEmitterTimings(eventName)
    } else if (!/^log:\w{4,5}/.test(eventName)) {
      self._emitEvent(eventName, data)
      clearEmitterTimings(eventName)
    } else if (!self.emitter.listeners(eventName).length) {
      var listener = self.listeners['unhandled']
      if (listener) listener(eventName, data)
    }
  })

  this._log('debug')
  this._log('info')
  this._log('warn')
  this._log('error')
  this._log('fatal')

  // clears timings sent from choo:emit. Double nested idle call is to ensure
  // it runs _after_ we're done measuring
  function clearEmitterTimings (eventName) {
    if (self.hasPerformance) {
      ric(function () {
        ric(function () {
          var regex = new RegExp('^choo:emit/' + eventName)
          clearTiming(findTiming(regex))
        })
      })
    }
  }
}

ChooApm.prototype._log = function (level) {
  level = 'log:' + level
  var self = this

  this.emitter.on(level, function (message, data) {
    var listener = self.listeners[level]
    if (listener) {
      var args = []
      for (var i = 0, len = arguments.length; i < len; i++) args.push(arguments[i])
      listener.apply(listener, args)
    }
  })
}

// compute and log time till interactive when DOMContentLoaded event fires
ChooApm.prototype._emitLoaded = function () {
  var self = this
  ric(function () {
    var listener = self.listeners['DOMContentLoaded']
    if (self.hasPerformance) {
      var timing = window.performance.timing
      var time = timing.domInteractive - timing.navigationStart
      if (listener) listener(time, timing)

      // clear out the "start" timing
      clearTiming(findTiming(/^choo\/start/))

      // log out .use() counts
      var uses = findTimings(/choo\/use/)
      var duration = sumDurations(uses)
      var usesListener = self.listeners['use']
      if (usesListener) usesListener(uses.length, duration)
      uses.forEach(clearTiming)
    } else {
      listener()
    }
  })
}

ChooApm.prototype._emitRender = function () {
  var self = this
  ric(function () {
    var entries = window.performance.getEntriesByName('choo/render')
    var timing = entries[entries.length - 1]
    var listener = self.listeners['render']
    if (listener) listener(timing)

    if (self.hasPerformance) {
      console.log('hoiiooi')
      clearTiming(findTiming(/^choo\/render /))
      clearTiming(findTiming(/^choo\/render:morph/))
      clearTiming(findTiming(/^choo\/route/))
    }
  }, { timeout: 1000 })
}

ChooApm.prototype._emitEvent = function (eventName, data) {
  var self = this
  ric(function () {
    var name = 'choo:emit/' + eventName
    var entries = window.performance.getEntriesByName(name)

    var timing = entries[entries.length - 1]
    var listener = self.listeners['event']
    if (listener) listener(eventName, data, timing)
  }, { timeout: 1000 })
}

function ric (cb, opts) {
  if (this.hasIdleCallback) window.requestIdleCallback(cb, opts)
  else setTimeout(cb, 0)
}

function find (arr, filter) {
  for (var i = 0, len = arr.length; i < len; i++) {
    var el = arr[i]
    var ok = filter(el)
    if (ok) return el
  }
}

function clearTiming (timing) {
  console.log('clearing timing', timing.name)
  window.performance.clearMeasures(timing.name)
}

function findTiming (regex) {
  var timings = window.performance.getEntries()
  var timing = find(timings, function (timing) {
    return regex.test(timing.name)
  })
  return timing
}

function findTimings (regex) {
  var timings = window.performance.getEntries()
  return timings.filter(function (timing) {
    return regex.test(timing.name)
  })
}

function sumDurations (timings) {
  return timings.reduce(function (sum, timing) {
    return sum + timing.duration
  }, 0).toFixed()
}
