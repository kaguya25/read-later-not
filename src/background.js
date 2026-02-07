// Service Worker for Link Memo Saver Extension
// コンテキストメニューの管理とイベント処理

// 拡張機能インストール時の初期化
chrome.runtime.onInstalled.addListener(() => {
  // リンク右クリック用コンテキストメニュー
  chrome.contextMenus.create({
    id: "save-link-memo",
    title: "リンクをメモに保存",
    contexts: ["link"]
  });

  // 範囲選択用コンテキストメニュー
  chrome.contextMenus.create({
    id: "save-selection-urls",
    title: "選択範囲からURLを保存",
    contexts: ["selection"]
  });

  // ページ右クリック用コンテキストメニュー
  chrome.contextMenus.create({
    id: "save-current-page",
    title: "このページを保存",
    contexts: ["page"]
  });
});

// コンテキストメニュークリック時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-link-memo") {
    const linkUrl = info.linkUrl;

    // URLをストレージに一時保存
    chrome.storage.local.set({ pendingUrl: linkUrl, isSelection: false }, () => {
      // ポップアップウィンドウを開く
      chrome.windows.create({
        url: "popup.html",
        type: "popup",
        width: 500,
        height: 550,
        focused: true
      });
    });
  } else if (info.menuItemId === "save-selection-urls") {
    const selectedText = info.selectionText;

    // Content Scriptに選択範囲内のリンクを取得するよう要求
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;

      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getSelectedLinks'
        });

        const selectedLinks = response.links || [];

        // リンクとテキストの両方を保存
        chrome.storage.local.set({
          pendingSelectionText: selectedText,
          pendingSelectedLinks: selectedLinks,
          isSelection: true
        }, () => {
          // ポップアップウィンドウを開く
          chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 500,
            height: 550,
            focused: true
          });
        });
      } catch (error) {
        // Content Scriptが応答しない場合は通常のテキスト処理
        console.log('Content Scriptからの応答なし、通常処理:', error);
        chrome.storage.local.set({
          pendingSelectionText: selectedText,
          isSelection: true
        }, () => {
          chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 500,
            height: 550,
            focused: true
          });
        });
      }
    });
  } else if (info.menuItemId === "save-current-page") {
    // 現在のページを保存
    const currentUrl = tab.url;
    const currentTitle = tab.title;

    // URLとタイトルをストレージに保存
    chrome.storage.local.set({
      pendingUrl: currentUrl,
      pendingTitle: currentTitle,
      isSelection: false
    }, () => {
      // ポップアップウィンドウを開く
      chrome.windows.create({
        url: "popup.html",
        type: "popup",
        width: 500,
        height: 550,
        focused: true
      });
    });
  }
});
