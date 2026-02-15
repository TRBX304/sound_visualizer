# 🎵 High-Resolution Audio Visualizer

YouTubeなどのタブ音声をリアルタイムで解析し、圧倒的な迫力で描画するビジュアライザーです。

---

## 技術的特徴

### 1. 高解像度周波数解析 (FFT 4096)
一般的なビジュアライザーよりも高い `fftSize: 4096` を採用。1ビンあたり約10.7Hzという高分解能により、26Hz周辺の超低音域（サブベース帯域）をボヤけさせることなく緻密に計算します。

### 2. エネルギーベース・パワーレスポンス
音波の振幅をそのまま使うのではなく、**2乗（Power）** して計算に利用。
これにより、微細なノイズを抑え込み、ドラムのアタックやベースのキックといった強いエネルギーを視覚的に鋭く強調します。

### 3. 最大値抽出 (Max Pooling) ロジック
複数のサンプリングデータを単純に平均化せず、その区間内の**最大値（MaxValue）**を採用しています。
- **従来**: 平均化により、鋭い低音のピークが隣の静かな音に埋もれてしまう。
- **本機**: 区間内で最も強いエネルギーを逃さずキャッチし、キレのあるダイナミックな動きを実現。

### 4. デジタルゲイン ＆ ハードリミッター
音源のヘッドルームを考慮し、1.5倍のデジタル増幅を適用。計算結果が描画範囲（1.0）を超えないよう `Math.min` によるリミッターをかけ、常に画面いっぱいに躍動する迫力を維持します。

---

## 🛠 核心アルゴリズム (Core Logic)

```javascript
// 大量のバーの長さを計算するロマンの結晶
for (let i = 0; i < displayBarCount; i++) {
    let maxValue = 0;
    for (let j = 0; j < samplesPerBar; j++) {
        // 振幅を0.0〜1.0に正規化
        const normalized = dataArray[i * samplesPerBar + j] / 255;
        // エネルギー化（2乗）
        const squared = normalized * normalized;
        // 区間内のピークを抽出
        maxValue = Math.max(maxValue, squared);
    }
    
    // ゲイン調整とリミッター（スレッショルド処理）
    const percent = Math.min(1.0, maxValue * 1.5);
    const barHeight = percent * maxBarHeight;
    
    // このpercent値を色、明るさ、透明度、パーティクルへ連動
}
