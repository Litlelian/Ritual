import { useState } from 'react';

function SpellTestPage() {
  const [spell, setSpell] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const castSpell = async () => {
    if (!spell.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 呼叫你的 FastAPI 後端
      const response = await fetch('http://localhost:8000/generate_spell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: spell }),
      });

      if (!response.ok) throw new Error('法術解析失敗，請確認後端伺服器是否開啟');

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🔮 咒語符文解析測試區</h2>
      
      {/* 詠唱輸入區 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={spell}
          onChange={(e) => setSpell(e.target.value)}
          placeholder="請輸入你的詠唱咒語..."
          style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          onKeyDown={(e) => e.key === 'Enter' && castSpell()}
        />
        <button 
          onClick={castSpell} 
          disabled={isLoading}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: isLoading ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isLoading ? '詠唱中...' : '解析咒語'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>錯誤: {error}</p>}

      {/* 結果展示區 */}
      {result && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '30px', alignItems: 'flex-start' }}>
          {/* 左側：SVG 視覺化 */}
          <div style={{ flex: 1, textAlign: 'center', backgroundColor: '#222', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: 'white', marginTop: 0 }}>符文視覺</h3>
            <svg viewBox="-60 -60 120 120" style={{ width: '100%', maxWidth: '250px', height: 'auto', display: 'block', margin: '0 auto' }}>
              <path d={result.svg_path} fill="rgba(0, 212, 255, 0.2)" stroke="#00d4ff" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div style={{ color: '#aaa', marginTop: '10px', fontSize: '18px' }}>
              形狀: {result.shape} | 複雜度: {result.complexity}
            </div>
          </div>

          {/* 右側：JSON 原始資料 */}
          <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', overflowX: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>解析結果 (JSON)</h3>
            <p style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>{result.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpellTestPage;