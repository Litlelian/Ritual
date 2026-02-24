import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(env_path)

app = FastAPI()

# 允許前端 React 跨網域存取 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開發環境建議先設為 *，之後可限定為 localhost:5173
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. 設定 Gemini API Key
# 建議之後存放在 .env 檔案中更安全
api_key = os.getenv("GEMINI_API_KEY")
print(f"啟動檢查 - 讀取到的 API Key 前四碼: {api_key[:4] if api_key else '找不到 Key!'}")

genai.configure(api_key=api_key)

# 2. 定義咒語資料模型
class SpellRequest(BaseModel):
    prompt: str

@app.post("/generate_spell")
async def generate_spell(request: SpellRequest):
    try:
        # 指定模型 (Gemini 3 Flash 適合這種快速解析任務)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # 設定 System Prompt，確保回傳純 JSON 且使用台灣繁體慣用語
        system_instruction = (
            """
            你是一個遊戲符文設計師。你的任務是將玩家輸入的咒語轉化為符文特徵與 SVG 路徑。
            請嚴格遵守以下格式規範：
            1. 輸出必須是純 JSON 格式，除了 JSON 的 key 是英文外，其餘文字請使用台灣繁體中文。
            2. svg_path 必須是簡單的 2D 向量路徑（0-100 座標系），其形狀要符合符文。
            3. 屬性包含：shape (str, 主要形狀), elements (array of str, 元素性質), complexity (int, 1-5 的等級), svg_path (str, 標準svg path data), explanation (str, 用以描述評斷標準)
            形狀的優先級是動物>武器>抽象概念。元素性質只能包含[水、火、土、風、雷]，若有多個元素可以寫入陣列中。complexity 可以根據第 4 點規範而調整該數值，評判依據將寫在explanation中。svg_path 則是用簡單的 svg path data 畫出 shape 中的圖形輪廓，方向朝左，中心點應盡量位於座標軸原點
            4. 評判 complexity 的依據分別是 : 咒語內容是否通順且符合邏輯、畫面具體程度、包含元素是否足夠純淨(大於等於三個元素被視作不純淨)，以及是否具備前後呼應的史詩感。1 分代表極短且基礎的單詞，5 分代表結構完整且意象豐富的高階詠唱。
            以下是範例 :
            範例一 : 咒語內容 : 風雷水火土五色之箭
            輸出 : {"shape": "箭", "elements": ["水", "火", "土", "風", "雷"], "complexity": 1, "svg_path": "M -50 0 L -20 -15 L -20 -3 L 20 -3 L 20 -12 L 40 -12 L 30 0 L 40 12 L 20 12 L 20 3 L -20 3 L -20 15 Z", "explanation": "咒語僅為單純的名詞疊加，缺乏完整的詠唱結構與意象鋪陳。且包含『水、火、土、風、雷』五種元素，觸發大於等於三個元素為不純淨的扣分條件，故複雜度評定為最低的 1 分。圖形繪製為一支向左帶有尾羽的箭矢輪廓，中心點對齊原點。"}
            範例二 : 咒語內容 : 九天之巔，狂雷怒嚎；深淵之底，業火焚燒。以吾之血脈為契，交織毀滅與重生。降臨吧！雷炎雙翼的狂龍！
            輸出 : {"shape": "龍", "elements": ["火", "雷"], "complexity": 5, "svg_path": "M -40 -10 L -30 -20 L -35 -30 L -20 -15 L 0 -10 L 20 -40 L 40 -25 L 15 -5 L 45 10 L 35 15 L 20 35 L 10 25 L 0 20 L -15 30 L -10 15 L -30 0 L -45 0 L -35 -5 Z", "explanation": "咒語具備極高的史詩感與完整的詠唱結構，前段『九天』與『深淵』形成強烈的空間對仗，並明確點出實體『狂龍』，完美觸發動物優先於武器的規則。提取出『火』與『雷』兩個元素，屬性純淨。綜合其豐富意象與前後呼應，複雜度給予滿分 5 分。圖形繪製為一隻向左展翅且帶有犄角與長尾的巨龍輪廓，中心點對齊原點。"}
            範例三 : 咒語內容 : 沉睡的地脈，化作震碎萬物的怒吼吧！
            輸出 : {"shape": "裂痕", "elements": ["土"], "complexity": 3, "svg_path": "M 40 5 L 15 -10 L -5 10 L -30 -15 L -45 0 L -25 15 L -5 30 L 20 5 Z", "explanation": "咒語長度適中，具備基礎的詠唱結構與明確的『震碎』意象。由於內容未提及任何動物或武器，正確觸發了最低優先級的『抽象概念』，將其具象化為『裂痕』。元素純淨僅提取出『土』。整體句子通順且帶有破壞感，但缺乏高階咒語的長篇史詩感與多層次對仗，因此複雜度給予 3 分。圖形繪製為一道由右至左蔓延、帶有尖銳折角的鋸齒狀地裂輪廓，中心點位於原點。"
}
            """
        )
        
        # 呼叫 Gemini (強制要求 JSON 格式輸出)
        response = model.generate_content(
            f"{system_instruction}\n\n咒語內容：{request.prompt}",
            generation_config={"response_mime_type": "application/json"}
        )
        print("Gemini 原始回傳內容：", response.text)
        
        # 解析並回傳給前端
        return json.loads(response.text)
        
    except Exception as e:
        # 增加除錯：印出具體的錯誤原因
        print(f"發生嚴重錯誤：{str(e)}")
        # 將錯誤細節傳回給前端，這樣你就不會只看到冷冰冰的 500 Error
        raise HTTPException(status_code=500, detail=f"後端錯誤細節: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)