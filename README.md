# choo-log [![stability][0]][1]
[![npm version][2]][3] [![build status][4]][5]
[![downloads][8]][9] [![js-standard-style][10]][11]

Development logger for [choo][12].

![screen capture](./screenshot.png)

## Usage
```js
var log = require('choo-log')
var choo = require('choo')

var app = choo()
app.use(log())
app.mount('body')
```

## API
### `logger = log(opts)`
Create a new logger instance. Opts can contain:
- __timing:__ defaults to `true`. Disable calls to `window.performance` timing
  API. Timing calls will not run in browsers that don't support it out of the
  box.
- __clearResourceTimings:__ defaults to `true`. Disable clearing the
  [window.performance resourcetimingbuffer][buf] when full. Set to `false` if
  the buffer is cleared somewhere else.

### `emitter.emit('log:<level>', msg)`
Send a log event. `choo-log` will pass `log:<level>` events through to [nanologger](https://github.com/yoshuawuyts/nanologger). For example:

```js
emitter.emit('log:info', 'The rain in Spain stays mainly in the plain 🌧')
```

These are just normal events, so you can listen to them in addition to them being logged:

```js
emitter.on('log:debug', msg => {
  // do something with debug message
})
```

### `localStorage.setItem('logLevel', <level>)`

Set the [nanologger log level](https://github.com/yoshuawuyts/nanologger#level--logloglevel), e.g.:

```js
localStorage.setItem('logLevel','debug')
```

## Installation
```sh
$ npm install choo-log
```

## License
[MIT](https://tldrlegal.com/license/mit-license)

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/choo-log.svg?style=flat-square
[3]: https://npmjs.org/package/choo-log
[4]: https://img.shields.io/travis/yoshuawuyts/choo-log/master.svg?style=flat-square
[5]: https://travis-ci.org/yoshuawuyts/choo-log
[6]: https://img.shields.io/codecov/c/github/yoshuawuyts/choo-log/master.svg?style=flat-square
[7]: https://codecov.io/github/yoshuawuyts/choo-log
[8]: http://img.shields.io/npm/dm/choo-log.svg?style=flat-square
[9]: https://npmjs.org/package/choo-log
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
[12]: https://github.com/yoshuawuyts/choo
[13]: https://img.shields.io/badge/built%20for%20choo-v4-ffc3e4.svg?style=flat-square
[14]: https://github.com/yoshuawuyts/choo
[buf]: https://developer.mozilla.org/en-US/docs/Web/API/Performance/onresourcetimingbufferfull
