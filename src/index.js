'use strict';
const mysqlLazyRest = require('./mlr')

function lazyRest (
  connectionString = { host: '', user: '', password: '', database: '' }
) {
  this.globalVariables = {
    hidenTables: [],
    connectionString: connectionString,
    modelsTables: []
  }
}

/*
This are the public methods
*/
lazyRest.prototype.run = function (
  config = { port: '', app: '', prefix: '', lifetime: '' }
) {
  try {
    new mysqlLazyRest.mlr(config, this.globalVariables)
  } catch (e) {
    console.log(e.message)
  }
}

lazyRest.prototype.hide = function (hidenTables) {
  this.globalVariables.hidenTables = hidenTables
};

lazyRest.prototype.models = function (modelsTables) {
  this.globalVariables.modelsTables = modelsTables
};

module.exports = {
  lazyRest: lazyRest,
  CREATE: mysqlLazyRest.CREATE,
  READ: mysqlLazyRest.READ,
  UPDATE: mysqlLazyRest.UPDATE,
  DELETE: mysqlLazyRest.DELETE,
  ALL: mysqlLazyRest.ALL
}
