// server.js -> UPDATED FOR GEMINI API

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Key and Configuration ---
// We will now use the Gemini API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const QURAN_API_URL = 'https://api.quran.com/api/v4/';

if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable not found.");
}

// --- API Endpoint (No changes here) ---
app.post('/api/get-verse', async (req, res) => {
    // This entire section remains the same
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'User input is required.' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'The server is missing its API key.' });
  }

  try {
    const emotionPrompt = `Analyze this text and respond with one of: happy, sad, anxious, fearful, angry, confused, grateful, hopeful, lonely, stressed.\nText: "${userInput}"`;
    const emotionResponse = await callAI(emotionPrompt);
    const emotion = emotionResponse.toLowerCase().trim().replace(/['."]/g, ''); // More robust cleaning

    const topics = {
      happy: 'joy', sad: 'comfort', anxious: 'trust', fearful: 'protection',
      angry: 'forgiveness', confused: 'guidance', grateful: 'thanks',
      hopeful: 'mercy', lonely: 'companionship', stressed: 'relief'
    };
    const topic = topics[emotion] || 'guidance';

    const searchRes = await axios.get(`${QURAN_API_URL}search?q=${topic}&size=1&page=${Math.floor(Math.random() * 5) + 1}`);
    const verseId = searchRes.data.search.results[0].verse_id;
    const verseRes = await axios.get(`${QURAN_API_URL}verses/by_key/${verseId}?language=en&translations=131,85`);
    const v = verseRes.data.verse;
    
    const verseData = {
      arabic: v.text_uthmani,
      english: v.translations.find(t => t.id === 131)?.text || "English translation not found.",
      bengali: v.translations.find(t => t.id === 85)?.text || 'Bengali translation not available.',
      reference: `Surah ${v.chapter.name_simple}, Ayah ${v.verse_number}`
    };

    const reflectionPrompt = `Give a short, comforting, 2-sentence Islamic reflection on this verse, considering the user is feeling ${emotion}.\nVerse: ${verseData.english} (${verseData.reference})`;
    const reflection = await callAI(reflectionPrompt);

    res.json({ ...verseData, reflection, emotion });

  } catch (error) {
    console.error('Error processing request:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch verse. The server encountered an error.' });
  }
});


// --- callAI function (UPDATED FOR GEMINI) ---
async function callAI(prompt) {
  // The Gemini API endpoint is different
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`;

  // The request body format is also different
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const response = await axios.post(API_URL, requestBody);
  // The way we get the text from the response is different
  return response.data.candidates[0].content.parts[0].text;
}


// --- Start Server (No changes here) ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
