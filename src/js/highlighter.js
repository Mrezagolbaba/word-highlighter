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
        
        const wordIndex = highlightedWords.indexOf(span.dataset.word);
        span.style.backgroundColor = getColorForWord(span.dataset.word, wordIndex) + ' !important';
    }
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
                    if (i % 2 === 1) {
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