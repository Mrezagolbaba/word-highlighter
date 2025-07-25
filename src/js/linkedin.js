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
            
            if (contentElement || Date.now() - startTime > 3000) {
                resolve();
            } else {
                setTimeout(checkForContent, 100);
            }
        };
        
        const startTime = Date.now();
        checkForContent();
    });
}