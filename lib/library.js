(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("library", [], factory);
	else if(typeof exports === 'object')
		exports["library"] = factory();
	else
		root["library"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ioredis = __webpack_require__(1);

var _ioredis2 = _interopRequireDefault(_ioredis);

var _hashSum2 = __webpack_require__(2);

var _hashSum3 = _interopRequireDefault(_hashSum2);

var _package2 = __webpack_require__(3);

var _package = _interopRequireWildcard(_package2);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
  function _class() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { cache: true, key: 'asrc', ttl: 60 };

    _classCallCheck(this, _class);

    this.options = options;
    this.client = new _ioredis2.default({ enableOfflineQueue: false });
  }

  _createClass(_class, [{
    key: 'middleware',
    value: function middleware() {
      var _this = this,
          _arguments = arguments;

      return function (req, res, next) {
        if (!_this.options.cache) {
          return next();
        }

        if (!res.use_redis_cache) {
          return next();
        }

        var options = _arguments;

        var binary = false;
        if (_typeof(options[0]) === 'object' && typeof options[0].binary === 'boolean') {
          binary = options[0].binary;
        }

        var _write = res.write.bind(res);

        var requestGetQuery = req.query.query && req.query.query ? ':' + (0, _hashSum3.default)(req.query.query) : '';

        var queryOperationName = req.body && req.body.operationName ? ':' + req.body.operationName : 'batch';
        var queryHash = req.body && req.body ? requestGetQuery + ':' + (0, _hashSum3.default)(req.body) : '';
        var packageVersion = ':' + _package.version;
        var cacheKey = _this.options.key + packageVersion + queryOperationName + queryHash;

        _this.client.get(cacheKey, function (err, result) {
          if (result && result.length) {
            if (_this.options.httpHeader) {
              res.setHeader('' + _this.options.httpHeader, 'HIT');
            }
            if (binary) {
              //Convert back to binary buffer
              _write(new Buffer(result, 'base64'));
              res.end();
            } else {
              _write(result);
              res.end();
            }
          } else {
            if (_this.options.httpHeader) {
              res.setHeader('' + _this.options.httpHeader, 'MISS');
            }
            return next();
          }
        });

        res.write = function (body) {
          /** convert binary to base64 string **/
          if (binary && typeof body !== 'string') {
            body = new Buffer(body).toString('base64');
          }

          if (typeof body !== 'string') {
            _write(body);
            res.end();
          }

          _this.client.set(cacheKey, body, 'EX', _this.options.ttl);

          _write(body);
          res.end();
        };
      };
    }
  }]);

  return _class;
}();

exports.default = _class;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("ioredis");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("hash-sum");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = {"name":"apollo-server-redis-cache","version":"0.0.11","description":"Apollo GraphQL server redis cache middleware","main":"lib/library.min.js","scripts":{"build":"webpack --env build"},"author":{"name":"B. Deren","email":"deren.bogdan@gmail.com"},"license":"MIT","repository":{"type":"git","url":"https://github.com/sgtram/apollo-server-redis-cache"},"keywords":["GraphQL","Apollo","Server","Express","Redis","Cache"],"dependencies":{"hash-sum":"^1.0.2","ioredis":"^3.2.1"},"devDependencies":{"babel-cli":"^6.26.0","babel-eslint":"^8.0.2","babel-loader":"^7.1.2","babel-preset-env":"^1.6.1","eslint":"^4.11.0","eslint-loader":"^1.9.0","webpack":"^3.8.1","webpack-node-externals":"^1.6.0"}}

/***/ })
/******/ ]);
});
//# sourceMappingURL=library.js.map