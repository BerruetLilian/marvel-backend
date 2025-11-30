const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/User");
const Favorite = require("../models/Favorite");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/user/signup", async (req, res) => {
  try {
    if (
      !req.body.email ||
      !req.body.password ||
      Object.keys(req.body).length !== 2
    ) {
      return res.status(400).json({ message: "Invalid body" });
    }
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ message: "Email already used" });
    }
    const salt = uid2(16);
    const hash = SHA256(req.body.password + salt).toString(encBase64);
    const token = uid2(64);
    const newUser = new User({
      email: req.body.email,
      token: token,
      hash: hash,
      salt: salt,
      favorites: [],
    });
    await newUser.save();
    res.status(201).json({
      token: newUser.token,
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    if (
      !req.body.email ||
      !req.body.password ||
      Object.keys(req.body).length !== 2
    ) {
      return res.status(400).json({ message: "Invalid body" });
    }
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized authentification" });
    }
    const hash = SHA256(req.body.password + user.salt).toString(encBase64);
    if (user.hash === hash) {
      res.status(200).json({
        token: user.token,
      });
    } else {
      return res.status(401).json({ message: "Unauthorized authentification" });
    }
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.get("/user/favorites/", isAuthenticated, async (req, res) => {
  try {
    res
      .status(200)
      .json({ results: req.user.favorites, count: req.user.favorites.length });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.post("/user/favorites/:id", isAuthenticated, async (req, res) => {
  try {
    //We make sure that only one copy of each favorite in our database
    const { id } = req.params;
    if (!req.body.type || Object.keys(req.body).length !== 1) {
      return res.status(400).json({ message: "Invalid body" });
    }
    const type = req.body.type;
    if (type !== "comic" && type !== "character") {
      return res
        .status(400)
        .json({ message: "Invalid type: either comic or character" });
    }
    const favoriteInDatabase = await Favorite.findOne({ apiId: id });
    let newFavorite;

    if (!favoriteInDatabase) {
      const { data } = await axios(
        `https://lereacteur-marvel-api.herokuapp.com/${type}/${id}?apiKey=` +
          process.env.MARVEL_API_KEY
      );
      if (!data) {
        return res.status(400).json({ message: "Character not found" });
      }
      const label = data.title || data.name;
      newFavorite = new Favorite({
        thumbnail: data.thumbnail,
        label: label,
        description: data.description,
        apiId: data._id,
        type: type,
      });
      await newFavorite.save();
    }
    const favorite = favoriteInDatabase || newFavorite;

    const user = req.user;
    const alreadyFavorite = user.favorites.find((element) =>
      element._id.equals(favorite._id)
    );
    if (alreadyFavorite) {
      return res.status(400).json({ message: "Is already favorite" });
    }
    user.favorites.push(favorite);
    await user.save();
    res.status(200).json({ result: newFavorite });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.delete("/user/favorites/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    //We verify that favorite exist in user favorites
    let index = -1;
    for (let i = 0; i < user.favorites.length; i++) {
      if (user.favorites[i]._id.equals(id)) {
        index = i;
      }
    }
    if (index < 0) {
      return res.status(400).json({ message: "Is not a favorite" });
    }
    user.favorites.splice(index, 1);
    await user.save();

    //If is favorited by no one after being remove from user favorites we remove him from database
    const stillFavorited = await User.findOne({
      favorites: new mongoose.Types.ObjectId(id),
    });

    if (!stillFavorited) {
      await Favorite.findByIdAndDelete(id);
    }

    res.status(200).json({ message: "favorite removed" });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

module.exports = router;
