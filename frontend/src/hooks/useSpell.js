import { useState, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export const useSpell = (spawnProjectile, playerPos, playerFacing, mousePos) => {
  // 用於通知 Map 畫面的狀態
  const [isGathering, setIsGathering] = useState(false);
  const [particles, setParticles] = useState([]);

  // 使用 useRef 儲存玩家最新位置，避免閉包 (Closure) 拿到的 pos 是舊的
  const latestPos = useRef(playerPos);
  const latestFacing = useRef(playerFacing);
  latestPos.current = playerPos;
  latestFacing.current = playerFacing;
  const latestMousePos = useRef(mousePos);
  latestMousePos.current = mousePos;

  // 核心邏輯：載入 ONNX 並執行降噪集氣動畫
  const castSpellEffect = useCallback(async (onnxUrl) => {
    setIsGathering(true);

    try {
      const fullUrl = onnxUrl.startsWith('http') 
        ? onnxUrl 
        : `http://localhost:8000${onnxUrl.startsWith('/') ? '' : '/'}${onnxUrl}`;
      
      // 1. 建立 ONNX 推論 Session
      const session = await ort.InferenceSession.create(fullUrl, { executionProviders: ['wasm'] });
      
      const numParticles = 200; 
      const totalTimesteps = 70; 

      // ==========================================
      // Box-Muller 標準常態分佈產生器 N(0, 1)
      // ==========================================
      const randn = () => {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); 
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      const betaStart = 0.0001;
      const betaEnd = 0.02;
      const betas = new Float32Array(totalTimesteps);
      const alphas = new Float32Array(totalTimesteps);
      const alphasCumprod = new Float32Array(totalTimesteps);

      let currentCumprod = 1.0;
      for (let i = 0; i < totalTimesteps; i++) {
        // 線性 Beta 排程 (Linear Schedule)
        betas[i] = betaStart + i * (betaEnd - betaStart) / (totalTimesteps - 1);
        alphas[i] = 1.0 - betas[i];
        currentCumprod *= alphas[i];
        alphasCumprod[i] = currentCumprod;
      }

      // 2. 初始化隨機雜訊 (使用常態分佈)
      let currentNoise = new Float32Array(numParticles * 2);
      for (let i = 0; i < currentNoise.length; i++) {
        currentNoise[i] = randn(); 
      }

      let finalRenderedParticles = []; // 用來存最後一幀的形狀

      // 3. 進入降噪迴圈 (從 T-1 倒數到 0)
      for (let t = totalTimesteps - 1; t >= 0; t--) {
        const noisyInput = new ort.Tensor('float32', currentNoise, [numParticles, 2]);
        const timestepsData = new BigInt64Array(numParticles).fill(BigInt(t));
        const timestepsInput = new ort.Tensor('int64', timestepsData, [numParticles]);

        const feeds = { 'noisy_input': noisyInput, 'timesteps': timestepsInput };
        const results = await session.run(feeds);
        
        const noisePred = results['noise_pred'].data; 

        // 提取當前時間步 (t) 的公式參數
        const alpha_t = alphas[t];
        const alpha_cumprod_t = alphasCumprod[t];
        const beta_t = betas[t];
        
        const nextParticles = [];

        // 4. DDPM 更新粒子座標
        for (let i = 0; i < numParticles * 2; i += 2) {
          let x = currentNoise[i];
          let y = currentNoise[i + 1];
          let eps_x = noisePred[i];
          let eps_y = noisePred[i + 1];

          // DDPM 降噪數學公式
          let coef1 = 1.0 / Math.sqrt(alpha_t);
          let coef2 = (1.0 - alpha_t) / Math.sqrt(1.0 - alpha_cumprod_t);

          x = coef1 * (x - coef2 * eps_x);
          y = coef1 * (y - coef2 * eps_y);

          // 如果還沒到最後一步，要加回隨機性 (Langevin Dynamics)
          if (t > 0) {
            let sigma = Math.sqrt(beta_t);
            x += sigma * randn();
            y += sigma * randn();
          }

          currentNoise[i] = x;
          currentNoise[i + 1] = y;

          // 轉換成 {x, y} 格式並放大比例供 React 渲染
          nextParticles.push({
            x: x * 20, // 這裡可以微調放大倍率
            y: y * 20
          });
        }

        finalRenderedParticles = nextParticles;

        // 5. 更新 React 狀態以重新渲染畫面
        setParticles(nextParticles);

        // 6. 等待下一個瀏覽器渲染幀，形成流暢動畫
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 30)); 
      }

      console.log("✨ 集氣完成！魔法陣已定型！");
      setIsGathering(false);
      
      // ✨ 修正：回傳我們確實在這裡算完的陣列，而不是 React state
      return finalRenderedParticles; 

    } catch (error) {
      console.error("ONNX 推論失敗:", error);
      setIsGathering(false);
      return null;
    }
  }, []);

  // 接收 SpellPanel 傳來的解析結果，並串接遊戲引擎
  const handleSpellGenerated = useCallback(async (spellData) => {
    if (!spellData || !spellData.onnx_url) {
      console.warn("無效的咒語資料");
      return;
    }

    // 1. 執行邊緣運算，獲得最終法陣形狀
    const finalShape = await castSpellEffect(spellData.onnx_url);

    // 2. 如果成功算出形狀，呼叫遊戲引擎把法陣「射出去」
    if (finalShape && spawnProjectile) {
      spawnProjectile({
        type: 'MAGIC_ARRAY',
        shape: finalShape,              
        targetX: latestMousePos.current.x, // 瞄準滑鼠的 X
        targetY: latestMousePos.current.y, // 瞄準滑鼠的 Y
        speed: 8
      });
      
      // 發射後清空留在玩家身上的粒子
      setParticles([]); 
    }
  }, [castSpellEffect, spawnProjectile]);

  return { 
    particles, 
    isGathering, 
    handleSpellGenerated 
  };
};