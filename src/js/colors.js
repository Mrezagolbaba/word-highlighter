const colorPalette = [
    '#FFD700',
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#32CD32',
    '#FF8C00',
    '#DA70D6',
    '#00CED1',
    '#FFB347',
    '#9370DB'
];

const darkColorPalette = [
    '#F39C12',
    '#E74C3C',
    '#1ABC9C',
    '#3498DB',
    '#2ECC71',
    '#F1C40F',
    '#9B59B6',
    '#E67E22',
    '#16A085',
    '#8E44AD'
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

function updateDarkMode(darkMode) {
    isDarkMode = darkMode;
    const colors = getHighlightColors();

    document.querySelectorAll('.extension-highlight').forEach(highlight => {
        if (highlight === allHighlights[currentHighlightIndex]) {
            highlight.style.backgroundColor = colors.current;
        } else {
            const word = highlight.dataset.word;
            const wordIndex = highlightedWords.indexOf(word);
            highlight.style.backgroundColor = getColorForWord(word, wordIndex);
        }
    });
}