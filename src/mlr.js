'use strict';
const Crud = require('./crud')
let express = require('express')
let bodyParser = require('body-parser')

const CREATE = 'post';
const READ = 'get';
const UPDATE = 'patch';
const DELETE = 'delete';
const ALL = 'all';

// RESPONSES
const ERROR_MSG_QUERY = '400: Could not build query. ' // 400;
const ERROR_MSG_SERVER = '502: Backend service failure.'; //502
const ERROR_MSG_NOT_FOUND = '404: This is not the page you are looking for. (Route not found)'; // 404

const RESPONSE_CODE_ERROR = 400 // BAD REQUEST
const RESPONSE_CODE_NOTFOUND_ERROR = 404 // NOT FOUND
const RESPONSE_CODE_SERVER_ERROR = 502 // server error
const RESPONSE_CODE_SUCCESS = 200 // GET, DELETE
const RESPONSE_CODE_ALTER_SUCCESS = 201 // POST, PATCH

// the project code name is mlr
function mlr(config, globalVariables) {
  const self = this
  let crud = new Crud(globalVariables)
  this.modelsTables = globalVariables.modelsTables

  // if config is not defined set the rest to empty
  if (typeof config === 'undefined') {
    config = {
      port: '',
      app: '',
      prefix: '',
      lifetime: ''
    }
  }

  this.port = typeof config.port === 'undefined' || config.port == '' ? 8080 : config.port
  this.app = typeof config.app === 'undefined' || config.app == '' ? express() : config.app
  this.prefix = typeof config.prefix === 'undefined' ? '' : config.prefix
  this.lifetime = typeof config.lifetime === 'undefined' ? '24' : config.lifetime
  this.crud = crud
  this.verbose = false;

  let maxage = this.lifetime * 60 * 60
  let cachetype = 'public, max-age=' + maxage

  if (this.lifetime == 0) {
    cachetype = 'no-cache, no-store, must-revalidate';
  }

  // send the header and cache data
  this.app.use(function (req, res, next) {
    res.setHeader('Cache-Control', cachetype)
    res.setHeader('X-Powered-By', 'lazyRest')
    next()
  })

  // we need body parser for the Create and Delete
  this.app.use(bodyParser.urlencoded({ extended: true }))

  // if the config app is not set then we can listen
  if (config.app == '' || typeof config.app === 'undefined') { this.app.listen(this.port) }

  // we obtain all the tables from the database
  // and generate all the necesary routes atumagically
  this.getTables().then(function (data) {
    // sets the route to show all the tables
    self.app.get(self.prefix + '/tables', (req, res, next) => {
      res.status(RESPONSE_CODE_SUCCESS).json(data)
    })

    // GET ALL ROUTES 
    self.app.get(self.prefix + '/routes', (req, res, next) => {
      let routeLinks = [];
      self.app._router.stack.forEach(function(r){
        if (r.route && r.route.path){
          routeLinks.push(r.route.path);
        }
      })
      res.status(RESPONSE_CODE_SUCCESS).json({routeLinks});
    })

    // SET Verbose 
    self.app.get(self.prefix + '/verbose/:status', (req, res, next) => {
      let verboseStatus = req.params.status
      self.verbose = (verboseStatus.toLowerCase() === 'true' || verboseStatus.toLowerCase() === '1') ? true : false;
      res.status(RESPONSE_CODE_SUCCESS).send('Verbose set to: ' + self.verbose)
    })

    // Generates the CRUD routes for every table
    data.forEach(function (table) {
      self.createRoutes(table)
    })

    // 404
    self.app.use(function (req, res, next) {
      res
        .status(RESPONSE_CODE_NOTFOUND_ERROR)
        .send(ERROR_MSG_NOT_FOUND)
    })
  })
}

// returns the array tablesArray with all the tables and the predifined information
mlr.prototype.getTables = function () {
  const self = this
  return new Promise(function (resolve, reject) {
    self.crud
      .SchemaTables()
      .then(results => {
        const tablesArray = []
        Object.keys(results).forEach(function (key) {
          var row = results[key]

          tablesArray.push({
            table_name: row.TABLE_NAME,
            alias: self.getAlias(row.TABLE_NAME),
            type: row.TABLE_TYPE,
            table_schema: row.TABLE_SCHEMA,
            primary_key: row.PRIMARY_KEYS,
            access: self.getAccess(row.TABLE_NAME)
          })
        })
        resolve(tablesArray)
      })
      .catch(err => reject('Error: Unable to load data: ' + err.message))
  })
};

// returns the alias of that table
mlr.prototype.getAlias = function (tableName) {
  if (typeof this.modelsTables === 'undefined') {
    return '';
  }

  const data = this.modelsTables
  let found = data.find(function (data) {
    return data.table_name === tableName
  })
  return (typeof found !== 'undefined' && typeof found.alias !== 'undefined') ? found.alias : '';
}

// returns the acces of the table, CREATE,READ,UPDATE,DELETE
mlr.prototype.getAccess = function (tableName) {
  if (typeof this.modelsTables === 'undefined') {
    return '';
  }
  const data = this.modelsTables
  let found = data.find(function (data) {
    return data.table_name === tableName
  })
  return (typeof found !== 'undefined' && typeof found.access !== 'undefined' && found != 'all') ? found.access : '';
}

// calidates that the type of route can be created depending on the table permissions
mlr.prototype.validRoute = function (table, permission) {
  const access = table.access !== '' ? table.access : 'all';

  // we can only set read permissions to views
  if (table.type.toUpperCase() === 'VIEW' && permission === READ) {
    return true
  }

  if (
    access.includes(permission) ||
    (access === ALL && table.type.toUpperCase() != 'VIEW')
  ) {
    return true
  }

  return false
};

// create the routes for all the tables
mlr.prototype.createRoutes = function (table) {
  const self = this
  let app = this.app
  let name = table.alias !== '' ? table.alias : table.table_name


  // Create / Insert route
  if (self.validRoute(table, CREATE)) {
    app.post(self.prefix + '/' + name + '/', (req, res, next) => {
      self.crud
        .Create(table, req)
        .then(function (data) {
          res.status(RESPONSE_CODE_ALTER_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })
  }

  // Read routes
  if (self.validRoute(table, READ)) {
    // Describe table
    app.get(self.prefix + '/' + name + '/describe', (req, res, next) => {
      self.crud
        .Describe(table)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Read ALL
    app.get(self.prefix + '/' + name , (req, res, next) => {
      self.crud
        .Read(table)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Read ALL Order By
    app.get(self.prefix + '/' + name + '/order/:column/:order', (req, res, next) => {
      const params = {
        column: req.params.column,
        order: req.params.order
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Read ALL limit top
    app.get(self.prefix + '/' + name + '/limit/:limit', (req, res, next) => {
      const params = {
        limit: req.params.limit
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Read ALL Order By + limit top
    app.get(self.prefix + '/' + name + '/order/:column/:order/limit/:limit', (req, res, next) => {
      const params = {
        column: req.params.column,
        order: req.params.order,
        limit: req.params.limit
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Read by Key
    app.get(self.prefix + '/' + name + '/:key/:id', (req, res, next) => {
      const params = {
        key: req.params.key,
        id: req.params.id
      }
      self.crud
        .ReadByKey(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Search by any column
    app.get(self.prefix + '/' + name + '/search/:key/:id', (req, res, next) => {
      const params = {
        key: req.params.key,
        id: req.params.id
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Search by any column and add order by 
    app.get(self.prefix + '/' + name + '/search/:key/:id/order/:column/:order', (req, res, next) => {
      const params = {
        key: req.params.key,
        id: req.params.id,
        column: req.params.column,
        order: req.params.order,
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Search by any column and add order by and limit results
    app.get(self.prefix + '/' + name + '/search/:key/:id/order/:column/:order/limit/:limit', (req, res, next) => {
      const params = {
        key: req.params.key,
        id: req.params.id,
        column: req.params.column,
        order: req.params.order,
        limit: req.params.limit
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Search by any column and limit results
    app.get(self.prefix + '/' + name + '/search/:key/:id/limit/:limit', (req, res, next) => {
      const params = {
        column: req.params.column,
        order: req.params.order,
        limit: req.params.limit
      }
      self.crud
        .Read(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })

    // Status of the table
    app.get(self.prefix + '/' + name + '/status', (req, res, next) => {
      self.crud
        .UpdateTime(table)
        .then(function (data) {
          if (data[0].UPDATE_TIME == null) {
            self.crud
              .HeartBeat(table)
              .then(function (data) {
                res.status(RESPONSE_CODE_SUCCESS).json({
                  STATUS_TIMESTAMP: new Date()
                })
              })
              .catch(function (e) {
                self.errorHandler(res, e);
              })
          } else {
            res.status(RESPONSE_CODE_SUCCESS).json(data)
          }
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })
  }

  // Update by key route
  if (self.validRoute(table, UPDATE)) {
    app.patch(self.prefix + '/' + name + '/:key/:id', (req, res, next) => {
      const params = {
        key: req.params.key,
        id: req.params.id,
        data: req
      }

      self.crud
        .Update(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_ALTER_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })
  }

  // Delete by Key route
  if (self.validRoute(table, DELETE)) {
    app.delete(self.prefix + '/' + name + '/:key/:id', (req, res, next) => {
      const params = {
        key: req.params.key,
        id: req.params.id
      }
      self.crud
        .Delete(table, params)
        .then(function (data) {
          res.status(RESPONSE_CODE_SUCCESS).json(data)
        })
        .catch(function (e) {
          self.errorHandler(res, e);
        })
    })
  }

} // end createRoutes fn

// error handler fn for specific error msgs and codes
mlr.prototype.errorHandler = function (res, error) {
  const self = this
  let errMessageDetail = '';

  if (self.verbose) {
    errMessageDetail = ' ' + error;
    console.log(errMessageDetail);
  }

  if (error.name == 'CrudError') {
    res.status(RESPONSE_CODE_ERROR).send(ERROR_MSG_QUERY + errMessageDetail)
  } else {
    res.status(RESPONSE_CODE_SERVER_ERROR).send(ERROR_MSG_SERVER + errMessageDetail)
  }
}

module.exports = {
  mlr: mlr,
  CREATE: CREATE,
  READ: READ,
  UPDATE: UPDATE,
  DELETE: DELETE,
  ALL: ALL
}
