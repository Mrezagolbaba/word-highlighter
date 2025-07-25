let highlightedWords = [];

function fixHiddenHighlight(span) {
    const computedStyle = window.getComputedStyle(span);
    
    const isHidden = computedStyle.opacity === '0' || 
                    computedStyle.visibility === 'hidden' ||
                    computedStyle.display === 'none';
    
    const backgroundColor = computedStyle.backgroundColor;
    
    if (isHidden || backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
      
        span.style.opacity = '1';
        span.style.visibility = 'visible';
        span.style.display = 'inline';
        span.style.border = '1px solid rgba(0,0,0,0.3)';
        span.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        
        // Make sure the background color is applied
        const wordIndex = highlightedWords.indexOf(span.dataset.word);
        span.style.backgroundColor = getColorForWord(span.dataset.word, wordIndex) + ' !important';
    }
}

function expandCollapsedContent() {
    const expandSelectors = [
        '[aria-expanded="false"]',
        '.job-card-container--clickable',
        '.job-card-list__entity-lockup',
        '.jobs-job-board-list__item',
        '.ember-application .jobs-search-results-list',
        '.jobs-search-box__container',
        '.jobs-details',
        '.jobs-unified-top-card'
    ];
    
    expandSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            if (element.getAttribute('aria-expanded') === 'false') {
                element.style.maxHeight = 'none';
                element.style.overflow = 'visible';
                element.setAttribute('aria-expanded', 'true');
            }
            
            const showMoreBtn = element.querySelector('[aria-label*="Show more"], [aria-label*="show more"], .jobs-description-details__show-more-button');
            if (showMoreBtn && showMoreBtn.style.display !== 'none') {
                showMoreBtn.click();
            }
        });
    });
}

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
let currentHighlightIndex = -1;
let allHighlights = [];
let observer;
let isDarkMode = false;
let scrollTimeout;
let lastUrl = location.href;

const colorPalette = [
    '#FFD700', // Gold
    '#FF6B6B', // Coral red
    '#4ECDC4', // Teal
    '#45B7D1', // Sky blue
    '#32CD32', // Lime green
    '#FF8C00', // Dark orange
    '#DA70D6', // Orchid
    '#00CED1', // Dark turquoise
    '#FFB347', // Peach
    '#9370DB'  // Medium purple
];

const darkColorPalette = [
    '#F39C12', // Orange
    '#E74C3C', // Red
    '#1ABC9C', // Turquoise
    '#3498DB', // Blue
    '#2ECC71', // Green
    '#F1C40F', // Yellow
    '#9B59B6', // Purple
    '#E67E22', // Dark orange
    '#16A085', // Dark turquoise
    '#8E44AD'  // Dark purple
];

function getHighlightColors() {
    const palette = isDarkMode ? darkColorPalette : colorPalette;
    return {
        normal: palette,
        current: isDarkMode ? '#FF6B35' : '#FF4757' 
    };
}

function getColorForWord(word, index) {
    const colors = getHighlightColors();
    return colors.normal[index % colors.normal.length];
}

function countWords(words) {
    const counts = {};
    words.forEach(word => {
        if (word.trim().length === 0) return;
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
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

    if (newContent === document.body) {
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

        
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
        const walker = document.createTreeWalker(
            newContent,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentNode;
                    if (!parent || 
                        parent.classList?.contains('extension-highlight') ||
                        ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'HEAD'].includes(parent.tagName) ||
                        node.textContent.trim().length === 0) {
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
        
        let matchCount = 0;

        nodes.forEach(node => {
            const content = node.textContent;
            if (content.match(regex)) {
                matchCount++;
                
                const fragment = document.createDocumentFragment();
                const parts = content.split(regex);

                parts.forEach((part, i) => {
                    if (i % 2 === 1) {  // This is a match
                        const span = document.createElement('span');
                        span.className = 'extension-highlight';
                        const wordIndex = highlightedWords.indexOf(word);
                        span.style.backgroundColor = getColorForWord(word, wordIndex);
                        span.style.color = '#000';
                        span.style.fontWeight = '500'; 
                        span.style.padding = '1px 2px';
                        span.style.borderRadius = '3px';
                        span.style.position = 'relative';
                        span.style.zIndex = '1000'; 
                        span.dataset.word = word;
                        span.textContent = part;
                        
                        setTimeout(() => {
                            fixHiddenHighlight(span);
                        }, 0);
                        
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

    countWords(words);

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
    
    if (currentHighlightIndex >= 0) {
        allHighlights[currentHighlightIndex].style.backgroundColor = colors.normal;
        const oldIndicator = allHighlights[currentHighlightIndex].querySelector('.highlight-indicator');
        if (oldIndicator) oldIndicator.remove();
    }

    if (currentHighlightIndex >= allHighlights.length - 1) {
        currentHighlightIndex = 0; 
    } else {
        currentHighlightIndex++; 
    }
    
    const highlight = allHighlights[currentHighlightIndex];
    highlight.style.backgroundColor = colors.current;

    const indicator = document.createElement('div');
    indicator.className = 'highlight-indicator';
    highlight.appendChild(indicator);

    highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });

    chrome.runtime.sendMessage({
        action: 'updatePosition',
        current: currentHighlightIndex + 1,
        total: allHighlights.length
    });
}
function findPrev() {
    if (allHighlights.length === 0) return;
    
    const colors = getHighlightColors();
    
    if (currentHighlightIndex >= 0) {
        allHighlights[currentHighlightIndex].style.backgroundColor = colors.normal;
        const oldIndicator = allHighlights[currentHighlightIndex].querySelector('.highlight-indicator');
        if (oldIndicator) oldIndicator.remove();
    }

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

    highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });

    chrome.runtime.sendMessage({
        action: 'updatePosition',
        current: currentHighlightIndex + 1,
        total: allHighlights.length
    });
}

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

chrome.runtime.onMessage.addListener(function (request) {
    switch (request.action) {
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
        case 'updateDarkMode':
            updateDarkMode(request.darkMode);
            break;
    }
});

function waitForLinkedInContent() {
    return new Promise((resolve) => {
        const checkForContent = () => {
            const selectors = [
                '[role="main"]',
                '.core-rail',
                '.feed-container-theme',
                '.scaffold-layout__main',
                '.application-outlet',
                '.feed-container'
            ];
            
            const contentElement = selectors.find(selector => document.querySelector(selector));
            
            if (contentElement || Date.now() - startTime > 3000) { /
                resolve();
            } else {
                setTimeout(checkForContent, 100);
            }
        };
        
        const startTime = Date.now();
        checkForContent();
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