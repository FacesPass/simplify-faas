//缓存实例，实际开发的话可以用Redis，这种方法用于扩展我们的FaaS的能力
// const redis = require('redis')

const cache = {}

function get(key) {
  return cache[key]
}

function set(key, value) {
  cache[key] = value
}

module.exports = {
  get,
  set
}