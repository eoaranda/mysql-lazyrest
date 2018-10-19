"use strict";
let Crud = require("./crud");
let express = require("express");
let bodyParser = require("body-parser");

const CREATE = "post";
const READ = "get";
const UPDATE = "patch";
const DELETE = "delete";
const ALL = "all";

// the project code name is mlr
function mlr(config, globalVariables) {
  let self = this;
  let crud = new Crud(globalVariables);
  this.modelsTables = globalVariables.modelsTables;

  // if config is not defined set the rest to empty
  if (config === undefined) {
    config = { port: "", app: "", prefix: "", lifetime: "" };
  }

  this.port =
    config.port === undefined || config.port == "" ? 8080 : config.port;
  this.app =
    config.app === undefined || config.app == "" ? express() : config.app;
  this.prefix = config.prefix === undefined ? "" : config.prefix;
  this.lifetime = config.lifetime === undefined ? "24" : config.lifetime;
  this.crud = crud;

  let maxage = this.lifetime * 60 * 60;
  let cachetype = "public, max-age=" + maxage;

  if (this.lifetime == 0) {
    cachetype = "no-cache, no-store, must-revalidate";
  }

  this.app.use(function(req, res, next) {
    res.setHeader("Cache-Control", cachetype);
    res.setHeader("X-Powered-By", "lazyRest");
    next();
  });

  // wee need body parser for the Create and Delete
  this.app.use(
    bodyParser.urlencoded({
      extended: true
    })
  );

  // if the config app is not set then we can listen
  if (config.app == "" || config.app === undefined) {
    this.app.listen(this.port);
  }

  // we obtain all the tables from the database
  // and generate all the necesary routes atumagically
  this.getTables().then(function(data) {
    // sets the route to show all the tables
    self.app.get(self.prefix + "/tables/", (req, res, next) => {
      res.status(200).json(data);
    });
    // generates the CRUD routes for every table
    data.forEach(function(table) {
      self.createRoutes(table);
    });

    self.app.use(function(req, res, next) {
      res
        .status(404)
        .send(
          "404: This is not the page you are looking for. (Route not found) "
        );
    });
  });
}

// returns the array tablesArray with all the tables and the predifined information
mlr.prototype.getTables = function() {
  let self = this;
  return new Promise(function(resolve, reject) {
    self.crud
      .SchemaTables()
      .then(results => {
        let tablesArray = [];
        Object.keys(results).forEach(function(key) {
          var row = results[key];
          tablesArray.push({
            table_name: row.TABLE_NAME,
            type: row.TABLE_TYPE,
            alias: self.getAlias(row.TABLE_NAME),
            table_schema: row.TABLE_SCHEMA,
            primary_key: row.PRIMARY_KEYS,
            access: self.getAccess(row.TABLE_NAME)
          });
        });
        resolve(tablesArray);
      })
      .catch(err => reject("Error: Unable to load data: " + err.message));
  });
};

// returns the alias of that table
mlr.prototype.getAlias = function(tableName) {
  if (this.modelsTables === undefined) {
    return "";
  }

  let data = this.modelsTables;
  let found = data.find(function(data) {
    return data.table_name === tableName;
  });
  return found !== undefined ? found.alias : "";
};

// returns the acces of the table, CREATE,READ,UPDATE,DELETE
mlr.prototype.getAccess = function(tableName) {
  if (this.modelsTables === undefined) {
    return "";
  }
  let data = this.modelsTables;
  let found = data.find(function(data) {
    return data.table_name === tableName;
  });
  return found !== undefined && found != "all" ? found.access : "";
};

// calidates that the type of route can be created depending on the table permissions
mlr.prototype.validRoute = function(table, permission) {
  let access = table.access !== "" ? table.access : "all";

  // we can only set read permissions to views
  if (table.type.toUpperCase() === "VIEW" && permission === READ) {
    return true;
  }

  if (
    access.includes(permission) ||
    (access === ALL && table.type.toUpperCase() != "VIEW")
  ) {
    return true;
  }

  return false;
};

// create the routes for all the tables
mlr.prototype.createRoutes = function(table) {
  let self = this;
  let app = this.app;
  let name = table.alias !== "" ? table.alias : table.table_name;

  // Create route
  if (self.validRoute(table, CREATE)) {
    app.post(self.prefix + "/" + name + "/", (req, res, next) => {
      self.crud
        .Create(table, req)
        .then(function(data) {
          res.status(201).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });
  }

  // Read routes
  if (self.validRoute(table, READ)) {
    // Describe table
    app.get(self.prefix + "/" + name + "/describe", (req, res, next) => {
      self.crud
        .Describe(table)
        .then(function(data) {
          res.status(200).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });

    // Read ALL
    app.get(self.prefix + "/" + name + "/", (req, res, next) => {
      self.crud
        .Read(table)
        .then(function(data) {
          res.status(200).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });

    // Read ALL Order By
    app.get(
      self.prefix + "/" + name + "/order/:column/by/:order",
      (req, res, next) => {
        let params = {
          column: req.params.column,
          order: req.params.order
        };
        self.crud
          .Read(table, params)
          .then(function(data) {
            res.status(200).json(data);
          })
          .catch(function(e) {
            console.log(e);
            res.status(500).send("Something whent wrong! Go get some tacos. ");
          });
      }
    );

    // Read ALL limit top
    app.get(self.prefix + "/" + name + "/limit/:limit", (req, res, next) => {
      let params = {
        limit: req.params.limit
      };
      self.crud
        .Read(table, params)
        .then(function(data) {
          res.status(200).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });

    // Read ALL Order By + limit top
    app.get(
      self.prefix + "/" + name + "/order/:column/by/:order/limit/:limit",
      (req, res, next) => {
        let params = {
          column: req.params.column,
          order: req.params.order,
          limit: req.params.limit
        };
        self.crud
          .Read(table, params)
          .then(function(data) {
            res.status(200).json(data);
          })
          .catch(function(e) {
            console.log(e);
            res.status(500).send("Something whent wrong! Go get some tacos. ");
          });
      }
    );

    // Read by Key
    app.get(self.prefix + "/" + name + "/:id", (req, res, next) => {
      let params = {
        id: req.params.id
      };
      self.crud
        .Read(table, params)
        .then(function(data) {
          res.status(200).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });
  }

  // update bye key route
  if (self.validRoute(table, UPDATE)) {
    app.patch(self.prefix + "/" + name + "/:id", (req, res, next) => {
      self.crud
        .Update(table, req)
        .then(function(data) {
          res.status(201).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });
  }

  // Delete by Key route
  if (self.validRoute(table, DELETE)) {
    app.delete(self.prefix + "/" + name + "/:id", (req, res, next) => {
      self.crud
        .Delete(table, req.params.id)
        .then(function(data) {
          res.status(200).json(data);
        })
        .catch(function(e) {
          console.log(e);
          res.status(500).send("Something whent wrong! Go get some tacos. ");
        });
    });
  }
};

module.exports = {
  mlr: mlr,
  CREATE: CREATE,
  READ: READ,
  UPDATE: UPDATE,
  DELETE: DELETE,
  ALL: ALL
};
