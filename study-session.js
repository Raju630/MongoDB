// study-session.js

// This script runs only on the study.html page

// --- GLOBAL STATE for this page ---
const StudyApp = {
    data: {
        dictionary: {},
        exampleSentences: [],
        studyWords: [],
        practiceList: []
    },
    elements: {
        container: document.getElementById('study-app-container'),
        sentenceModal: null, // Will be assigned on DOMContentLoaded
        mnemonicModal: null, // Will be assigned on DOMContentLoaded
    },
    config: {
        pexelsApiKey: '0YZ1YqOAGmfXwoIBl7elGumGGMYqwrOJgwqyqstQuMEGtyPJjiFFNr3K'
    }
};

// --- CORE FUNCTIONS (callable from HTML) ---

function speakJapanese(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

async function showExampleSentences(banglaWord) {
    const japaneseMeaningWithGrammar = StudyApp.data.dictionary[banglaWord]?.meaning;
    if (!japaneseMeaningWithGrammar) {
        alert("Could not find the Japanese translation for this word.");
        return;
    }
    const displayTerm = japaneseMeaningWithGrammar.replace(/\[.*?\]/g, '').trim().replace(/～/g, '...');
    const japaneseMeaningCleaned = japaneseMeaningWithGrammar.replace(/\[.*?\]|～|、/g, '').trim();
    const modal = StudyApp.elements.sentenceModal;
    const wordEl = document.getElementById('sentence-modal-word');
    const bodyEl = document.getElementById('sentence-modal-body');
    wordEl.textContent = displayTerm;
    bodyEl.innerHTML = '<p>Searching for example sentences...</p>';
    modal.style.display = 'flex';
    let relevantSentences = [];
    let highlightRegex;
    let searchStrategy;
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const jpCharClass = '[\\p{N}\\p{sc=Han}\\p{sc=Hiragana}\\p{sc=Katakana}ー]+';
    if (japaneseMeaningWithGrammar.startsWith('～') && !japaneseMeaningWithGrammar.endsWith('～') && !japaneseMeaningWithGrammar.includes('、')) {
        searchStrategy = 'suffix';
        const suffix = japaneseMeaningCleaned;
        const safeSuffix = escapeRegExp(suffix);
        const searchRegex = new RegExp(`${jpCharClass}${safeSuffix}`, 'u');
        relevantSentences = StudyApp.data.exampleSentences.filter(sentence => {
            const matches = [...sentence.jp.matchAll(new RegExp(searchRegex.source, 'gu'))];
            if (matches.length === 0) return false;
            return matches.some(match => {
                const fullMatchedWord = match[0];
                const isFullWordInDictionary = Object.values(StudyApp.data.dictionary).some(entry => entry.meaning.replace(/\[.*?\]|～|、/g, '').trim() === fullMatchedWord);
                return !isFullWordInDictionary;
            });
        });
        highlightRegex = new RegExp(`(${jpCharClass})(${safeSuffix})`, 'gu');
    } else if (japaneseMeaningWithGrammar === '～と～') {
        searchStrategy = 'and_particle';
        const particle = japaneseMeaningCleaned;
        const safeParticle = escapeRegExp(particle);
        const searchRegex = new RegExp(`(^|\\s)${safeParticle}(\\s|$)`, 'u');
        relevantSentences = StudyApp.data.exampleSentences.filter(sentence => searchRegex.test(sentence.jp));
        highlightRegex = new RegExp(`(^|\\s)(${safeParticle})(\\s|$)`, 'gu');
    } else if (japaneseMeaningWithGrammar.startsWith('～') && japaneseMeaningWithGrammar.includes('、')) {
        searchStrategy = 'conjunction';
        const particle = japaneseMeaningCleaned;
        const safeParticle = escapeRegExp(particle);
        const searchRegex = new RegExp(`${jpCharClass}${safeParticle}、`, 'u');
        relevantSentences = StudyApp.data.exampleSentences.filter(sentence => searchRegex.test(sentence.jp));
        highlightRegex = new RegExp(`(${jpCharClass})(${safeParticle}、)`, 'gu');
    } else {
        searchStrategy = 'general';
        const safeSearchTerm = escapeRegExp(japaneseMeaningCleaned);
        const searchRegex = new RegExp(`(^|[\\s、。])${safeSearchTerm}`, 'u');
        relevantSentences = StudyApp.data.exampleSentences.filter(sentence => searchRegex.test(sentence.jp));
        highlightRegex = new RegExp(`(^|[\\s、。])(${safeSearchTerm})`, 'gu');
    }
    if (relevantSentences.length === 0) {
        bodyEl.innerHTML = `<p style="color: #ffcdd2;">No example sentences found for "${displayTerm}".</p>`;
    } else {
        let html = `<h2>Examples for "${displayTerm}"</h2>`;
        relevantSentences.forEach((s, index) => {
            let highlightedSentence;
             if (searchStrategy === 'and_particle') {
                 highlightedSentence = s.jp.replace(highlightRegex, `$1<strong>$2</strong>$3`);
             } else {
                 highlightedSentence = s.jp.replace(highlightRegex, `$1<strong>$2</strong>`);
             }
            html += `<div class="sentence-entry"><p class="sentence-japanese">${index + 1}. ${highlightedSentence} <span class="speak-icon" onclick="speakJapanese('${s.jp}')">🔊</span></p><p class="sentence-bangla">(${s.bn})</p></div>`;
        });
        bodyEl.innerHTML = html;
    }
}

function closeSentenceModal() {
    if (StudyApp.elements.sentenceModal) {
        StudyApp.elements.sentenceModal.style.display = 'none';
    }
}

async function showMnemonic(banglaWord) {
    const wordData = StudyApp.data.dictionary[banglaWord];
    if (!wordData || !wordData.en) {
        alert('No English translation available to search for a mnemonic for this word.');
        return;
    }

    const modal = StudyApp.elements.mnemonicModal;
    const modalBody = document.getElementById('mnemonic-modal-body');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<p class="image-loading-text">Searching for a visual mnemonic...</p>';

    const englishWord = wordData.en;
    const japaneseWord = wordData.meaning;
    const apiKey = StudyApp.config.pexelsApiKey;

    if (!apiKey || apiKey === 'YOUR_PEXELS_API_KEY_HERE') {
        modalBody.innerHTML = '<p class="image-error-text">Pexels API Key not set.</p>';
        return;
    }

    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(englishWord)}&per_page=1`, {
            headers: {
                Authorization: apiKey
            }
        });

        if (!response.ok) throw new Error(`Pexels API error: ${response.statusText}`);

        const data = await response.json();
        let imageHtml = `<p class="image-loading-text">No image found for "${englishWord}".</p>`; // Default message

        if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            imageHtml = `
                <a href="${photo.url}" target="_blank" rel="noopener noreferrer" class="mnemonic-image-link">
                    <img src="${photo.src.large}" alt="Visual mnemonic for ${englishWord}">
                </a>
                <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" class="pexels-credit">Photo by ${photo.photographer} on Pexels</a>
            `;
        }
        
        modalBody.innerHTML = `
            <div class="mnemonic-word-info">
                <div class="mnemonic-bangla">${banglaWord}</div>
                <div class="mnemonic-japanese">${japaneseWord}<span class="speak-icon" onclick="speakJapanese('${japaneseWord}')">🔊</span></div>
            </div>
            ${imageHtml}
        `;

    } catch (error) {
        console.error('Error fetching image from Pexels:', error);
        modalBody.innerHTML = `<p class="image-error-text">${error.message}</p>`;
    }
}

function closeMnemonicModal() {
    if (StudyApp.elements.mnemonicModal) {
        StudyApp.elements.mnemonicModal.style.display = 'none';
    }
}


// NEW, CORRECTED DOMContentLoaded listener in study-session.js

document.addEventListener('DOMContentLoaded', () => {
    // --- INITIALIZATION ---
    let studyWordsList = [];
    
    // 1. Read the 'words' parameter from the current page's URL.
    const urlParams = new URLSearchParams(window.location.search);
    const wordsParam = urlParams.get('words');

    if (wordsParam) {
        // 2. Decode the parameter and split it back into an array.
        const decodedWords = decodeURIComponent(wordsParam);
        studyWordsList = decodedWords.split(',');
    }

    // 3. The N5_APP_DATA still needs to be loaded from localStorage.
    // This contains the full dictionary to look up the words from the URL.
    const fullData = JSON.parse(localStorage.getItem('N5_APP_DATA'));
    
    if (studyWordsList.length === 0 || !fullData) {
        StudyApp.elements.container.innerHTML = '<h1>Error</h1><p>No study list found or dictionary data is missing. Please go back and select words to study.</p>';
        return;
    }

    // The rest of the function remains the same...
    StudyApp.data.dictionary = fullData.dictionary;
    StudyApp.data.exampleSentences = fullData.exampleSentences;
    StudyApp.data.studyWords = studyWordsList;

    let currentStudyWord = null;
    
    function renderStudyPage() {
        // ... (the rest of your study page rendering logic)
        // No changes are needed inside renderStudyPage or its helper functions.
        let wordListHtml = StudyApp.data.studyWords.map(word => {
            const entry = StudyApp.data.dictionary[word];
            if (!entry) return ''; // Add a check in case a word isn't found
            const hasEnglishTerm = !!entry.en;
            
            return `<div class="study-list-item">
                        <div>
                            <span class="word-bangla">${word}</span>
                            <span class="word-japanese">${entry.meaning}</span>
                        </div>
                        <div class="study-item-actions">
                            ${hasEnglishTerm ? `<button class="card-action-btn mnemonic" title="Show Mnemonic" onclick="showMnemonic('${word.replace(/'/g, "\\'")}')">🖼️</button>` : ''}
                            <button class="card-action-btn examples" title="Show Examples" onclick="showExampleSentences('${word.replace(/'/g, "\\'")}')">📝</button>
                        </div>
                    </div>`;
        }).join('');

        StudyApp.elements.container.innerHTML = `
            <div class="study-session-grid">
                <div class="section-box flashcard-practice-area">
                    <h3 style="text-align:center;">Flashcard Practice</h3>
                    <div class="random-word-container">
                        <div class="flashcard-container">
                            <div id="flashcard-content" class="flashcard-content">
                                <p>Click the button below to start practicing the words from your list.</p>
                            </div>
                        </div>
                        <div class="random-word-controls">
                            <button id="get-study-word-btn" class="control-button">Start Practice</button>
                            <button id="show-study-meaning-btn" class="control-button" style="display:none;">Show Meaning</button>
                        </div>
                    </div>
                </div>
                <div class="section-box study-word-list-area">
                    <h3>Your Study List (${StudyApp.data.studyWords.length} words)</h3>
                    <div class="study-list-container">
                        ${wordListHtml}
                    </div>
                </div>
            </div>
        `;
        
        StudyApp.elements.sentenceModal = document.getElementById('sentence-modal');
        StudyApp.elements.mnemonicModal = document.getElementById('mnemonic-modal');

        if (StudyApp.elements.sentenceModal) {
             StudyApp.elements.sentenceModal.querySelector('.modal-close').addEventListener('click', closeSentenceModal);
        }
        if (StudyApp.elements.mnemonicModal) {
             StudyApp.elements.mnemonicModal.querySelector('.modal-close').addEventListener('click', closeMnemonicModal);
        }

        document.getElementById('get-study-word-btn').addEventListener('click', getRandomStudyWord);
        document.getElementById('show-study-meaning-btn').addEventListener('click', toggleStudyWordMeaning);
    }
    
    function getRandomStudyWord() {
        const getBtn = document.getElementById('get-study-word-btn');
        if (StudyApp.data.practiceList.length === 0) {
            StudyApp.data.practiceList = [...StudyApp.data.studyWords].sort(() => Math.random() - 0.5);
            getBtn.textContent = 'Next Word';
        }

        currentStudyWord = StudyApp.data.practiceList.pop();
        
        const content = document.getElementById('flashcard-content');
        content.innerHTML = `<div class="word-display">${currentStudyWord}</div>`;
        
        const btn = document.getElementById('show-study-meaning-btn');
        btn.textContent = 'Show Meaning';
        btn.style.display = 'inline-block';

        if (StudyApp.data.practiceList.length === 0) {
            getBtn.textContent = 'Start Over';
        }
    }

    function toggleStudyWordMeaning() {
        if (!currentStudyWord) return;
        const btn = document.getElementById('show-study-meaning-btn');
        const cardContent = document.getElementById('flashcard-content');
        
        cardContent.classList.add('flipping');
        setTimeout(() => {
            if (btn.textContent === 'Show Meaning') {
                const { meaning } = StudyApp.data.dictionary[currentStudyWord];
                cardContent.innerHTML = `<div class="meaning-display">${meaning}<span class="speak-icon" onclick="speakJapanese('${meaning}')">🔊</span></div>`;
                btn.textContent = 'Show Word';
            } else {
                cardContent.innerHTML = `<div class="word-display">${currentStudyWord}</div>`;
                btn.textContent = 'Show Meaning';
            }
            cardContent.classList.remove('flipping');
        }, 300);
    }
    
    renderStudyPage();
});