let highlightedWords = [];
let currentHighlightIndex = -1;
let allHighlights = [];
let observer;
let isDarkMode = false;
let scrollTimeout;
let lastUrl = location.href;

function getHighlightColors() {
    return isDarkMode ? {
        normal: '#10b981',  // Subdued yellow for dark mode
        current: '#8b5cf6'   // Subdued orange for dark mode
    } : {
        normal: '#10b981',
        current: '#8b5cf6'  // Orange
    };
}

function countWords(words) {
    const counts = {};
    words.forEach(word => {
        if (word.trim().length === 0) return;
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const text = document.body.innerText;
        const matches = text.match(regex);
        counts[word] = matches ? matches.length : 0;
    });

    // Send counts back to popup
    chrome.runtime.sendMessage({
        action: 'updateWordCounts',
        counts: counts
    });

    return counts;
}

function highlightWords(words, newContent = document.body) {
    const colors = getHighlightColors();

    // If highlighting new content, don't clear existing highlights
    if (newContent === document.body) {
        // Remove existing highlights only when scanning entire page
        const highlights = document.querySelectorAll('.extension-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        });
        allHighlights = [];
        currentHighlightIndex = -1;
    }

    // Add new highlights
    words.forEach(word => {
        if (word.trim().length === 0) return;

        // Use word boundary in regex to match whole words only
        const regex = new RegExp(`\\b(${word})\\b`, 'gi');
        const walker = document.createTreeWalker(
            newContent,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    // Skip if parent is already highlighted or is a script/style
                    if (node.parentNode.classList?.contains('extension-highlight') ||
                        ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(node.parentNode.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            nodes.push(node);
        }

        nodes.forEach(node => {
            const content = node.textContent;
            if (content.match(regex)) {
                const fragment = document.createDocumentFragment();
                const parts = content.split(regex);

                parts.forEach((part, i) => {
                    if (i % 2 === 1) {  // This is a match
                        const span = document.createElement('span');
                        span.className = 'extension-highlight';
                        span.style.backgroundColor = colors.normal;
                        span.textContent = part;
                        fragment.appendChild(span);
                        allHighlights.push(span);
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });

                node.parentNode.replaceChild(fragment, node);
            }
        });
    });

    // Count words and update popup
    countWords(words);

    // Update current/total in popup
    if (allHighlights.length > 0) {
        chrome.runtime.sendMessage({
            action: 'updatePosition',
            current: currentHighlightIndex + 1,
            total: allHighlights.length
        });
    }
}

function findNext() {
    if (allHighlights.length === 0) return;
    
    const colors = getHighlightColors();
    
    // Remove focus from previous highlight
    if (currentHighlightIndex >= 0) {
        allHighlights[currentHighlightIndex].style.backgroundColor = colors.normal;
        const oldIndicator = allHighlights[currentHighlightIndex].querySelector('.highlight-indicator');
        if (oldIndicator) oldIndicator.remove();
    }

    // Move to next highlight
    if (currentHighlightIndex >= allHighlights.length - 1) {
        currentHighlightIndex = 0; // Reset to beginning if at end
    } else {
        currentHighlightIndex++; // Move to next
    }
    
    // Focus on new highlight
    const highlight = allHighlights[currentHighlightIndex];
    highlight.style.backgroundColor = colors.current;

    // Add position indicator
    const indicator = document.createElement('div');
    indicator.className = 'highlight-indicator';
    highlight.appendChild(indicator);

    // Scroll to the highlight
    highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });

    // Update position in popup
    chrome.runtime.sendMessage({
        action: 'updatePosition',
        current: currentHighlightIndex + 1,
        total: allHighlights.length
    });
}
function findPrev() {
    if (allHighlights.length === 0) return;
    
    const colors = getHighlightColors();
    
    // Remove focus from previous highlight
    if (currentHighlightIndex >= 0) {
        allHighlights[currentHighlightIndex].style.backgroundColor = colors.normal;
        const oldIndicator = allHighlights[currentHighlightIndex].querySelector('.highlight-indicator');
        if (oldIndicator) oldIndicator.remove();
    }

    // Move to previous highlight
    if (currentHighlightIndex <= 0) {
        currentHighlightIndex = allHighlights.length - 1; // Go to end if at beginning
    } else {
        currentHighlightIndex--; // Move to previous
    }
    
    // Focus on new highlight
    const highlight = allHighlights[currentHighlightIndex];
    highlight.style.backgroundColor = colors.current;

    // Add position indicator
    const indicator = document.createElement('div');
    indicator.className = 'highlight-indicator';
    highlight.appendChild(indicator);

    // Scroll to the highlight
    highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });

    // Update position in popup
    chrome.runtime.sendMessage({
        action: 'updatePosition',
        current: currentHighlightIndex + 1,
        total: allHighlights.length
    });
}

// Update your message listener in content.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action) {
        case 'updateHighlights':
            highlightedWords = request.words;
            highlightWords(highlightedWords);
            break;
        case 'findNext':
            findNext();
            break;
        case 'findPrev':
            findPrev();
            break;
        case 'updateDarkMode':
            updateDarkMode(request.darkMode);
            break;
    }
});

// Add these buttons to popup.html navigation-buttons div:

function setupInfiniteScrollObserver() {
    // Disconnect existing observer if any
    if (observer) {
        observer.disconnect();
    }

    // Configure the observer
    observer = new MutationObserver((mutations) => {
        let shouldHighlight = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        shouldHighlight = true;
                    }
                });
            }
        });

        if (shouldHighlight && highlightedWords.length > 0) {
            // Debounce the highlight call
            clearTimeout(window.highlightDebounce);
            window.highlightDebounce = setTimeout(() => {
                highlightWords(highlightedWords);
            }, 100);
        }
    });

    // Start observing with optimized config
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false,
        attributeFilter: [] // Don't observe attributes
    });
}

function updateDarkMode(darkMode) {
    isDarkMode = darkMode;
    const colors = getHighlightColors();

    document.querySelectorAll('.extension-highlight').forEach(highlight => {
        if (highlight === allHighlights[currentHighlightIndex]) {
            highlight.style.backgroundColor = colors.current;
        } else {
            highlight.style.backgroundColor = colors.normal;
        }
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
        case 'updateHighlights':
            highlightedWords = request.words;
            highlightWords(highlightedWords);
            break;
        case 'findNext':
            findNext();
            break;
        case 'updateDarkMode':
            updateDarkMode(request.darkMode);
            break;
    }
});

// Initialize
function initialize() {
    // Load saved settings
    chrome.storage.local.get(['highlightWords', 'darkMode'], function (result) {
        isDarkMode = result.darkMode || false;
        if (result.highlightWords) {
            highlightedWords = result.highlightWords;
            highlightWords(highlightedWords);
        }
    });

    setupInfiniteScrollObserver();

    // Handle URL changes for SPAs
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            setTimeout(() => {
                highlightWords(highlightedWords);
                setupInfiniteScrollObserver();
            }, 500);
        }
    }).observe(document, { subtree: true, childList: true });

    // Handle scrolling
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (highlightedWords.length > 0) {
                highlightWords(highlightedWords);
            }
        }, 300);
    }, { passive: true });
}

// Add CSS to head
const style = document.createElement('style');
style.textContent = `
    .extension-highlight {
        border-radius: 2px;
        transition: background-color 0.3s ease;
        position: relative;
    }
    
    .highlight-indicator {
        position: absolute;
        right: -10px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid ${isDarkMode ? '#FFA500' : '#FF4500'};
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
        animation: bounce 1s infinite;
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(-50%); }
        50% { transform: translateY(-30%); }
    }

    @media (prefers-color-scheme: dark) {
        .extension-highlight {
            color: #000;
            mix-blend-mode: screen;
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}