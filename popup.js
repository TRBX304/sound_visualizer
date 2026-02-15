const toggleBtn = document.getElementById('toggleBtn');
const status = document.getElementById('status');

let isActive = false;

// 現在の状態を取得
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (chrome.runtime.lastError) {
        console.log('Tab query error:', chrome.runtime.lastError);
        return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, (response) => {
        if (chrome.runtime.lastError) {
            // コンテンツスクリプトがまだ読み込まれていない（エラーは無視）
            return;
        }
        if (response && response.isActive) {
            isActive = true;
            updateUI();
        }
    });
});

toggleBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (!isActive) {
        // ビジュアライザーをON
        status.textContent = '起動中...';
        
        // コンテンツスクリプトが読み込まれているか確認
        chrome.tabs.sendMessage(tab.id, {action: 'ping'}, (response) => {
            if (chrome.runtime.lastError) {
                // コンテンツスクリプトが読み込まれていない場合、再読み込みを促す
                status.textContent = 'ページを再読み込みしてください';
                setTimeout(() => {
                    status.textContent = '準備完了';
                }, 2000);
                return;
            }
            
            // 正常に読み込まれている場合、開始
            chrome.tabs.sendMessage(tab.id, {action: 'start'}, (response) => {
                if (chrome.runtime.lastError) {
                    status.textContent = 'エラーが発生しました';
                    return;
                }
                
                if (response && response.success) {
                    isActive = true;
                    updateUI();
                    status.textContent = '実行中';
                } else {
                    status.textContent = 'キャンセルされました';
                    setTimeout(() => {
                        status.textContent = '準備完了';
                    }, 2000);
                }
            });
        });
    } else {
        // ビジュアライザーをOFF
        chrome.tabs.sendMessage(tab.id, {action: 'stop'}, () => {
            if (chrome.runtime.lastError) {
                // エラーは無視
            }
        });
        isActive = false;
        updateUI();
        status.textContent = '停止しました';
        setTimeout(() => {
            status.textContent = '準備完了';
        }, 1500);
    }
});

function updateUI() {
    if (isActive) {
        toggleBtn.textContent = 'ビジュアライザーをOFF';
        toggleBtn.classList.add('active');
    } else {
        toggleBtn.textContent = 'ビジュアライザーをON';
        toggleBtn.classList.remove('active');
    }
}
