const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      //The only reason to verify that a user authenticated it's when he want to either
      // modify or get his favorites so we can populate his favorites key
      const user = await User.findOne({
        token: req.headers.authorization.replace("Bearer ", ""),
      })
        .select("-hash -salt")
        .populate("favorites");

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      } else {
        req.user = user;
        return next();
      }
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error", error: error.messsage });
  }
};

module.exports = isAuthenticated;
