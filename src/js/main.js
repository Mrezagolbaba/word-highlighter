let highlightedWords = [];
let currentHighlightIndex = -1;
let allHighlights = [];
let observer;
let isDarkMode = false;
let scrollTimeout;
let lastUrl = location.href;

window.debugWordHighlighter = function() {
    console.log('=== Word Highlighter Debug Info ===');
    console.log('Current words:', highlightedWords);
    console.log('All highlights found:', allHighlights.length);
    console.log('Page text sample:', document.body.innerText.substring(0, 500));
    console.log('LinkedIn content elements:');
    const linkedinSelectors = ['[role="main"]', '.core-rail', '.feed-container-theme', '.scaffold-layout__main', '.application-outlet', '.feed-container'];
    linkedinSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        console.log(selector + ':', el ? 'Found' : 'Not found');
    });
    
    console.log('Collapsed elements:', document.querySelectorAll('[aria-expanded="false"]').length);
};

chrome.runtime.onMessage.addListener(function(request) {
    switch(request.action) {
        case 'updateHighlights':
            highlightedWords = request.words;
            if (window.location.hostname.includes('linkedin.com')) {
                expandCollapsedContent();
                setTimeout(() => highlightWords(highlightedWords), 100);
            } else {
                highlightWords(highlightedWords);
            }
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

function setupInfiniteScrollObserver() {
    if (observer) {
        observer.disconnect();
    }

    let mutationTimeout;
    observer = new MutationObserver((mutations) => {
        clearTimeout(mutationTimeout);
        
        let hasSignificantChanges = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const textContent = node.textContent || '';
                        if (textContent.trim().length > 10) { 
                            hasSignificantChanges = true;
                        }
                    }
                });
            }
        });

        if (hasSignificantChanges && highlightedWords.length > 0) {
            mutationTimeout = setTimeout(() => {
                highlightWords(highlightedWords);
            }, 200);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true, 
        attributeFilter: [] 
    });
}

async function initialize() {
    if (window.location.hostname.includes('linkedin.com')) {
        await waitForLinkedInContent();
    }
    
    if (window.location.hostname.includes('linkedin.com')) {
        expandCollapsedContent();
        setTimeout(() => {
            loadAndHighlight();
        }, 200);
    } else {
        loadAndHighlight();
    }
}

function loadAndHighlight() {
    chrome.storage.local.get(['highlightWords', 'darkMode'], function (result) {
        isDarkMode = result.darkMode || false;
        if (result.highlightWords) {
            highlightedWords = result.highlightWords;
            highlightWords(highlightedWords);
        }
    });

    setupInfiniteScrollObserver();

    let urlChangeTimeout;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            clearTimeout(urlChangeTimeout);
            
            const delay = window.location.hostname.includes('linkedin.com') ? 1000 : 500;
            
            urlChangeTimeout = setTimeout(() => {
                const checkContent = () => {
                    const mainContent = document.querySelector('[role="main"], .core-rail, .feed-container-theme');
                    if (mainContent || Date.now() - urlChangeStart > 3000) {
                        highlightWords(highlightedWords);
                        setupInfiniteScrollObserver();
                    } else {
                        setTimeout(checkContent, 100);
                    }
                };
                const urlChangeStart = Date.now();
                checkContent();
            }, delay);
        }
    }).observe(document, { subtree: true, childList: true });

    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (highlightedWords.length > 0) {
                highlightWords(highlightedWords);
            }
        }, 300);
    }, { passive: true });
}

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}