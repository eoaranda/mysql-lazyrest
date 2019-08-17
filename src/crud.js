'use strict';
const mysql = require('mysql')

class Crud {
  constructor (globalVariables) {
    if (globalVariables === undefined)
      {throw new Error("Global variables are not defined.");}

    try {
      this.globalVariables = globalVariables
      this.db = new Database(globalVariables.connectionString)
      this.schema = this.globalVariables.connectionString.database
    } catch (e) {
      console.log('Crud Error: ' + e.message)
    }
  }

  ConvertValue (value) {
    let key
    if (isNaN(value)) {
      key = "'" + value + "'"
    } else {
      key = value
    }
    return key
  }

  ConvertColumn (column) {
    return '\`' + column + '\`';
  }

  // CREATE record in database
  Create (table, req) {
    const self = this
    let sql = '';
    const data = req.body
    let columns = []
    let columnVal = []
    for (var attributename in data) {
      columns.push(self.ConvertColumn(attributename))
      columnVal.push(self.ConvertValue(data[attributename]))
    }

    if (data != null) {
      sql =
        'INSERT INTO ' +
        table.table_schema +
        '.' +
        table.table_name +
        ' ( ' +
        columns.join() +
        ' ) VALUES (' +
        columnVal.join() +
        ' ) ';
    } else {
      throw new Error('Crud Error: Could create insert statement.')
    }
    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to insert data: ' + err.message)
        })
    })
  }

  // SEARCH from the database using column and key
  Search (table, params = null) {
    const self = this

    return new Promise(function (resolve, reject) {
      if (params == null) {
        throw new Error('Crud Error: Missing paramenters')
      }

      self.Read(table, params).then(function (data) {
        resolve(data)
        })
        .catch(function (e) {
          res.status(500).send(GENERIC_ERROR_MSG)
          reject(GENERIC_ERROR_MSG)
        })
    })
  }

  // READBYKEY  from the database using ONLY the primary keys
  ReadByKey (table, params = null) {
    const self = this

    return new Promise(function (resolve, reject) {
      if (params != null) {
        var keysArr = table.primary_key.split(',')
        if (keysArr !== undefined || keysArr.length > 0) {
          if (keysArr.indexOf(params.key) < 0) {
            throw new Error('Crud Error: Incorrect primary key.')
          }
        }
      }

      self.Read(table, params).then(function (data) {
        resolve(data)
        })
        .catch(function (e) {
          res.status(500).send(GENERIC_ERROR_MSG)
          reject(GENERIC_ERROR_MSG)
        })
    })
  }

  // READ from the database 1 by 1 or Multiple
  Read (table, params = null) {
    let extra = '';
    const self = this
    if (params != null) {
      if (params.id !== undefined && params.key !== undefined) {
        extra = ' WHERE ' + self.ConvertColumn(params.key) + ' =  ' + self.ConvertValue(params.id) + ' ';
      }
      if (params.column !== undefined && params.order !== undefined) {
        extra = extra + ' ORDER BY ' + self.ConvertColumn(params.column) + ' ' + self.ConvertValue(params.order)
      }
      if (params.limit !== undefined) {
        extra = extra + ' LIMIT ' + self.ConvertValue(params.limit)
      }
    }
    const sql = 'SELECT * FROM ' + table.table_schema + '.' + table.table_name + ' ' + extra

    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to read data: ' + err.message)
        })
    })
  }

  // UPDATE from the database
  Update (table, req) {
    const self = this
    let sql = '';
    const data = req.data.body
    let row = []

    if (req != null) {
      var keysArr = table.primary_key.split(',')
      if (keysArr !== undefined || keysArr.length > 0) {
        if (keysArr.indexOf(req.key) < 0) {
          throw new Error('Crud Error: Incorrect primary key.')
        }
      }
    }

    for (var attributename in data) {
      row.push(self.ConvertColumn(attributename) + ' = ' + self.ConvertValue(data[attributename]) + ' ')
    }

    if (data != null) {
      sql =
        'UPDATE ' +
        table.table_schema +
        '.' +
        table.table_name +
        ' SET ' +
        row.join() +
        ' WHERE ' +
        self.ConvertColumn(req.key) +
        ' = ' +
        self.ConvertValue(req.id)
    } else {
      throw new Error('Crud Error: Could not create update statement.')
    }

    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to update data: ' + err.message)
        })
    })
  }

  // DELETE from the database only 1 by 1
  Delete (table, req) {
    const self = this
    let sql = '';

    if (req != null) {
      var keysArr = table.primary_key.split(',')
      if (keysArr !== undefined || keysArr.length > 0) {
        if (keysArr.indexOf(req.key) < 0) {
          throw new Error('Crud Error: Incorrect primary key.')
        }
      }
    }

    if (req.id != null || req.key != null) {
      sql =
        'DELETE FROM ' +
        table.table_schema +
        '.' +
        table.table_name +
        ' WHERE ' +
        self.ConvertColumn(req.key) +
        ' = ' +
        self.ConvertValue(req.id)
    } else {
      throw new Error('Crud Error: Could not create the delete statement.')
    }

    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to delete data: ' + err.message)
        })
    })
  }

  // DESCRIBE the table
  Describe (table) {
    const self = this
    let sql = 'DESCRIBE ' + table.table_schema + '.' + table.table_name

    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to parse data: ' + err.message)
        })
    })
  }

  // get detailed information of the tables in that schema
  SchemaTables () {
    const self = this
    let schema = this.schema
    let hidenTables = this.globalVariables.hidenTables

    let schemaSql = schema ? "WHERE t.TABLE_SCHEMA = '" + schema + "' " : '';

    const hidenSql = hidenTables.length
      ? "AND t.TABLE_NAME NOT IN ('" + hidenTables.join("','") + "')"
      : '';

    const sql =
      'SELECT t.TABLE_NAME, t.TABLE_TYPE, t.TABLE_SCHEMA, GROUP_CONCAT(c.COLUMN_NAME) AS PRIMARY_KEYS FROM information_schema.tables t ' +
      "LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = t.TABLE_NAME  AND c.COLUMN_KEY = 'PRI' " +
      schemaSql +
      hidenSql +
      'GROUP BY t.TABLE_NAME';

    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to parse data: ' + err.message)
        })
    })
  }

  // returns the last time the table in question was updated, only works for MyISAM tables
  UpdateTime (table) {
    const self = this
    let sql = "SELECT UPDATE_TIME FROM information_schema.tables WHERE TABLE_SCHEMA = '" + table.table_schema + "' AND TABLE_NAME = '" + table.table_name + "' "

    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to parse data: ' + err.message)
        })
    })
  }

  // Returns the time stamp if the table is available
  HeartBeat (table) {
    const self = this
    let sql = 'Select 1 from ' + table.table_schema + '.' + table.table_name + ' limit 1';
    return new Promise(function (resolve, reject) {
      self.db.query(sql)
        .then(results => {
          resolve(results)
        })
        .catch(function (err) {
          reject('Crud Error: Unable to parse data: ' + err.message)
        })
    })
  }
}

class Database {
  constructor (connectionString) {
    if (
      connectionString.host === undefined ||
      connectionString.user === undefined ||
      connectionString.password === undefined ||
      connectionString.database === undefined
    )
      {throw new Error(
        "Database Error: Your are missing required parameters in the connection String."
      );}

    connectionString.connectionLimit = 100
    this.connection = mysql.createPool(connectionString)
  }

  query (sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.getConnection(function (err, poolConnection) {
        poolConnection.query(sql, args, (err, rows) => {
          if (err) return reject(err)
          poolConnection.release()
          resolve(rows)
        })
      })
    })
  }

  close () {
    return new Promise((resolve, reject) => {
      this.connection.getConnection(function (err, poolConnection) {
        if (err) return reject(err)
        poolConnection.release()
        resolve()
      })
    })
  }
}

module.exports = Crud
