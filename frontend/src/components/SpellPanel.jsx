// src/components/SpellPanel.jsx
import React, { useState, useEffect } from 'react';

// ✨ 新增 onSpellGenerated 屬性，用來通知外層的 GamePage
const SpellPanel = ({ onSpellGenerated }) => {
  const [spell, setSpell] = useState('');
  const [result, setResult] = useState(null); // 存放預覽圖資料
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [trainingProgress, setTrainingProgress] = useState(0); 
  const [isTraining, setIsTraining] = useState(false);

  const [learnedSpells, setLearnedSpells] = useState([]); 
  const [equippedSpellUrl, setEquippedSpellUrl] = useState('');

  const castSpell = async () => {
    if (!spell.trim() || isTraining) return; // 訓練中不允許重複點擊
    setIsLoading(true);
    setError(null);
    setResult(null);
    setTrainingProgress(0);

    try {
      const response = await fetch('http://localhost:8000/generate_spell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: spell }),
      });
      
      if (!response.ok) throw new Error('法術解析失敗，請確認後端伺服器是否開啟');
      
      const data = await response.json();
      
      setResult(data.preview);
      
      if (data.task_id) {
        startTrainingSSE(data.task_id, spell, data.preview);
      } else {
        throw new Error('後端沒有回傳 Task ID');
      }

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // ✨ 負責建立 SSE 連線的函數
  const startTrainingSSE = (taskId, spellName, previewData) => {
    setIsLoading(false); // 解析完成，按鈕可以變回原樣
    setIsTraining(true); // 進入「訓練中」狀態

    // 建立 EventSource 連線
    const eventSource = new EventSource(`http://localhost:8000/train_progress?task_id=${taskId}`);

    // 接收伺服器推播的訊息
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);

      if (update.status === 'training') {
        // 更新進度條
        setTrainingProgress(update.progress);
        
      } else if (update.status === 'completed') {
        // 訓練完成！
        console.log("模型訓練完成，準備發射！", update.onnx_url);
        setIsTraining(false);
        setTrainingProgress(100);
        eventSource.close(); // 關閉連線

        const newSpell = {
          name: spellName,
          onnx_url: update.onnx_url,
          preview: previewData
        };

        setLearnedSpells(prev => {
          // 避免重複加入相同網址的模型
          if (prev.find(s => s.onnx_url === newSpell.onnx_url)) return prev;
          return [...prev, newSpell];
        });
        
        setEquippedSpellUrl(update.onnx_url);

        // ✨ 呼叫從 GamePage 傳進來的函數，啟動主角身邊的集氣特效
        if (onSpellGenerated) {
           onSpellGenerated(update); // 把含有 onnx_url 的物件傳出去
        }
      }
    };

    // 處理連線錯誤
    eventSource.onerror = (err) => {
      console.error('SSE 連線錯誤:', err);
      setError('訓練連線中斷，請重試。');
      setIsTraining(false);
      eventSource.close();
    };
  };

  const handleQuickCast = () => {
    const targetSpell = learnedSpells.find(s => s.onnx_url === equippedSpellUrl);
    if (targetSpell && onSpellGenerated) {
      // 假裝收到後端的完成訊號，直接把模型 URL 丟給遊戲引擎！
      onSpellGenerated({ onnx_url: targetSpell.onnx_url });
    }
  };

  return (
    <div style={{ 
      width: '400px', 
      padding: '20px', 
      backgroundColor: '#2c3e50', 
      borderRadius: '12px', 
      color: 'white',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
    }}>
      <h3 style={{ marginTop: 0, color: '#00d4ff' }}>🔮 咒語解析測試</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          value={spell}
          onChange={(e) => setSpell(e.target.value)}
          placeholder="輸入詠唱咒語 (例如: 火球術)..."
          disabled={isLoading || isTraining}
          style={{ 
            padding: '12px', 
            borderRadius: '6px', 
            border: 'none', 
            backgroundColor: '#34495e', 
            color: 'white' 
          }}
          onKeyDown={(e) => e.key === 'Enter' && castSpell()}
        />
        <button 
          onClick={castSpell} 
          disabled={isLoading || isTraining}
          style={{ 
            padding: '10px', 
            cursor: (isLoading || isTraining) ? 'not-allowed' : 'pointer', 
            backgroundColor: (isLoading || isTraining) ? '#7f8c8d' : '#00d4ff', 
            color: '#1a1a1a', 
            fontWeight: 'bold',
            border: 'none', 
            borderRadius: '6px' 
          }}
        >
          {isLoading ? '解析中...' : isTraining ? '模型訓練中...' : '發動詠唱'}
        </button>
      </div>

      {/* ✨ 訓練進度條 */}
      {isTraining && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <span>凝聚魔法陣中...</span>
            <span>{Math.round(trainingProgress)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${trainingProgress}%`, 
              height: '100%', 
              backgroundColor: '#00d4ff',
              transition: 'width 0.2s ease-in-out' // 讓進度條跑起來平滑
            }} />
          </div>
        </div>
      )}

      {/* 4. 魔法書庫 UI 區塊 (有學到魔法才會顯示) */}
      {learnedSpells.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a252f', borderRadius: '8px', border: '1px solid #00d4ff' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#f1c40f' }}>📜 已學習的魔法</h4>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* 下拉選單選擇要裝備的魔法 */}
            <select 
              value={equippedSpellUrl} 
              onChange={(e) => setEquippedSpellUrl(e.target.value)}
              style={{ flex: 1, padding: '8px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', maxWidth: '70%' }}
            >
              {learnedSpells.map((s, idx) => (
                <option key={idx} value={s.onnx_url}>{s.name}</option>
              ))}
            </select>

            {/* 直接發動按鈕 (不需經過後端 API！) */}
            <button 
              onClick={handleQuickCast}
              style={{ padding: '8px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              直接發動！
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ff7675', fontSize: '14px', marginTop: '10px' }}>⚠️ {error}</p>}

      {/* 顯示預覽結果 (注意這裡已經改成讀取 result 物件) */}
      {result && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #555', paddingTop: '15px' }}>
          <div style={{ textAlign: 'center', backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
            <svg viewBox="-60 -60 120 120" style={{ width: '100%', maxWidth: '200px', height: 'auto' }}>
              <path 
                d={result.svg_path} 
                fill="none" 
                stroke="#00d4ff" 
                strokeWidth="2" 
                strokeLinejoin="round" 
                strokeLinecap="round"
              />
            </svg>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
              屬性: {result.shape} | 強度: {result.complexity}
            </div>
          </div>
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#ecf0f1', backgroundColor: '#34495e', padding: '10px', borderRadius: '4px' }}>
              <strong>解析描述:</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>{result.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpellPanel;