const test = require('tape')
const chooLog = require('./')

test('should assert input types', function (t) {
  t.plan(1)
  t.throws(chooLog)
})
