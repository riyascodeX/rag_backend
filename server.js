const express = require("express");
const app = express();

const indexRouter = require("./routes/index");

app.use(express.json());

// Mount routes
app.use("/", indexRouter);

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});
