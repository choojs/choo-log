# choo-log [![stability][0]][1] [![choo peer dependency][13]][14]
[![npm version][2]][3] [![build status][4]][5] [![test coverage][6]][7]
[![downloads][8]][9] [![js-standard-style][10]][11]

Development logger for [choo][12].

![screen capture](./screen.gif)

## Usage
```js
const log = require('choo-log')
const choo = require('choo')

const app = choo()
app.use(log())

const tree = app.start()
document.body.appendChild(tree)
```

And to optimize for production using
[envify](https://github.com/hughsk/envify):
```js
const choo = require('choo')

const app = choo()

// this block of code will be eliminated by any minification if
// NODE_ENV is set to "production"
if (process.env.NODE_ENV !== 'production') {
  const log = require('choo-log')
  app.use(log())
}
```

## API
### logger = chooLog()
Create a new logger instance. Listens to:
- `onAction()`: show the values inside of new `actions`
- `onError()`: display errors
- `onStateChange()`: show current state and previous state

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
