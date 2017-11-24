import _Cache from 'ioredis'
import _hashSum from 'hash-sum'
import * as _package from './package.json'

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

      const queryOperationName = req.body && req.body.operationName ? ':' + req.body.operationName : ''
      const queryHash = req.body && req.body ? ':' + _hashSum(req.body) : ''
      const structureVersion = ':' + _package.structureVersion
      const cacheKey = this.options.key + structureVersion + queryOperationName + queryHash

      const _write = res.write.bind(res);

      this.client.hgetall(cacheKey, (err, result) => {
        if ( result && result.body && result.body.length ) {
          const now = +new Date()
          const created = result.created
          const stale = result.stale * 1000
          const expired = ( now - created ) > stale
          
          if ( expired ) {
            let entry = {
              body: result.body,
              stale: result.stale,
              created: +new Date(),
            }
            this.client.hmset(cacheKey, entry)
            if (this.options.httpHeader) {
              res.setHeader(`${this.options.httpHeader}`, 'MISS')
            }
            entry = null;
            return next()
          } else {
            if (this.options.httpHeader) {
              res.setHeader(`${this.options.httpHeader}`, 'HIT')
            }
            res.setHeader('Content-Type', 'application/json');
            _write(result.body);
            res.end();
          }
        } else {
          if (this.options.httpHeader) {
            res.setHeader(`${this.options.httpHeader}`, 'MISS')
          }
          return next()
        }
      });

      res.write = (body) => {
        if ( typeof body !== 'string' ) {
          _write(body);
          res.end();
        }

        let entry = {
          body: body,
          stale: this.options.stale,
          created: +new Date(),
        }
  
        this.client.hmset(cacheKey, entry);
        this.client.expire(cacheKey, this.options.ttl);
        entry = null;
        _write(body);
        res.end();
      }
    }
  }
}