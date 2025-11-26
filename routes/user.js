const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/User");
const Comic = require("../models/Comic");
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

router.post("/user/favorites/:comicId", isAuthenticated, async (req, res) => {
  try {
    //We make sure that only one copy of each comics in favorites are in our databse
    const { comicId } = req.params;
    const comicInDatabase = await Comic.findOne({ apiId: comicId });
    let newComic;
    if (!comicInDatabase) {
      const { data } = await axios(
        `https://lereacteur-marvel-api.herokuapp.com/comic/${comicId}?apiKey=` +
          process.env.MARVEL_API_KEY
      );

      newComic = new Comic({
        thumbnail: data.thumbnail,
        title: data.title,
        description: data.description,
        apiId: data._id,
      });
      await newComic.save();
    }
    const comic = comicInDatabase || newComic;

    const user = req.user;
    const comicAlreadyFavorite = user.favorites.find((element) =>
      element._id.equals(comic._id)
    );
    if (comicAlreadyFavorite) {
      return res.json({ message: "comic is already favorite" });
    }
    user.favorites.push(comic);
    await user.save();
    res.status(200).json({ message: "new favorite added" });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.get("/user/favorites/", isAuthenticated, async (req, res) => {
  try {
    res.status(200).json(req.user.favorites);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.delete("/user/favorites/:comicId", isAuthenticated, async (req, res) => {
  try {
    const { comicId } = req.params;
    const user = req.user;

    //We verify that comic exist in user favorites
    let index = -1;
    for (let i = 0; i < user.favorites.length; i++) {
      if (user.favorites[i].apiId === comicId) {
        index = i;
      }
    }
    if (index < 0) {
      return res.status(400).json({ message: "comic is not a favorite" });
    }
    user.favorites.splice(index, 1);
    await user.save();

    //If comic is favorited by no one after being remove from user favorite we remove himl from database
    const comicInDatabase = await Comic.findOne({ apiId: comicId });
    const comicInDatabaseId = new mongoose.Types.ObjectId(comicInDatabase._id);
    const comicStillFavorited = await User.findOne({
      favorites: comicInDatabaseId,
    });

    if (!comicStillFavorited) {
      await Comic.findByIdAndDelete(comicInDatabaseId);
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
