var assert = require('assert')

module.exports = ChooInstrument

function ChooInstrument (emitter) {
  if (!(this instanceof ChooInstrument)) return new ChooInstrument(emitter)

  assert.equal(typeof emitter, 'object')

  this.hasWindow = typeof window !== 'undefined'
  this.hasIdleCallback = this.hasWindow && window.requestIdleCallback
  this.hasPerformance = this.hasWindow && window.performance && window.performance.getEntriesByName

  this.emitter = emitter
  this.buffer = { use: [], render: [] }
  this.listeners = {}
}

ChooInstrument.prototype.on = function (name, handler) {
  this.listeners[name] = handler
}

ChooInstrument.prototype.start = function () {
  var self = this
  if (this.hasPerformance) {
    window.performance.onresourcetimingbufferfull = function () {
      var listener = self.listeners['resource-timing-buffer-full']
      if (listener) listener()
    }
  }

  // TODO also handle log events
  this.emitter.on('trace', function (timing) {
    if (!timing) return

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
    } else if (!/choo\.emit\('trace'\)/.test(eventName)) {
      var eventListener = self.listeners['event']
      var timingName = timing.__name
      if (timingName && eventListener &&
        timingName !== 'DOMContentLoaded' &&
        timingName !== 'render' &&
        !/^log:\w{4,5}/.test(timingName)) {
        eventListener(timingName, data, timing)
      }
      clearTiming(timing)
    } else {
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

  // Check if there's timings without any listeners
  // and trigger the DOMContentLoaded event.
  // If the timing API is not available, we handle all events here
  this.emitter.on('*', function (eventName, data) {
    var logLevel = /^log:(\w{4,5})/.exec(eventName)
    if (!self.hasPerformance && eventName === 'render') {
      var renderListener = self.listeners['render']
      if (renderListener) renderListener()
    } else if (eventName === 'DOMContentLoaded') {
      self._emitLoaded()
    } else if (logLevel) {
      var logListener = self.listeners['log:' + logLevel[1]]
      if (logListener) logListener(eventName, data)
    } else if (!self.emitter.listeners(eventName).length) {
      var unhandledListener = self.listeners['unhandled']
      if (unhandledListener) unhandledListener(eventName, data)
    } else if (!self.hasPerformance && eventName !== 'trace') {
      var eventListener = self.listeners['event']
      if (eventListener) eventListener(eventName, data)
    }
  })
}

// compute and log time till interactive when DOMContentLoaded event fires
ChooInstrument.prototype._emitLoaded = function () {
  var self = this
  ric(function clear () {
    var listener = self.listeners['DOMContentLoaded']
    var usesListener = self.listeners['use']

    var timing = self.hasWindow && window.performance && window.performance.timing

    if (listener && timing) {
      listener({
        interactive: timing.domInteractive - timing.navigationStart,
        loaded: timing.domContentLoadedEventEnd - timing.navigationStart
      })
    }

    if (self.hasPerformance) {
      var duration = sumDurations(self.buffer.use)
      if (usesListener) usesListener(self.buffer.use.length, duration)
      self.buffer.use.forEach(clearTiming)
    } else {
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
