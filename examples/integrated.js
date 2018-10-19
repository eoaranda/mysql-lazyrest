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
