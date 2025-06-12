// server.js
const express = require('express');
const axios =require('axios');
const cors = require('cors');
const path = require('path'); // Import the 'path' module
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for API requests
app.use(express.json());

// --- Serve Frontend Files ---
// This tells Express to serve your index.html and script.js from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- API Key and Configuration ---
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const QURAN_API_URL = 'https://api.quran.com/api/v4/';
const AI_MODEL = 'deepseek-chat';

if (!DEEPSEEK_API_KEY) {
  console.error("CRITICAL ERROR: DEEPSEEK_API_KEY environment variable not found.");
}

// --- API Endpoint ---
// Your frontend will make requests to this single endpoint
app.post('/api/get-verse', async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'User input is required.' });
  }
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'The server is missing its API key.' });
  }

  try {
    // Step 1: Analyze emotion with DeepSeek
    const emotionPrompt = `Analyze this text and respond with one of: happy, sad, anxious, fearful, angry, confused, grateful, hopeful, lonely, stressed.\nText: "${userInput}"`;
    const emotionResponse = await callAI(emotionPrompt);
    const emotion = emotionResponse.toLowerCase().trim().replace('.', '');

    // Step 2: Find a relevant verse from Quran.com
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

    // Step 3: Generate a reflection for the verse
    const reflectionPrompt = `Give a short, comforting, 2-sentence Islamic reflection on this verse, considering the user is feeling ${emotion}.\nVerse: ${verseData.english} (${verseData.reference})`;
    const reflection = await callAI(reflectionPrompt);

    // Step 4: Send the complete data back to the frontend
    res.json({ ...verseData, reflection, emotion });

  } catch (error) {
    console.error('Error processing request:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch verse. The server encountered an error.' });
  }
});

// Helper function to call the DeepSeek API
async function callAI(prompt) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    { model: AI_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 200 },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return response.data.choices[0].message.content;
}


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
