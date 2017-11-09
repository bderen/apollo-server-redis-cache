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
import express from 'express';
import bodyParser from 'body-parser';
import graphqlExpressRedis from 'apollo-server-redis-cache';

const schema = /* your schema */
const PORT = 3000;

const app = express();

app.use('/graphql', bodyParser.json(), graphqlExpressRedis({ schema: myGraphQLSchema }));

app.listen(PORT);
```