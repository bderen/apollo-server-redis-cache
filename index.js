const _Cache = require('ioredis')
const _hashSum = require('hash-sum')
const _package = require('./package.json')
const parseCacheControl = require('parse-cache-control')

class CacheKey {
  constructor(obj) {
    this.obj = obj ? obj : {}
  }
  get cacheKey() {
    const key = this.obj.key + ':' +
           _package.structureVersion + ':' +
           (this.obj.queryOperationName ? this.obj.queryOperationName + ':' : '') +
           this.obj.queryHash
    return key
  }
}

function hasCacheControlHeaders(headers, attrib) {
  let result = false;
  if (headers && headers['cache-control']) {
    let cacheControl = parseCacheControl(headers['cache-control'])
    if (cacheControl && cacheControl[attrib]) {
      result = true;
    }
  }
  return result;
}

module.exports = class ApolloServerRedisCache {
  constructor(options = { cache: true, key: 'asrc', ttl: 900, stale: 60 , prefix: 'apollo:cache'}) {
    this.options = options
    this.client = options.cache ? new _Cache({ enableOfflineQueue: false }) : null
    if (options.prefix) this.debug = require('yves').debugger(options.prefix);
  }

  middleware() {
    return (req, res, next) => {
      if (!this.options.cache) {
        return next()
      }

      if (!res.use_redis_cache) {
        return next()
      }

      let queryOperationName;
      let queryHash;
      if (req.method === 'POST' && Array.isArray(req.body)) {
        /**
         * POST batch query
         */
        const names = req.body.filter(q => q.operationName).map(q => q.operationName)
        queryOperationName = names && names.length ? names.join(',') : null
        queryHash = _hashSum(queryOperationName + JSON.stringify(req.body))
      } else if (req.method === 'POST' && req.body && req.body.operationName) {
        /**
         * POST single query
         */

        queryOperationName = req.body.operationName
        queryHash = _hashSum(queryOperationName + JSON.stringify(req.body))
      } else if (req.method === 'POST' && req.body && !req.body.operationName) {
        /**
         * POST query without operationName (it is possible and we need to cache them)
         */
        queryOperationName = 'unknown'
        queryHash = _hashSum(queryOperationName + JSON.stringify(req.body))
      } else if (req.query && req.query.operationName) {
        /**
         * GET query
         */
        queryOperationName = req.query.operationName
        queryHash = _hashSum(queryOperationName + JSON.stringify(req.query))
      } else if (req.query.query && !req.query.operationName) {
        /**
         * GET query without operationName (it is possible and we need to cache them)
         */
        queryOperationName = 'unknown'
        queryHash = _hashSum(queryOperationName + JSON.stringify(req.query))
      } else {
        /**
         * Unknown query, I give up
         */
        queryOperationName = null
        queryHash = null
      }

      if (!queryOperationName || !queryHash) {
        /**
         * Just skip if we don't know which query or operationName
         */
        return next()
      }

      const cacheKey = new CacheKey({
        key: this.options.key,
        queryOperationName,
        queryHash,
      }).cacheKey

      const _write = res.write.bind(res);

      if (hasCacheControlHeaders(req.headers, 'refresh')) {
        if (this.debug) this.debug('refresh %y',cacheKey)
        this.client.del(cacheKey)
      }

      this.client.hgetall(cacheKey, (err, result) => {
        if ( result && result.body && result.body.length ) {
          const now = +new Date()
          const created = result.created
          const stale = result.stale * 1000
          const expired = ( now - created ) > stale

          if ( expired ) {
            const entry = {
              body: result.body,
              stale: result.stale,
              created: +new Date(),
            }
            this.client.hmset(cacheKey, entry)
            if (this.options.httpHeader) {
              res.setHeader(`${this.options.httpHeader}`, 'MISS')
            }
            if (this.debug) this.debug('miss %y',cacheKey)
            return next()
          } else {
            if (this.options.httpHeader) {
              res.setHeader(`${this.options.httpHeader}`, 'HIT')
            }
            res.setHeader('Content-Type', 'application/json');
            _write(result.body);
            res.end();
            if (this.debug) this.debug('hit %y',cacheKey)
            return
          }
        } else {
          if (this.options.httpHeader) {
            res.setHeader(`${this.options.httpHeader}`, 'MISS')
          }
          if (this.debug) this.debug('miss %y',cacheKey)
          return next()
        }
      });

      res.write = (body) => {
        if ( typeof body !== 'string' ) {
          _write(body);
          res.end();
          return
        }

        if (body.includes('errors')) {
          _write(body);
          res.end();
          return
        }

        const entry = {
          body: body,
          stale: this.options.stale,
          created: +new Date(),
        }

        if (!hasCacheControlHeaders(req.headers, 'no-cache')) {
          if (this.debug) this.debug('store %y',cacheKey)
          this.client.hmset(cacheKey, entry);
          this.client.expire(cacheKey, this.options.ttl);
        }

        _write(body);
        res.end();
        return
      }
    }
  }
}