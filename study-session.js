// study-session.js (FINAL, COMPLETE, AND CORRECTED)

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
        sentenceModal: document.getElementById('sentence-modal'),
        mnemonicModal: document.getElementById('mnemonic-modal'),
    },
    config: {
        pexelsApiKey: '0YZ1YqOAGmfXwoIBl7elGumGGMYqwrOJgwqyqstQuMEGtyPJjiFFNr3K'
    }
};

// --- GLOBAL HELPER FUNCTIONS (callable from HTML) ---

function speakJapanese(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function showExampleSentences(banglaWord) {
    const wordData = StudyApp.data.dictionary[banglaWord];
    if (!wordData) {
        alert("Could not find data for this word.");
        return;
    }
    
    const japaneseSearchTerm = wordData.meaning.replace(/\[.*?\]|～|、/g, '').trim();
    const modal = StudyApp.elements.sentenceModal;
    const wordEl = modal.querySelector('#sentence-modal-word');
    const bodyEl = modal.querySelector('#sentence-modal-body');

    wordEl.textContent = japaneseSearchTerm;
    bodyEl.innerHTML = '<p>Searching for example sentences...</p>';
    modal.style.display = 'flex';

    const relevantSentences = StudyApp.data.exampleSentences.filter(sentence => {
        const searchRegex = new RegExp(escapeRegExp(japaneseSearchTerm), 'u');
        return searchRegex.test(sentence.jp);
    });
    
    if (relevantSentences.length === 0) {
        bodyEl.innerHTML = `<p style="color: #ffcdd2;">No example sentences found for "${japaneseSearchTerm}".</p>`;
    } else {
        const highlightRegex = new RegExp(escapeRegExp(japaneseSearchTerm), 'g');
        let html = `<h2>Examples for "${japaneseSearchTerm}"</h2>`;
        relevantSentences.forEach((s, index) => {
            const highlightedSentence = s.jp.replace(highlightRegex, `<strong>${japaneseSearchTerm}</strong>`);
            html += `
                <div class="sentence-entry">
                    <p class="sentence-japanese">${index + 1}. ${highlightedSentence} <span class="speak-icon" onclick="speakJapanese('${s.jp.replace(/'/g, "\\'")}')">🔊</span></p>
                    <p class="sentence-bangla">(${s.bn})</p>
                </div>
            `;
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
    const modalBody = modal.querySelector('#mnemonic-modal-body');
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
            headers: { Authorization: apiKey }
        });

        if (!response.ok) throw new Error(`Pexels API error: ${response.statusText}`);

        const data = await response.json();
        let imageHtml = `<p class="image-loading-text">No image found for "${englishWord}".</p>`;

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


// --- MAIN APP LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    let studyWordsList = [];
    
    // 1. Try to get the data package from localStorage.
    const studyPackageStr = localStorage.getItem('studySessionData');
    
    if (studyPackageStr) {
        try {
            const studyPackage = JSON.parse(studyPackageStr);
            
            // 2. Check if the data is recent (created within the last 10 seconds).
            const isRecent = (Date.now() - studyPackage.timestamp) < 10000;

            if (studyPackage.words && isRecent) {
                studyWordsList = studyPackage.words;
            }

            // 3. Clean up localStorage immediately after reading it.
            localStorage.removeItem('studySessionData');

        } catch (e) {
            console.error("Failed to parse study session data:", e);
            studyWordsList = [];
        }
    }

    // 4. Load the main dictionary from localStorage as before.
    const fullData = JSON.parse(localStorage.getItem('N5_APP_DATA'));

    // 5. Critical Check: Ensure both lists exist before continuing.
    if (studyWordsList.length === 0 || !fullData || !fullData.dictionary) {
        StudyApp.elements.container.innerHTML = '<h1>Error</h1><p>No study list found or dictionary data is missing. Please go back to the main page and select your words again.</p>';
        return;
    }

    // --- Populate Global State ---
    StudyApp.data.dictionary = fullData.dictionary;
    StudyApp.data.exampleSentences = fullData.exampleSentences || [];
    StudyApp.data.studyWords = studyWordsList;
    
    let currentStudyWord = null;
    
    function renderStudyPage() {
        let wordListHtml = StudyApp.data.studyWords.map(word => {
            const entry = StudyApp.data.dictionary[word];
            if (!entry) return '';
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
        
        setTimeout(() => {
            if (btn.textContent === 'Show Meaning') {
                const entry = StudyApp.data.dictionary[currentStudyWord];
                if(entry) {
                    cardContent.innerHTML = `<div class="meaning-display">${entry.meaning}<span class="speak-icon" onclick="speakJapanese('${entry.meaning}')">🔊</span></div>`;
                    btn.textContent = 'Show Word';
                }
            } else {
                cardContent.innerHTML = `<div class="word-display">${currentStudyWord}</div>`;
                btn.textContent = 'Show Meaning';
            }
        }, 150);
    }
    
    // Initial render call
    renderStudyPage();

    // Attach listeners for modals which are in the main HTML
    if (StudyApp.elements.sentenceModal) {
        StudyApp.elements.sentenceModal.querySelector('.modal-close').addEventListener('click', closeSentenceModal);
    }
    if (StudyApp.elements.mnemonicModal) {
        StudyApp.elements.mnemonicModal.querySelector('.modal-close').addEventListener('click', closeMnemonicModal);
    }
});