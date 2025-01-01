const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { Shazam } = require("unofficial-shazam");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Set up Multer for handling file uploads
const upload = multer({ dest: "/tmp/" }); // Use /tmp for serverless compatibility

// Shazam instance
const shazam = new Shazam();

app.post("/api/recognize", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  try {
    // Recognize the uploaded audio file
    const recognizeResult = await shazam.recognise(req.file.path, "en-US");
    fs.unlinkSync(req.file.path); // Clean up temporary file

    // Prepare response data (same as in your code)
    if (
      recognizeResult &&
      recognizeResult.track &&
      recognizeResult.track.title &&
      recognizeResult.track.subtitle
    ) {
      const track = recognizeResult.track;
      const songInfo = {
        title: track.title || "Not available",
        artist: track.subtitle || "Not available",
        appleMusic: track.share.href || "Not available",
        spotify: track.myshazam?.apple?.previewurl || "Not available",
        album: track.sections[0]?.metadata?.find(item => item.title === 'Album')?.text || "Not available",
        releaseYear: track.sections[0]?.metadata?.find(item => item.title === 'Released')?.text || "Not available",
        genre: track?.genres?.primary || "Not available",
        coverArt: track.images.coverart || "Not available",
        backgroundImage: track.images.background || "Not available",
      };

      return res.json(songInfo);
    } else {
      return res.status(404).json({ message: "No song found." });
    }
  } catch (error) {
    console.error("Error recognizing the song:", error);
    res.status(500).json({ error: "An error occurred during recognition." });
  }
});

module.exports = app;
