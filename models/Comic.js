const mongoose = require("mongoose");
const Comic = mongoose.model("Comic", {
  thumbnail: {
    path: String,
    extension: String,
  },
  title: String,
  description: String,
  apiId: String,
});

module.exports = Comic;
