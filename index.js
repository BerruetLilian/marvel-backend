require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI);

const cors = require("cors");
const express = require("express");
const app = express();
app.use(express.json());
app.use(cors());

const userRouter = require("./routes/user");
app.use(userRouter);

const comicsRouter = require("./routes/comics");
app.use(comicsRouter);

const charactersRouter = require("./routes/characters");
app.use(charactersRouter);

app.all(/.*/, (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(process.env.PORT, () => {
  console.log("server started !");
});
