"use strict";
const mysql = require("mysql");

class Crud {
  constructor(globalVariables) {
    if (globalVariables === undefined)
      throw new Error("Global variables are not defined.");

    try {
      this.globalVariables = globalVariables;
      this.db = new Database(globalVariables.connectionString);
      this.schema = this.globalVariables.connectionString.database;
    } catch (e) {
      console.log("Crud Error: " + e.message);
    }
  }

  // CREATE record in database
  Create(table, req) {
    let self = this;
    let sql = "";
    let data = req.body;
    let columns = [];
    let columnVal = [];
    for (var attributename in data) {
      columns.push(attributename);
      columnVal.push(" '" + data[attributename] + "' ");
    }

    if (data != null) {
      sql =
        "INSERT INTO " +
        table.table_schema +
        "." +
        table.table_name +
        " ( " +
        columns.join() +
        " ) VALUES (" +
        columnVal.join() +
        " ) ";
    } else {
      throw new Error("Crud Error: Could create insert statement.");
    }
    return new Promise(function(resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results);
        })
        .catch(function(err) {
          reject("Crud Error: Unable to insert data: " + err.message);
        });
    });
  }

  // READ from the database 1 by 1 or Multiple
  Read(table, params = null) {
    let extra = "";
    let self = this;

    if (params != null) {
      if (params.id !== undefined) {
        extra = " WHERE " + table.primary_key + " = " + params.id;
      }
      if (params.column !== undefined && params.order !== undefined) {
        extra = extra + " ORDER BY " + params.column + " " + params.order;
      }
      if (params.limit !== undefined) {
        extra = extra + " LIMIT " + params.limit;
      }
    }
    let sql =
      "SELECT * FROM " + table.table_schema + "." + table.table_name + extra;

    return new Promise(function(resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results);
        })
        .catch(function(err) {
          reject("Crud Error: Unable to read data: " + err.message);
        });
    });
  }

  // UPDATE from the database 1 by 1
  Update(table, req) {
    let self = this;
    let sql = "";
    let id = req.params.id;
    let data = req.body;
    let row = [];
    for (var attributename in data) {
      row.push(attributename + " = '" + data[attributename] + "' ");
    }

    if (id != null && data != null) {
      sql =
        "UPDATE " +
        table.table_schema +
        "." +
        table.table_name +
        " SET " +
        row.join() +
        " WHERE " +
        table.primary_key +
        " = " +
        id;
    } else {
      throw new Error("Crud Error: Could create update statement.");
    }

    return new Promise(function(resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results);
        })
        .catch(function(err) {
          reject("Crud Error: Unable to update data: " + err.message);
        });
    });
  }

  // DELETE from the database only 1 by 1
  Delete(table, id = null) {
    let self = this;
    let sql = "";
    if (id != null) {
      sql =
        "DELETE FROM " +
        table.table_schema +
        "." +
        table.table_name +
        " WHERE " +
        table.primary_key +
        " = " +
        id;
    }

    return new Promise(function(resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results);
        })
        .catch(function(err) {
          reject("Crud Error: Unable to delete data: " + err.message);
        });
    });
  }

  // DESCRIBE the table
  Describe(table) {
    let self = this;
    let sql = "DESCRIBE " + table.table_schema + "." + table.table_name;

    return new Promise(function(resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results);
        })
        .catch(function(err) {
          reject("Crud Error: Unable to parse data: " + err.message);
        });
    });
  }

  // get detailed information of the tables in that schema
  SchemaTables() {
    let self = this;
    let schema = this.schema;
    let hidenTables = this.globalVariables.hidenTables;

    let schemaSql = schema ? "WHERE t.TABLE_SCHEMA = '" + schema + "' " : "";

    let hidenSql = hidenTables.length
      ? "AND t.TABLE_NAME NOT IN ('" + hidenTables.join("','") + "')"
      : "";

    let sql =
      "SELECT t.TABLE_NAME, t.TABLE_TYPE, t.TABLE_SCHEMA, GROUP_CONCAT(c.COLUMN_NAME) AS PRIMARY_KEYS FROM information_schema.tables t " +
      "LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = t.TABLE_NAME  AND c.COLUMN_KEY = 'PRI' " +
      schemaSql +
      hidenSql +
      "GROUP BY t.TABLE_NAME";

    //console.log(sql);
    return new Promise(function(resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results);
        })
        .catch(function(err) {
          reject("Crud Error: Unable to parse data: " + err.message);
        });
    });
  }
}

}

class Database {
  constructor(connectionString) {
    if (
      connectionString.host === undefined ||
      connectionString.user === undefined ||
      connectionString.password === undefined ||
      connectionString.database === undefined
    )
      throw new Error(
        "Database Error: Your are missing required parameters in the connection String."
      );

    connectionString.connectionLimit = 100;
    this.connection = mysql.createPool(connectionString);
  }

  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.getConnection(function (err, poolConnection) {
        poolConnection.query(sql, args, (err, rows) => {
          if (err) return reject(err);
          poolConnection.release();
          resolve(rows);
        });
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.connection.getConnection(function (err, poolConnection) {
        if (err) return reject(err);
        poolConnection.release();
        resolve();
      });
    });
  }
}

module.exports = Crud;