const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/comics", async (req, res) => {
  try {
    const { title, limit, skip } = req.query;
    let filter = "";
    if (title) {
      filter += "&title=" + title;
    }
    if (limit) {
      if (!Number(limit) || limit < 1 || limit > 100) {
        return res
          .status(400)
          .json({ message: "Limit must be set between 1 and 100" });
      }
      filter += "&limit=" + limit;
    }
    if (skip) {
      if (skip < 0) {
        return res
          .status(400)
          .json({ message: "Skip must be a positive integer" });
      }
      filter += "&skip=" + skip;
    }
    const response = await axios(
      "https://lereacteur-marvel-api.herokuapp.com/comics?apiKey=" +
        process.env.MARVEL_API_KEY +
        filter
    );

    res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.get("/comics/:characterId", async (req, res) => {
  try {
    const { characterId } = req.params;
    const response = await axios(
      `https://lereacteur-marvel-api.herokuapp.com/comics/${characterId}?apiKey=` +
        process.env.MARVEL_API_KEY
    );
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

router.get("/comic/:comicId", async (req, res) => {
  try {
    const { comicId } = req.params;
    const response = await axios(
      `https://lereacteur-marvel-api.herokuapp.com/comic/${comicId}?apiKey=` +
        process.env.MARVEL_API_KEY
    );
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: "server error", error: error.message });
  }
});

module.exports = router;
