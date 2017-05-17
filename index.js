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
      log.debug('use', { count: count }, duration + 'ms')
    })

    hook.on('unhandled', function (eventName, data) {
      log.error('No listeners for ' + eventName)
    })

    hook.on('DOMContentLoaded', function (time) {
      if (!time) return log.info('DOMContentLoaded')
      var level = time < 1000 ? 'info' : 'warn'
      log[level]('DOMContentLoaded', time + 'ms')
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
      self._emitRender()
    } else if (eventName === 'DOMContentLoaded') {
      self._emitLoaded()
    } else if (!/^log:\w{4,5}/.test(eventName)) {
      self._emitEvent(eventName, data)
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
}

ChooApm.prototype._log = function (level) {
  var key = 'log:' + level
  var self = this

  this.emitter.on(key, function (message, data) {
    var listener = self.listeners[key]
    if (listener) {
      var args = []
      for (var i = 0, len = arguments.length; i < len; i++) args.push(arguments[i])
      listener.apply(listener, args)
    }
    clearEmitterTimings(level)
  })

  function clearEmitterTimings (level) {
    var retries = 0
    if (self.hasPerformance) ric(clear)

    function clear () {
      var regex = new RegExp('^choo:emit/log:' + level)
      var timing = findTiming(regex)
      if ((timing.entryType !== 'measure' || !timing) && retries++ < 5) {
        ric(clear)
      } else {
        clearTiming(findTiming(regex))
      }
    }
  }
}

// compute and log time till interactive when DOMContentLoaded event fires
ChooApm.prototype._emitLoaded = function () {
  var self = this
  ric(function clear () {
    var listener = self.listeners['DOMContentLoaded']
    if (self.hasPerformance) {
      var timing = window.performance.timing
      var time = timing.domInteractive - timing.navigationStart
      if (listener) listener(time, timing)

      // log out .use() counts
      var uses = findTimings(/choo\/use /)
      var duration = sumDurations(uses)
      var usesListener = self.listeners['use']
      if (usesListener) usesListener(uses.length, duration)

      // clear out the "start" timing & friends
      var count = 0
      ric(clear)
    } else {
      listener()
    }

    function clear () {
      var domTiming = findTiming(/^choo:emit\/DOMContentLoaded/)
      var morphTiming = findTiming(/^choo\/render:morph/)
      var emitTiming = findTiming(/^choo:emit\/render /)

      if ((!domTiming || !morphTiming || !emitTiming) && count++ < 5) {
        return ric(clear)
      }

      uses.forEach(clearTiming)

      clearTiming(domTiming)
      clearTiming(morphTiming)
      clearTiming(emitTiming)
      clearTiming(findTiming(/^choo\/render /))
      clearTiming(findTiming(/^choo\/route/))
    }
  })
}

ChooApm.prototype._emitRender = function () {
  var self = this

  var listener = self.listeners['render']
  if (!listener) return

  ric(function () {
    var count = 0
    if (self.hasPerformance) ric(log)
    else listener()

    function log () {
      var logTiming = findTiming(/^choo:emit\/render /)
      var renderTiming = findTiming(/^choo\/render /)
      var createTiming = findTiming(/^choo\/route/)
      var morphTiming = findTiming(/^choo\/render:morph/)

      if ((!logTiming || !renderTiming || !createTiming || !morphTiming) && count++ < 5) {
        return ric(log)
      }

      listener(renderTiming, createTiming, morphTiming)

      clearTiming(logTiming)
      clearTiming(renderTiming)
      clearTiming(createTiming)
      clearTiming(morphTiming)
    }
  }, { timeout: 1000 })
}

ChooApm.prototype._emitEvent = function (eventName, data) {
  var self = this
  var retries = 0
  var listener = self.listeners['event']
  ric(clear)

  function clear () {
    var timing = findTiming(new RegExp('choo:emit/' + eventName))
    if ((timing.entryType === 'measure' && timing)) {
      clearTiming(timing)
      if (listener) listener(eventName, data, timing)
    } else if (retries++ < 5) {
      ric(clear)
    } else {
      if (listener) listener(eventName, data)
    }
  }
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
  if (timing) window.performance.clearMeasures(timing.name)
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
