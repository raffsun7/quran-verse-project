// server.js
// Run `npm install express axios dotenv cors` to install dependencies.
// Run server with `node server.js`.

const express = require('express');
const axios = require('axios');
const cors =require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Your secret API key is now safely stored on the server
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const QURAN_API_URL = 'https://api.quran.com/api/v4/';
const AI_MODEL = 'deepseek-chat';

if (!DEEPSEEK_API_KEY) {
  console.error("Error: DEEPSEEK_API_KEY not found. Please create a .env file and add your key.");
  process.exit(1);
}

// This single endpoint will handle the entire logic
app.post('/api/get-verse', async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'User input is required.' });
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

    const searchRes = await axios.get(`${QURAN_API_URL}search?q=${topic}&size=1&page=${Math.floor(Math.random() * 5) + 1}`); // Get from first 5 pages
    const verseId = searchRes.data.search.results[0].verse_id;
    const verseRes = await axios.get(`${QURAN_API_URL}verses/by_key/${verseId}?language=en&translations=131,85`); // 131: Clear Quran (En), 85: Muhiuddin Khan (Bn)

    const v = verseRes.data.verse;
    const verseData = {
      arabic: v.text_uthmani,
      english: v.translations.find(t => t.id === 131)?.text || "English translation not found.",
      bengali: v.translations.find(t => t.id === 85)?.text || 'Bengali translation not available.',
      reference: `Surah ${v.chapter.name_simple}, Ayah ${v.verse_number}`
    };

    // Step 3: Generate a reflection for the verse
    const reflectionPrompt = `Give a short, comforting, 2-sentence Islamic reflection on this verse, considering the user is feeling ${emotion}.\nVerse: ${verseData.english} (${verseData.reference})\nUser's feeling: "${userInput}"`;
    const reflection = await callAI(reflectionPrompt);

    // Step 4: Send the complete data back to the frontend
    res.json({
      ...verseData,
      reflection,
      emotion,
    });

  } catch (error) {
    console.error('Error processing request:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch verse. The server encountered an error.' });
  }
});

// Helper function to call the DeepSeek API
async function callAI(prompt) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200
    },
    {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});