// Full working script.js for Quran Verse Jar with a secure backend integration

document.addEventListener('DOMContentLoaded', function () {
  // --- ELEMENT REFERENCES ---
  const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    userInput: document.getElementById('user-input'),
    getVerseBtn: document.getElementById('get-verse-btn'),
    verseContainer: document.getElementById('verse-container'),
    verseContent: document.getElementById('verse-content'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    arabicText: document.getElementById('arabic-text'),
    translationText: document.getElementById('translation-text'),
    referenceText: document.getElementById('reference-text'),
    reflectionText: document.getElementById('reflection-text'),
    translationLang: document.getElementById('translation-lang'),
    tryAgainBtn: document.getElementById('try-again-btn'),
    downloadBtn: document.getElementById('download-btn'),
    shareBtn: document.getElementById('share-btn'),
    loadingContainer: document.getElementById('loading'),
    emotionIndicator: document.getElementById('emotion-indicator'),
    apiStatus: document.getElementById('api-status')
  };

  // --- STATE MANAGEMENT ---
  const state = {
    currentVerseData: null,
    isOnline: true
  };

  init();

  // --- INITIALIZATION ---
  function init() {
    checkTheme();
    setupEventListeners();
    checkAPIConnectivity();
  }

  // --- CORE LOGIC ---
  async function getRelevantVerse(userText) {
    showLoading(true);
    elements.verseContainer.classList.add('hidden');

    try {
      // All complex logic is now on the server. We just send the input.
      const response = await axios.post(config.backendUrl, { userInput: userText });
      state.currentVerseData = response.data;
      
      displayVerse(state.currentVerseData);
      updateAPIConnection(true);

    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || "An unknown error occurred. Please try again.";
      handleError(errorMessage);
    } finally {
      showLoading(false);
    }
  }
  
  // --- UI DISPLAY FUNCTIONS ---
  function displayVerse(verseData) {
    const md = window.markdownit();
    elements.arabicText.textContent = verseData.arabic;
    elements.referenceText.textContent = verseData.reference;
    elements.reflectionText.innerHTML = md.render(verseData.reflection);
    
    updateEmotionIndicator(verseData.emotion);
    updateTranslation(); // This will use the new state data
    
    // Show verse content, hide error message
    elements.verseContent.classList.remove('hidden');
    elements.errorContainer.classList.add('hidden');
    elements.downloadBtn.style.display = 'block';
    elements.shareBtn.style.display = 'block';

    elements.verseContainer.classList.remove('hidden');
    elements.verseContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function updateTranslation() {
    if (!state.currentVerseData) return;
    const lang = elements.translationLang.value;
    elements.translationText.textContent = state.currentVerseData[lang];
    elements.translationText.className = `mt-2 text-lg font-${lang === 'bengali' ? 'bengali' : 'english'}`;
  }

  function updateEmotionIndicator(emotion) {
    const colors = {
      happy: 'bg-green-500', sad: 'bg-blue-500', anxious: 'bg-orange-500',
      fearful: 'bg-red-500', angry: 'bg-pink-500', confused: 'bg-purple-500',
      grateful: 'bg-yellow-500', hopeful: 'bg-cyan-500', lonely: 'bg-gray-500', stressed: 'bg-amber-600'
    };
    elements.emotionIndicator.textContent = emotion;
    elements.emotionIndicator.className = `text-sm px-3 py-1 rounded-full text-white ${colors[emotion] || 'bg-gray-600'}`;
  }
  
  function handleError(message) {
    updateAPIConnection(false);
    
    // Display the error message in the UI
    elements.errorMessage.textContent = `Error: ${message}`;
    elements.errorContainer.classList.remove('hidden');
    elements.verseContent.classList.add('hidden');
    elements.downloadBtn.style.display = 'none';
    elements.shareBtn.style.display = 'none';

    elements.verseContainer.classList.remove('hidden');
    elements.verseContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function showLoading(show) {
    elements.loadingContainer.classList.toggle('hidden', !show);
  }

  function updateAPIConnection(status) {
    state.isOnline = status;
    elements.apiStatus.textContent = `API: ${status ? 'Connected' : 'Offline'}`;
    elements.apiStatus.classList.toggle('text-red-500', !status);
  }

  // --- UTILITY FUNCTIONS ---
  async function downloadVerseCard() {
    if (elements.errorContainer.classList.contains('hidden')) {
      const card = document.querySelector('#verse-container');
      const canvas = await html2canvas(card, { scale: 2 });
      const link = document.createElement('a');
      link.download = 'quran-verse.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  }

  async function shareVerse() {
    if (state.currentVerseData) {
      const verse = state.currentVerseData;
      const text = `${verse.arabic}\n${verse.english}\n(${verse.reference})\n\nReflection: ${verse.reflection}`;
      if (navigator.share) {
        await navigator.share({ title: 'Verse from the Qur\'an', text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Verse and reflection copied to clipboard.');
      }
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    elements.themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  function checkTheme() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    elements.themeIcon.className = document.documentElement.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
  }

  async function checkAPIConnectivity() {
    try {
      await axios.options(config.backendUrl); // A lightweight check
      updateAPIConnection(true);
    } catch {
      updateAPIConnection(false);
    }
  }
  
  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    elements.getVerseBtn.addEventListener('click', () => {
      const input = elements.userInput.value.trim();
      if (input) {
        getRelevantVerse(input);
      } else {
        alert('Please type how you feel.');
      }
    });

    elements.tryAgainBtn.addEventListener('click', () => {
      const input = elements.userInput.value.trim();
      if (input) {
        getRelevantVerse(input);
      } else {
        elements.verseContainer.classList.add('hidden');
        elements.userInput.focus();
      }
    });

    elements.translationLang.addEventListener('change', updateTranslation);
    elements.downloadBtn.addEventListener('click', downloadVerseCard);
    elements.shareBtn.addEventListener('click', shareVerse);
  }
});