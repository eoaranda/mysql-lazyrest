// Ex1 - Stand alone

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
