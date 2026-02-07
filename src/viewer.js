// Viewer script for displaying saved memos

// DOM要素
const loadingMessage = document.getElementById('loadingMessage');
const entriesContainer = document.getElementById('entriesContainer');
const noEntriesMessage = document.getElementById('noEntriesMessage');
const searchInput = document.getElementById('searchInput');
const settingsBtn = document.getElementById('settingsBtn');

// 編集モーダル
const editModal = document.getElementById('editModal');
const editUrl = document.getElementById('editUrl');
const editMemo = document.getElementById('editMemo');
const editTags = document.getElementById('editTags');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// グローバル変数
let allEntries = [];
let currentEditIndex = -1;

// 初期化
async function init() {
    try {
        const handle = await getFileHandle();
        if (!handle) {
            // ファイルが設定されていない場合は設定画面を開く
            window.location.href = 'settings.html';
            return;
        }

        // ファイルを読み込んでエントリを解析
        await loadEntries(handle);
    } catch (error) {
        console.error('初期化エラー:', error);
        loadingMessage.textContent = 'エラーが発生しました: ' + error.message;
    }
}

// エントリを読み込み
async function loadEntries(handle) {
    try {
        // 権限確認
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            const newPermission = await handle.requestPermission({ mode: 'readwrite' });
            if (newPermission !== 'granted') {
                throw new Error('ファイルへのアクセス権限がありません');
            }
        }

        // ファイルを読み込む
        const file = await handle.getFile();
        const content = await file.text();

        // Markdownをパース
        allEntries = parseMarkdownEntries(content);

        // 表示
        renderEntries(allEntries);
    } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        loadingMessage.textContent = 'エラーが発生しました: ' + error.message;
    }
}

// Markdownをパースしてエントリの配列に変換
function parseMarkdownEntries(content) {
    const entries = [];
    const lines = content.split('\n');

    let currentEntry = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // タイムスタンプ行（## で始まる）
        if (line.startsWith('## ') && /^\d{4}-\d{2}-\d{2}/.test(line.substring(3))) {
            // 前のエントリを保存
            if (currentEntry) {
                entries.push(currentEntry);
            }

            // 新しいエントリを開始
            currentEntry = {
                timestamp: line.substring(3),
                url: '',
                memo: '',
                tags: []
            };
        }
        // URL行
        else if (line.startsWith('- URL:') && currentEntry) {
            currentEntry.url = line.substring(6).trim();
        }
        // メモ行
        else if (line.startsWith('- メモ:') && currentEntry) {
            currentEntry.memo = line.substring(6).trim();
        }
        // タグ行
        else if (line.startsWith('- タグ:') && currentEntry) {
            const tagsStr = line.substring(6).trim();
            // [tag1, tag2, tag3] 形式をパース
            const tagsMatch = tagsStr.match(/\[(.*?)\]/);
            if (tagsMatch) {
                currentEntry.tags = tagsMatch[1].split(',').map(t => t.trim()).filter(t => t);
            }
        }
    }

    // 最後のエントリを保存
    if (currentEntry) {
        entries.push(currentEntry);
    }

    return entries.reverse(); // 新しい順に表示
}

// エントリを表示
function renderEntries(entries) {
    loadingMessage.style.display = 'none';

    if (entries.length === 0) {
        entriesContainer.style.display = 'none';
        noEntriesMessage.style.display = 'block';
        return;
    }

    entriesContainer.style.display = 'flex';
    noEntriesMessage.style.display = 'none';
    entriesContainer.innerHTML = '';

    entries.forEach((entry, index) => {
        const card = createEntryCard(entry, index);
        entriesContainer.appendChild(card);
    });
}

// エントリカードを作成
function createEntryCard(entry, index) {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const header = document.createElement('div');
    header.className = 'entry-header';

    const timestamp = document.createElement('div');
    timestamp.className = 'entry-timestamp';
    timestamp.textContent = entry.timestamp;

    const actions = document.createElement('div');
    actions.className = 'entry-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-edit';
    editBtn.textContent = '✏️ 編集';
    editBtn.onclick = () => editEntry(index);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.textContent = '🗑️ 削除';
    deleteBtn.onclick = () => deleteEntry(index);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(timestamp);
    header.appendChild(actions);

    const urlDiv = document.createElement('div');
    urlDiv.className = 'entry-url';
    const urlLink = document.createElement('a');
    urlLink.href = entry.url;
    urlLink.target = '_blank';
    urlLink.textContent = entry.url;
    urlDiv.appendChild(urlLink);

    const memoDiv = document.createElement('div');
    memoDiv.className = 'entry-memo';
    memoDiv.textContent = entry.memo;

    card.appendChild(header);
    card.appendChild(urlDiv);
    card.appendChild(memoDiv);

    // タグがある場合は表示
    if (entry.tags && entry.tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'entry-tags';

        entry.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            tagSpan.onclick = () => filterByTag(tag);
            tagsDiv.appendChild(tagSpan);
        });

        card.appendChild(tagsDiv);
    }

    return card;
}

// エントリを編集
function editEntry(index) {
    currentEditIndex = index;
    const entry = allEntries[index];

    editUrl.value = entry.url;
    editMemo.value = entry.memo;
    editTags.value = entry.tags ? entry.tags.join(', ') : '';

    editModal.classList.add('show');
}

// エントリを削除
async function deleteEntry(index) {
    if (!confirm('このメモを削除してもよろしいですか？')) {
        return;
    }

    try {
        // エントリを削除
        allEntries.splice(index, 1);

        // ファイルを書き換え
        await rewriteFile(allEntries);

        // 表示を更新
        renderEntries(allEntries);
    } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました: ' + error.message);
    }
}

// 編集を保存
async function saveEdit() {
    if (currentEditIndex < 0) return;

    const url = editUrl.value.trim();
    const memo = editMemo.value.trim();
    const tagsStr = editTags.value.trim();

    if (!url || !memo) {
        alert('URLとメモは必須です');
        return;
    }

    try {
        // エントリを更新
        allEntries[currentEditIndex].url = url;
        allEntries[currentEditIndex].memo = memo;
        allEntries[currentEditIndex].tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

        // ファイルを書き換え
        await rewriteFile(allEntries);

        // モーダルを閉じる
        editModal.classList.remove('show');
        currentEditIndex = -1;

        // 表示を更新
        renderEntries(allEntries);
    } catch (error) {
        console.error('編集エラー:', error);
        alert('保存に失敗しました: ' + error.message);
    }
}

// ファイル全体を書き換え
async function rewriteFile(entries) {
    const handle = await getFileHandle();
    if (!handle) {
        throw new Error('ファイルハンドルが見つかりません');
    }

    // 権限確認
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
        const newPermission = await handle.requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
            throw new Error('ファイルへの書き込み権限がありません');
        }
    }

    // Markdown形式に変換（新しい順なので反転）
    let content = '# Link Memos\n\n保存されたリンク一覧\n\n---\n\n';

    const reversedEntries = [...entries].reverse();
    reversedEntries.forEach(entry => {
        content += `## ${entry.timestamp}\n`;
        content += `- URL: ${entry.url}\n`;
        content += `- メモ: ${entry.memo}\n`;
        if (entry.tags && entry.tags.length > 0) {
            content += `- タグ: [${entry.tags.join(', ')}]\n`;
        }
        content += '\n---\n\n';
    });

    // ファイルに書き込む
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
}

// 検索
function searchEntries(query) {
    if (!query.trim()) {
        renderEntries(allEntries);
        return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = allEntries.filter(entry => {
        return entry.url.toLowerCase().includes(lowerQuery) ||
            entry.memo.toLowerCase().includes(lowerQuery) ||
            (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)));
    });

    renderEntries(filtered);
}

// タグでフィルター
function filterByTag(tag) {
    const filtered = allEntries.filter(entry => {
        return entry.tags && entry.tags.includes(tag);
    });

    renderEntries(filtered);
    searchInput.value = tag;
}

// イベントリスナー
searchInput.addEventListener('input', (e) => {
    searchEntries(e.target.value);
});

settingsBtn.addEventListener('click', () => {
    window.location.href = 'settings.html';
});

saveEditBtn.addEventListener('click', saveEdit);

cancelEditBtn.addEventListener('click', () => {
    editModal.classList.remove('show');
    currentEditIndex = -1;
});

// モーダルの外側クリックで閉じる
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.remove('show');
        currentEditIndex = -1;
    }
});

// 初期化実行
init();
