// Popup script for saving link memos

// DOM要素
const urlInput = document.getElementById('url');
const memoInput = document.getElementById('memo');
const tagsInput = document.getElementById('tags');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const successMessage = document.getElementById('successMessage');

// 初期化
async function init() {
    // 一時保存されたデータを取得
    chrome.storage.local.get(['pendingUrl', 'pendingTitle', 'pendingSelectionText', 'pendingSelectedLinks', 'isSelection'], (result) => {
        if (result.isSelection && (result.pendingSelectionText || result.pendingSelectedLinks)) {
            let urls = [];

            // Content Scriptから取得したリンクを優先
            if (result.pendingSelectedLinks && result.pendingSelectedLinks.length > 0) {
                urls = result.pendingSelectedLinks.map(link => link.url);
                console.log('リンク要素から抽出:', result.pendingSelectedLinks);
            }

            // テキストからもURLを抽出して追加
            if (result.pendingSelectionText) {
                const textUrls = extractURLsFromText(result.pendingSelectionText);
                // 重複を避けて追加
                textUrls.forEach(url => {
                    if (!urls.includes(url)) {
                        urls.push(url);
                    }
                });
            }

            if (urls.length === 0) {
                alert('選択範囲からURLが見つかりませんでした');
                window.close();
                return;
            }

            // 最初のURLを入力欄に設定
            urlInput.value = urls[0];

            // 複数URLの場合はコンソールに表示（将来的にUI実装予定）
            if (urls.length > 1) {
                console.log('複数URLが見つかりました:', urls);
            }

            memoInput.focus();
            chrome.storage.local.remove(['pendingSelectionText', 'pendingSelectedLinks', 'isSelection']);
        } else if (result.pendingUrl) {
            // 通常のリンク保存またはページ保存
            urlInput.value = result.pendingUrl;

            // ページタイトルがある場合はメモに初期設定
            if (result.pendingTitle) {
                memoInput.value = result.pendingTitle;
            }

            memoInput.focus();
            chrome.storage.local.remove(['pendingUrl', 'pendingTitle']);
        }
    });
}

// テキストからURLを抽出する関数
function extractURLsFromText(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches : [];
}

// 保存処理
async function saveMemo() {
    const url = urlInput.value.trim();
    const memo = memoInput.value.trim();
    const tagsStr = tagsInput.value.trim();

    // バリデーション
    if (!url) {
        alert('URLを入力してください');
        urlInput.focus();
        return;
    }

    if (!memo) {
        alert('メモを入力してください');
        memoInput.focus();
        return;
    }

    try {
        // ボタンを無効化
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        // ファイルハンドルを取得
        let handle = await getFileHandle();

        if (!handle) {
            // ファイルが未設定の場合はエラーメッセージ
            alert('保存先ファイルが設定されていません。\\n拡張機能アイコンをクリックして設定してください。');
            window.close();
            return;
        }

        // タグを配列に変換
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

        // Markdown形式のエントリを作成
        const entry = createMarkdownEntry(url, memo, tags);

        // ファイルに追記
        await appendToFile(handle, entry);

        // 成功メッセージを表示
        successMessage.classList.add('show');

        // 1秒後にウィンドウを閉じる
        setTimeout(() => {
            window.close();
        }, 1000);

    } catch (error) {
        console.error('保存エラー:', error);

        // 権限エラーの場合
        if (error.message.includes('権限')) {
            alert('ファイルへの書き込み権限がありません。\n再度ファイルを選択してください。');
        } else {
            alert('保存に失敗しました: ' + error.message);
        }

        // ボタンを再度有効化
        saveBtn.disabled = false;
        saveBtn.textContent = '保存';
    }
}

// キャンセル処理
function cancel() {
    window.close();
}

// イベントリスナー
saveBtn.addEventListener('click', saveMemo);
cancelBtn.addEventListener('click', cancel);

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter または Cmd+Enter で保存
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveMemo();
    }

    // Esc でキャンセル
    if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
    }
});

// 初期化実行
init();
