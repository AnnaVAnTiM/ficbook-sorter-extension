function log(message) {
    console.log(`[Ficbook Sorter] ${message}`);
}

async function extractRequestsFromPage(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const requestBlocks = doc.querySelectorAll('.request-thumb');
    return Array.from(requestBlocks).map((request) => {
        const likeCountElement = request.querySelector('.request-likes-counter');
        const likesText = likeCountElement ? likeCountElement.textContent.trim() : '0';
        const likes = parseInt(likesText) || 0;
        return {
            element: request,
            likes: likes
        };
    });
}

async function extractAllRequests() {
    const currentUrl = new URL(window.location.href);
    const baseUrl = `${currentUrl.origin}${currentUrl.pathname}${currentUrl.search}`;

    let allRequests = [];
    let page = 1;
    const maxPages = 100; // Ограничение на максимальное количество страниц
    const batchSize = 5; // Количество страниц, загружаемых одновременно

    while (page <= maxPages) {
        const batchPromises = [];
        for (let i = 0; i < batchSize && page <= maxPages; i++, page++) {
            const url = `${baseUrl}&p=${page}`;
            batchPromises.push(extractRequestsFromPage(url));
        }

        const batchResults = await Promise.all(batchPromises);
        let isEmpty = true;
        for (const requests of batchResults) {
            if (requests.length > 0) {
                isEmpty = false;
                allRequests = allRequests.concat(requests);
            }
        }

        if (isEmpty) {
            log(`No requests found in the last batch. Stopping.`);
            break;
        }

        log(`Extracted requests up to page ${page - 1}`);
    }

    log(`Extracted ${allRequests.length} requests in total`);
    return allRequests;
}

function sortRequestsByLikes(requests) {
    log(`Sorting ${requests.length} requests`);
    return requests.sort((a, b) => b.likes - a.likes);
}

function updateDOM(sortedRequests) {
    const container = document.querySelector('.request-area');
    if (!container) {
        log('Container for requests not found');
        return;
    }
    log(`Updating DOM with ${sortedRequests.length} sorted requests`);
    container.innerHTML = '';
    sortedRequests.forEach(request => {
        container.appendChild(request.element.cloneNode(true));
    });
    log('DOM updated with sorted requests');
}

function addSortButton() {
    log('Adding sort button');
    const existingButton = document.getElementById('ficbook-sort-button');
    if (existingButton) {
        log('Sort button already exists, removing old one');
        existingButton.remove();
    }

    const button = document.createElement('button');
    button.id = 'ficbook-sort-button';
    button.textContent = 'Сортировать по лайкам';
    button.style.cssText = 'position: fixed; top: 70px; right: 20px; z-index: 10000; padding: 10px; background-color: #4CAF50; color: white; border: none; cursor: pointer;';
    button.onclick = async () => {
        log('Sort button clicked');
        button.disabled = true;
        button.textContent = 'Сортировка...';
        try {
            const requests = await extractAllRequests();
            log(`Extracted ${requests.length} requests`);
            const sortedRequests = sortRequestsByLikes(requests);
            updateDOM(sortedRequests);
            log('Sorting completed');
        } catch (error) {
            console.error('[Ficbook Sorter] Error during sorting:', error);
        } finally {
            button.disabled = false;
            button.textContent = 'Сортировать по лайкам';
        }
    };

    document.body.appendChild(button);
    log('Sort button added to the page');
}

function init() {
    log('Initializing Ficbook Sorter');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSortButton);
    } else {
        addSortButton();
    }
}

// Проверяем, что мы на нужной странице
if (window.location.href.includes('ficbook.net/requests')) {
    init();
    log('Content script loaded and initialized');
} else {
    log('Not on the requests page, script not initialized');
}