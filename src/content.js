// Content script for detecting links in selected text

// メッセージリスナー：選択範囲内のリンクを検出
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedLinks') {
        const links = getLinksFromSelection();
        sendResponse({ links: links });
    }
    return true;
});

// 選択範囲内のリンクを取得
function getLinksFromSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return [];

    const range = selection.getRangeAt(0);
    const container = range.cloneContents();

    // リンク要素を取得
    const linkElements = container.querySelectorAll('a');
    const links = [];

    linkElements.forEach(link => {
        const href = link.href;
        const text = link.textContent.trim();
        if (href) {
            links.push({
                url: href,
                text: text
            });
        }
    });

    // 選択範囲自体がリンクの場合も確認
    const commonAncestor = range.commonAncestorContainer;
    if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
        const linkElement = commonAncestor.closest('a');
        if (linkElement && linkElement.href) {
            // 既に追加されていなければ追加
            const alreadyExists = links.some(l => l.url === linkElement.href);
            if (!alreadyExists) {
                links.unshift({
                    url: linkElement.href,
                    text: linkElement.textContent.trim()
                });
            }
        }
    } else if (commonAncestor.parentElement) {
        const linkElement = commonAncestor.parentElement.closest('a');
        if (linkElement && linkElement.href) {
            const alreadyExists = links.some(l => l.url === linkElement.href);
            if (!alreadyExists) {
                links.unshift({
                    url: linkElement.href,
                    text: linkElement.textContent.trim()
                });
            }
        }
    }

    return links;
}
