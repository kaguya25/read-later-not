// Settings script for file selection

// DOM要素
const fileStatus = document.getElementById('fileStatus');
const createNewBtn = document.getElementById('createNewBtn');
const selectExistingBtn = document.getElementById('selectExistingBtn');
const successMessage = document.getElementById('successMessage');

// 初期化：現在の設定を表示
async function init() {
    try {
        const handle = await getFileHandle();
        if (handle) {
            // 権限確認
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                fileStatus.textContent = `設定済み: ${handle.name}`;
            } else {
                fileStatus.textContent = `設定済み（権限が必要）: ${handle.name}`;
            }
        } else {
            fileStatus.textContent = 'ファイルが設定されていません';
        }
    } catch (error) {
        console.error('初期化エラー:', error);
        fileStatus.textContent = 'ファイルが設定されていません';
    }
}

// 新しいファイルを作成
async function createNewFile() {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: 'link-memos.md',
            types: [{
                description: 'Markdown Files',
                accept: { 'text/markdown': ['.md'] }
            }]
        });

        // 初期内容を書き込む
        const writable = await handle.createWritable();
        await writable.write('# Link Memos\n\n保存されたリンク一覧\n\n---\n\n');
        await writable.close();

        // ハンドルを保存
        await saveFileHandle(handle);

        // 成功表示
        fileStatus.textContent = `設定済み: ${handle.name}`;
        showSuccess();

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('ファイル作成エラー:', error);
            alert('ファイルの作成に失敗しました: ' + error.message);
        }
    }
}

// 既存のファイルを選択
async function selectExistingFile() {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'Markdown Files',
                accept: { 'text/markdown': ['.md'] }
            }],
            multiple: false
        });

        // 権限を要求
        const permission = await handle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            alert('ファイルへの書き込み権限が必要です');
            return;
        }

        // ハンドルを保存
        await saveFileHandle(handle);

        // 成功表示
        fileStatus.textContent = `設定済み: ${handle.name}`;
        showSuccess();

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('ファイル選択エラー:', error);
            alert('ファイルの選択に失敗しました: ' + error.message);
        }
    }
}

// 成功メッセージを表示
function showSuccess() {
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// イベントリスナー
createNewBtn.addEventListener('click', createNewFile);
selectExistingBtn.addEventListener('click', selectExistingFile);

// 一覧に戻るボタン
const backToViewerBtn = document.getElementById('backToViewerBtn');
backToViewerBtn.addEventListener('click', () => {
    window.location.href = 'viewer.html';
});

// 初期化実行
init();
