const mongoose = require("mongoose");
const Favorite = mongoose.model("Favorite", {
  thumbnail: {
    path: String,
    extension: String,
  },
  label: String,
  description: String,
  apiId: String,
});

module.exports = Favorite;
