require("dotenv").config();

const app = require("./app");
require("./config/database");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

console.log(process.env);
console.log("DB_USER =", process.env.DB_USER);