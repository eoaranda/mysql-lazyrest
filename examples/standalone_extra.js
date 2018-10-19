// Ex2 - Stand alone with extra configurations and parameters

// we call the library
const lr = require('lazyrest');

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
