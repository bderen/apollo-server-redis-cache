import _Cache from 'ioredis'
import _hashSum from 'hash-sum'
import * as _package from './package.json'

export default class {
  constructor(options = { cache: true, key: 'asrc', ttl: 60 }) {
    this.options = options
    this.client = new _Cache({ enableOfflineQueue: false })
  }

  middleware() {
    return (req, res, next) => {
      
      if (!this.options.cache) {
        return next()
      }
      
      const options = arguments;

      let binary = false;
      if ( typeof options[0] === 'object' && typeof options[0].binary === 'boolean' ) {
        binary = options[0].binary;
      }

      const _write = res.write.bind(res);

      const queryOperationName = req.body && req.body.operationName ? ':' + req.body.operationName : ''
      const queryVariables = req.body && req.body.variables ? ':' + _hashSum(req.body.variables) : ''
      const packageVersion = ':' + _package.version
      const cacheKey = this.options.key + packageVersion + queryOperationName + queryVariables
      
      this.client.get(cacheKey, (err, result) => {
        if ( result && result.length ) {
          if(binary) { //Convert back to binary buffer
            _write(new Buffer(result, 'base64'));
            res.end();
          } else {
            _write(result);
            res.end();
          }
        } else {
          return next()
        }
      });
      
      res.write = (body) => {
        /** convert binary to base64 string **/
        if(binary && typeof body !== 'string'){
          body = new Buffer(body).toString('base64');
        }
        
        if ( typeof body !== 'string' ) {
          _write(body);
          res.end();
        }

        this.client.set(cacheKey, body, 'EX', this.options.ttl);

        _write(body);
        res.end();
      }
    }
  }
}