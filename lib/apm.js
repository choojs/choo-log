var assert = require('assert')

module.exports = ChooApm

function ChooApm (emitter) {
  if (!(this instanceof ChooApm)) return new ChooApm(emitter)

  assert.equal(typeof emitter, 'object')

  this.hasWindow = typeof window !== 'undefined'
  this.hasIdleCallback = this.hasWindow && window.requestIdleCallback
  this.hasPerformance = this.hasWindow && window.performance && window.performance.getEntriesByName

  this.emitter = emitter
  this.buffer = { use: [], render: [] }
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

  // TODO also handle log events
  this.emitter.on('trace', function (timing) {
    var data = timing.__data
    var eventName = timing.name
    if (/choo\.morph/.test(eventName)) {
      self.buffer.render.push(timing)
    } else if (/choo\.route/.test(eventName)) {
      self.buffer.render.push(timing)
    } else if (/choo\.render/.test(eventName)) {
      self.buffer.render.push(timing)
    } else if (/choo\.use/.test(eventName)) {
      self.buffer.use.push(timing)
    } else if (eventName === 'DOMContentLoaded') {
      clearTiming(timing)
    } else if (/^log:\w{4,5}/.test(eventName)) {
      clearTiming(timing)
    } else {
      console.log('ev ev')
      var eventListener = self.listeners['event']
      if (eventListener) eventListener(eventName, timing, data)
      clearTiming(timing)
    }

    if (self.buffer.render.length === 3) {
      var renderListener = self.listeners['render']
      if (!renderListener) return
      var timings = {}
      while (self.buffer.render.length) {
        var _timing = self.buffer.render.pop()
        var name = _timing.name
        if (/choo\.render/.test(name)) timings.render = _timing
        else if (/choo\.morph/.test(name)) timings.morph = _timing
        else timings.route = _timing
      }
      renderListener(timings)
      clearTiming(timings.render)
      clearTiming(timings.morph)
      clearTiming(timings.route)
    }
  })

  // check if there's timings without any listeners
  // and trigger the DOMContentLoaded event
  this.emitter.on('*', function (eventName, data) {
    var logLevel = /^log:(\w{4,5})/.exec(eventName)
    if (eventName === 'DOMContentLoaded') {
      self._emitLoaded()
    } else if (logLevel) {
      var logListener = self.listeners['log:' + logLevel[1]]
      if (logListener) logListener(eventName, data)
    } else if (!self.emitter.listeners(eventName).length) {
      var unhandledListener = self.listeners['unhandled']
      if (unhandledListener) unhandledListener(eventName, data)
    }
  })
}

// compute and log time till interactive when DOMContentLoaded event fires
ChooApm.prototype._emitLoaded = function () {
  var self = this
  ric(function clear () {
    var listener = self.listeners['DOMContentLoaded']
    var usesListener = self.listeners['use']

    if (self.hasPerformance) {
      var timing = window.performance.timing

      if (listener) {
        listener({
          interactive: timing.domInteractive - timing.navigationStart,
          loaded: timing.domContentLoadedEventEnd - timing.navigationStart
        })
      }

      var duration = sumDurations(self.buffer.use)
      if (usesListener) usesListener(self.buffer.use.length, duration)
    } else {
      listener()
      usesListener()
    }
  })
}

function ric (cb, opts) {
  if (this.hasIdleCallback) window.requestIdleCallback(cb, opts)
  else setTimeout(cb, 0)
}

function clearTiming (timing) {
  if (timing) window.performance.clearMeasures(timing.name)
}

function sumDurations (timings) {
  return timings.reduce(function (sum, timing) {
    return sum + timing.duration
  }, 0).toFixed()
}
