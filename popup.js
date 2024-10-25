// popup.js
let currentWords = [];
let wordCounts = {};

document.addEventListener('DOMContentLoaded', function() {
    const wordInput = document.getElementById('wordInput');
    const addButton = document.getElementById('addButton');
    const wordList = document.getElementById('wordList');
    const nextButton = document.getElementById('nextButton');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const totalCountElement = document.getElementById('totalCount');
    const currentPositionElement = document.getElementById('currentPosition');

    // Load saved settings
    chrome.storage.local.get(['darkMode', 'highlightWords', 'wordCounts'], function(result) {
        if (result.highlightWords) {
            currentWords = result.highlightWords;
            wordCounts = result.wordCounts || {};
            updateWordList();
        }
        if (result.darkMode) {
            darkModeToggle.checked = result.darkMode;
            document.body.classList.toggle('dark-mode', result.darkMode);
        }
    });

    // Update counts when received from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateWordCounts') {
            wordCounts = request.counts;
            updateWordList();
            updateTotalCount();
        } else if (request.action === 'updatePosition') {
            currentPositionElement.textContent = 
                `${request.current} / ${request.total}`;
        }
    });

    function updateTotalCount() {
        const total = Object.values(wordCounts).reduce((a, b) => a + b, 0);
        totalCountElement.textContent = total;
    }

    function addWord() {
        const word = wordInput.value.trim();
        if (!currentWords.includes(word) && word) {
            currentWords.push(word);
            updateWordList();
            saveWords();
        }
        wordInput.value = '';
        wordInput.focus();
    }

    function updateWordList() {
        wordList.innerHTML = '';
        currentWords.forEach((word, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            
            const count = wordCounts[word] || 0;
            wordItem.innerHTML = `
                <div class="word-info">
                    <span class="word-text">${word}</span>
                    <span class="word-count">${count}</span>
                </div>
                <button class="delete-btn" data-index="${index}" aria-label="Delete word">
                    <i class="lucide lucide-trash-2"></i>
                </button>
            `;
            wordList.appendChild(wordItem);
        });
    
        // Add delete button listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                delete wordCounts[currentWords[index]];
                currentWords.splice(index, 1);
                updateWordList();
                saveWords();
            });
        });
    
        updateTotalCount();
    }

    function saveWords() {
        chrome.storage.local.set({ 
            highlightWords: currentWords,
            wordCounts: wordCounts
        }, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateHighlights',
                    words: currentWords
                });
            });
        });
    }

    // Event listeners
    wordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && wordInput.value.trim()) {
            addWord();
        }
    });

    addButton.addEventListener('click', function() {
        if (wordInput.value.trim()) {
            addWord();
        }
    });

    nextButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'findNext'
            });
        });
    });
    
    prevButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'findPrev'
            });
        });
    });

    darkModeToggle.addEventListener('change', function() {
        const isDarkMode = darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        chrome.storage.local.set({ darkMode: isDarkMode });
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateDarkMode',
                darkMode: isDarkMode
            });
        });
    });
});