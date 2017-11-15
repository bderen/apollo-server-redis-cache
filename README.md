# apollo-server-redis-cache

## Installation

```
$ npm install apollo-server-redis-cache
```

## Usage

Start redis server
```
$ redis-server
```

```javascript
import express from 'express'
import { graphqlExpress } from 'apollo-server-express'
import apolloServerRedisCache from 'apollo-server-redis-cache'

const _schema = /* your schema */
const PORT = 3000;

const app = express();

const redisCache = new apolloServerRedisCache({ cache: true, key: 'asrc', ttl: 60, httpHeader: 'X-My-Cache' });

app.use(
  '/graphql',
  bodyParser.json(),
  (req, res, next) => {
    res.use_redis_cache = req.cookies[USER_TOKEN] ? false : true;
    next();
  },
  redisCache.middleware(),
  graphqlExpress({ schema: _schema })
);

app.listen(PORT);
```