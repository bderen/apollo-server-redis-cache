import _Cache from 'ioredis'
import _hashSum from 'hash-sum'
import * as _package from './package.json'

class CacheKey {
  constructor(obj) {
    this.obj = obj ? obj : {}
  }
  get cacheKey() {
    const key = this.obj.key + ':' + 
           _package.structureVersion + ':' + 
           (this.obj.queryOperationName ? this.obj.queryOperationName + ':' : '') + 
           (this.obj.requestGetQuery ? this.obj.requestGetQuery + ':' : '') + 
           this.obj.queryHash
    return key
  }
}

export default class {
  constructor(options = { cache: true, key: 'asrc', ttl: 900, stale: 60 }) {
    this.options = options
    this.client = new _Cache({ enableOfflineQueue: false })
  }

  middleware() {
    return (req, res, next) => {
      if (!this.options.cache) {
        return next()
      }
      
      if (!res.use_redis_cache) {
        return next()
      }

      const requestGetQuery = req.query.query && req.query.query ? _hashSum(req.query.query) : null
      let queryOperationName;
      if (Array.isArray(req.body)) {
        const names = req.body.filter(q => q.operationName).map(q => q.operationName)
        queryOperationName = names && names.length ? names.join(',') : null
      } else {
        queryOperationName = req.body.operationName ? req.body.operationName : null
      }
      const queryHash = req.body && req.body ? _hashSum(req.body) : ''

      const cacheKey = new CacheKey({
        key: this.options.key,
        requestGetQuery,
        queryOperationName,
        queryHash,
      }).cacheKey

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
            this.updateCache(cacheKey, result, res, next)
          } else {
            if (this.options.httpHeader) {
              res.setHeader(`${this.options.httpHeader}`, 'HIT')
            }
            res.set('Content-Type', 'application/json');
            res.send(result.body);
            res.end();
            return
          }
        } else {
          this.updateCache(cacheKey, null, res, next)
        }
      });
    }
  }

  updateCache(cacheKey, result, res, next) {
    if (this.options.httpHeader) {
      res.setHeader(`${this.options.httpHeader}`, 'MISS')
    }

    const _write = res.write.bind(res);

    res.write = (body) => {
      if ( typeof body !== 'string' ) {
        _write(body);
        res.end();
        return;
      }

      let errors = null;

      try {
        const bodyJson = JSON.parse(body)
        errors = bodyJson && bodyJson.errors ? bodyJson.errors : null
      } catch (e) {
        console.error(e)
      }

      if (errors && result && result.body && result.body.length ) {
        _write(result.body);
        res.end();
        return;
      }

      const entry = {
        body: body,
        stale: this.options.stale,
        created: +new Date(),
      }

      this.client.hmset(cacheKey, entry, () => {
        this.client.expire(cacheKey, this.options.ttl);
      });

      _write(body);
      res.end();
      return;
    }

    return next()
  }
}