function findNext() {
    if (allHighlights.length === 0) return;
    
    const colors = getHighlightColors();
    
    if (currentHighlightIndex >= 0) {
        const prevHighlight = allHighlights[currentHighlightIndex];
        const word = prevHighlight.dataset.word;
        const wordIndex = highlightedWords.indexOf(word);
        prevHighlight.style.backgroundColor = getColorForWord(word, wordIndex);
        prevHighlight.style.boxShadow = 'none';
        const oldIndicator = prevHighlight.querySelector('.highlight-indicator');
        if (oldIndicator) oldIndicator.remove();
    }

    if (currentHighlightIndex >= allHighlights.length - 1) {
        currentHighlightIndex = 0; 
    } else {
        currentHighlightIndex++; 
    }
    
    const highlight = allHighlights[currentHighlightIndex];
    highlight.style.backgroundColor = colors.current;
    highlight.style.boxShadow = '0 0 8px rgba(255, 71, 87, 0.6)';

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
        const prevHighlight = allHighlights[currentHighlightIndex];
        const word = prevHighlight.dataset.word;
        const wordIndex = highlightedWords.indexOf(word);
        prevHighlight.style.backgroundColor = getColorForWord(word, wordIndex);
        prevHighlight.style.boxShadow = 'none';
        const oldIndicator = prevHighlight.querySelector('.highlight-indicator');
        if (oldIndicator) oldIndicator.remove();
    }

    if (currentHighlightIndex <= 0) {
        currentHighlightIndex = allHighlights.length - 1;
    } else {
        currentHighlightIndex--;
    }
    
    const highlight = allHighlights[currentHighlightIndex];
    highlight.style.backgroundColor = colors.current;
    highlight.style.boxShadow = '0 0 8px rgba(255, 71, 87, 0.6)';

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