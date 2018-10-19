# mysql-lazyRest 🛌
LazyREST lets you automagically create REST routes for all the tables and views of a specified schema of your **MySQL** db, by only configuring the database connection string.

**Disclaimer:**
I recommend this library only for development environments.

[![Licence][licence]][git-mysql-lazyrest] [![Made NYC][made-nyc]][git-mysql-lazyrest]

## Installation

This is a Node.js module available through the npm registry.

```sh
npm install mysql-lazyrest --save
```


### Quick Start
After installing **mysql-lazyrest** you can follow the next example an have a REST service running in 1-2-3.

The MySQL connection string adepts to the connection string used by ***mysql.createConnection(config);***

You can read more about this in the [Mysql](https://www.npmjs.com/package/mysql) npm repository.

#### 1-2-3 Standalone Example

```javascript
// 1 - require the library
const lr = require('mysql-lazyrest');

// 2 - create a new lazyrest object and configure the database connection string
let rest = new lr.lazyRest({
	host: "XXX.XXX.XXX.XXX",
	user: "username",
	password: "PA$$",
	database:"schema_name",
	insecureAuth: true //optional
});
	
// 3 - Run it ! It runs by default on port 8080
rest.run();
```

## Examples:
You can see below some other examples of how to implement mysql-lazyrest.

#### Ex 1 -  Standalone 
```javascript
// we call the library
const lr = require('mysql-lazyrest');

// we create a new lazyRest and we send the conneciton string data
let rest = new lr.lazyRest({
	host: "XXX.XXX.XXX.XXX",
	user: "username",
	password: "PA$$",
	database:"schema_name",
	insecureAuth: true //optional
});

// we run the standalone example
rest.run();
```
#### Ex 2 -  Standalone w/ configurations
```javascript
// we call the library
const lr = require('mysql-lazyrest');

// we create a new lazyRest and we send the conneciton string data
let rest = new lr.lazyRest({
	host: "XXX.XXX.XXX.XXX",
	user: "username",
	password: "PA$$",
	database:"schema_name",
	insecureAuth: true //optional
});

// hide tables to be populated
rest.hide(["A_OLD_lkp_municipio", "A_OLD_lkp_oxxogas"]);

// set models for specific tables, this sets the alias, the access of a table
rest.models([{ table_name: "t_city", alias: "city", access: [lr.READ] }]);

// we run the stand alone example with some configurations
rest.run({ port: "", app: "", prefix: "/api/v1", lifetime: 0 });
```
#### Ex 3 -  With existing Express project + configurations
```javascript
// Ex3 - Integrated with an existing project

const express = require("express");
const app = express();
const port = 8080;
// we call the library
const lr = require('mysql-lazyrest');

// we create a new lazyRest and we send the conneciton string data
let rest = new lr.lazyRest({
	host: "XXX.XXX.XXX.XXX",
	user: "username",
	password: "PA$$",
	database:"schema_name",
	insecureAuth: true //optional
});

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

// we run the example with some configurations
let config = { port: port, app: app, prefix: "/api/v1", lifetime: 24 };
rest.run(config);
```


## Configurations
There are some existing enhancements that can be applied to the general behavior or per table/view


### Database connection string **required*
When instantiating **lazyRest** we need to send a *connectionString* as a parameter to create a MySQL connection.

**Ex.**
```javascript
let connectionString = {
	host: "XXX.XXX.XXX.XXX",
	user: "username",
	password: "PA$$",
	database:"schema_name",
}
let rest = new lr.lazyRest(connectionString);
```
---
### Hide  **optional*
If we want to hide tables form the public we are able to do so by including an array of the tables names in the method **hide**

**Ex.**
```javascript
rest.hide([
	"table_with_ssn", 
	"table_with_customer_data", 
	"table_with_more_sensitive_data",
	...
]);
```
---
### Models **optional*
We can use this method to change some behavior for all the tables we need to.

**Ex.**
```javascript
rest.models([
	{ table_name: "tbl_contracts", alias: "contracts", access: [lr.READ,lr.CREATE] },
	{ table_name: "tbl_users", alias: "users", access: [lr.CREATE] },
	{ table_name: "tbl_very_long_name_of_table_from_2018", alias: "long_name"},
	...
]);
```
#### Options availabe:
```javascript
{ 
	 // name of the table in the db
	table_name: "table_name", 
	// set the name route for this table
	alias: "table",  
	// set the access level for this route, available: READ,CREATE,UPDATE,DELETE,ALL or 
	access: [ empty for ALL
		lr.READ,
		lr.CREATE
	] 
}
```
---
### Run **required*
We need this method to start all the automated routing.
This **configurations** are global and will affect the operation of all the routes.

**Ex.**
```javascript
rest.run({ port: "", app: "", prefix: "/api/v1", lifetime: 0 });
```
#### Options available:
```javascript
{ 
	// set a port for express routing, by default 8080
	port: "", 
	// override the express app if you already have one in your project
	app: "",
	// prefix for the routes ex. localhost:8080/api/v1/...
	prefix: "",
	// set the max-age of Cache-Control, the expected param is in hours and set by default to 24. If set to 0 then it will set no-cache, no-store, must-revalidate.
	lifetime: 0  
}
```

## Routes

List of routes that will be created **automagically** per table:


| Method | Url | HTTP Status | Result |
|--------|----------------------------------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------------------|
| GET | tables/ | 200 | Returns a table object with information of the available tables. |
| GET | <table_name>/describe | 200 | Returns the db description of the requested table per column |
| GET | <table_name>/ | 200 | Returns all the data of the requested table |
| GET | <table_name>/order/<column_ name>/by/<asc_or_desc> | 200 | Returns all the data of the requested table ordered by a requested column and in asc or desc order |
| GET | <table_name>/limit/<number> | 200 | Returns the first <n> number of rows of the request table |
| GET | <table_name>/order/<column_  name>/by/<asc_or_desc>/limit/<  number> | 200 | Returns  the first <n> number of rows of a requested table ordered by a requested column and in asc or desc order |
| GET | <table_name>/<id_number> | 200 | Returns a specific row from the requested table based on the id number of the primary key of the table |
| PATCH | <table_name>/<id_number> | 201 | Updates data based on the id of the primary key of the table |
| DELETE | <table_name>/<id_number> | 200 | Deletes a specific row from the requested table based on the id number of the primary key of the table |
| CREATE | <table_name>/ | 201 | Inserts data to the requested table |

## License


[MIT](https://opensource.org/licenses/MIT) 


[licence]: https://img.shields.io/npm/l/mta-metro.svg?maxAge=2592000
[made-nyc]: https://img.shields.io/badge/Made-NYC-blue.svg
[git-mysql-lazyrest]: https://github.com/eoaranda/mysql-lazyrest
