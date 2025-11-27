const mongoose = require("mongoose");
const User = mongoose.model("User", {
  email: String,
  token: String,
  hash: String,
  salt: String,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Favorite" }],
});

module.exports = User;
