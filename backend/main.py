import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from train_ddim import train_ddim_generator
import asyncio
import uuid

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

# 這樣前端才能透過 http://localhost:8000/outputs/xxx.onnx 下載檔案
app.mount("/models", StaticFiles(directory="models"), name="models")

api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)

class SpellRequest(BaseModel):
    prompt: str

spell_tasks_db = {}  # 開發用，正式應該整合進資料庫

@app.post("/generate_spell")
async def generate_spell(request: SpellRequest):
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        with open("./configs/spell_prompt.txt", "r", encoding="utf-8") as f:
            prompt = f.read()

        system_instruction = (prompt)
        
        # 呼叫 Gemini (強制要求 JSON 格式輸出)
        response = model.generate_content(
            f"{system_instruction}\n\n咒語內容：{request.prompt}",
            generation_config={"response_mime_type": "application/json"}
        )
        print("Gemini 原始回傳內容：", response.text)

        spell_data = json.loads(response.text)
        task_id = str(uuid.uuid4())
        spell_tasks_db[task_id] = spell_data
        
        return {
            "task_id": task_id,
            "preview": spell_data
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"後端錯誤: {str(e)}")
    
@app.get("/train_progress")
async def train_progress(task_id: str):
    if task_id not in spell_tasks_db:
        raise HTTPException(status_code=404, detail="找不到此詠唱任務或任務已過期")
    
    task_data = spell_tasks_db[task_id]
    
    def event_stream():
        try:
            svg_path = task_data["svg_path"]
            num_points = 500
            noise_scale = 0.05
            model_path = "models/"
            model_name = f"task_{task_id}"
            with open("configs/train_config.json", "r", encoding="utf-8") as f:
                config = json.load(f)
            complexity = task_data["complexity"]
            for update in train_ddim_generator(svg_path, num_points, noise_scale, model_path, model_name, config):
                # SSE 規範：必須以 data: 開頭，並以 \n\n 結尾
                yield f"data: {json.dumps(update)}\n\n"
        finally:
            if task_id in spell_tasks_db:
                del spell_tasks_db[task_id]
            
    return StreamingResponse(event_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)