// バックグラウンドスクリプト
// Manifest V3では基本的に空でOK（必要に応じて拡張）

chrome.runtime.onInstalled.addListener(() => {
    console.log('Sound Visualizer installed');
});
