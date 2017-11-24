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

      const options = arguments;
      
      let binary = false;
      if ( typeof options[0] === 'object' && typeof options[0].binary === 'boolean' ) {
        binary = options[0].binary;
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

      queryOperationName = null;

      const _write = res.write.bind(res);

      this.client.hgetall(cacheKey, (err, result) => {
        if ( result && result.body && result.body.length ) {
          if (this.options.httpHeader) {
            res.setHeader(`${this.options.httpHeader}`, 'HIT')
          }
          res.setHeader('Content-Type', 'application/json');
          _write(result.body);
          res.end();
        } else {
          if (this.options.httpHeader) {
            res.setHeader(`${this.options.httpHeader}`, 'MISS')
          }
          return next()
        }
      });

      res.write = (body) => {
        if(binary && typeof body !== 'string'){
          body = new Buffer(body).toString('base64');
        }

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