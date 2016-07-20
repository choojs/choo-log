const html = require('choo/html')
const assert = require('assert')
const chooLog = require('./')
const choo = require('choo')

const logger = chooLog()
const app = choo({
  onAction: logger.onAction,
  onError: logger.onError,
  onStateChange: logger.onStateChange
})

app.model({
  state: {
    count: 0
  },
  subscriptions: {
    start: (send, done) => {
      send('updateState', () => {
        send('updateState', () => {
          send('error', (err) => {
            if (err) done(err)
          })
        })
      })
    }
  },
  reducers: {
    increment: (data, state) => {
      assert.equal(typeof data, 'number', 'reducer:increment: data should be a number')
      return { count: state.count + data }
    },
    nothing: (data, state) => state
  },
  effects: {
    error: (data, state, send, done) => {
      const err = new Error('omg, this is broken')
      done(err)
    },
    updateState: (data, state, send, done) => {
      send('increment', state.count + 1, done)
    },
    doNothing: (data, state, send, done) => {
      send('nothing', state.count, done)
    }
  }
})

app.router((route) => [ route('/', mainView) ])

const tree = app.start()
document.body.appendChild(tree)

function mainView (state, prev, send) {
  return html`
    <section>
      <button onclick=${() => send('error')}>Send error</button>
      <button onclick=${() => send('updateState')}>Send random</button>
      <button onclick=${() => send('doNothing')}>Send nothing</button>
    </section>
  `
}
