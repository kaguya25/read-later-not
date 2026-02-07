// IndexedDB操作用のヘルパーモジュール

const DB_NAME = 'LinkMemoSaverDB';
const DB_VERSION = 1;
const STORE_NAME = 'fileHandle';

/**
 * IndexedDBを開く
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

/**
 * ファイルハンドルを保存
 */
async function saveFileHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, 'mdFileHandle');

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * ファイルハンドルを取得
 */
async function getFileHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('mdFileHandle');

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * ファイルへの書き込み権限を確認
 */
async function checkPermission(handle) {
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
        return true;
    }

    // 権限がない場合は要求
    const newPermission = await handle.requestPermission({ mode: 'readwrite' });
    return newPermission === 'granted';
}

/**
 * Markdownファイルに内容を追記
 */
async function appendToFile(handle, content) {
    // 権限確認
    const hasPermission = await checkPermission(handle);
    if (!hasPermission) {
        throw new Error('ファイルへの書き込み権限がありません');
    }

    // 既存の内容を読み込む
    const file = await handle.getFile();
    const existingContent = await file.text();

    // 新しい内容を追加
    const newContent = existingContent + content;

    // ファイルに書き込む
    const writable = await handle.createWritable();
    await writable.write(newContent);
    await writable.close();
}

/**
 * 日時フォーマット（YYYY-MM-DD HH:MM:SS）
 */
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Markdown形式のエントリを生成
 */
function createMarkdownEntry(url, memo, tags = []) {
    const timestamp = formatDateTime(new Date());
    let entry = `## ${timestamp}\n- URL: ${url}\n- メモ: ${memo}\n`;
    if (tags && tags.length > 0) {
        entry += `- タグ: [${tags.join(', ')}]\n`;
    }
    entry += '\n---\n\n';
    return entry;
}
