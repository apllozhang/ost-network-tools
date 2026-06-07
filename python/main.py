from fastapi import FastAPI
from pydantic import BaseModel
from textfsm_aos.parser import parse
import uvicorn

from routers.log_analyzer import router as log_router
from routers.firmware import router as firmware_router
from routers.tools import router as tools_router

app = FastAPI(title="OST TextFSM Parser")
app.include_router(log_router)
app.include_router(firmware_router)
app.include_router(tools_router)

class ParseRequest(BaseModel):
    platform: str  # "ale_aos6" or "ale_aos8"
    command: str
    raw_output: str

@app.post("/api/parse")
def parse_command(req: ParseRequest):
    try:
        result = parse(req.platform, req.command, req.raw_output)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@app.get("/api/templates")
def list_templates():
    import os
    template_dir = os.path.join(os.path.dirname(__file__), "textfsm_templates")
    templates = [f for f in os.listdir(template_dir) if f.endswith(".textfsm")]
    return {"templates": sorted(templates)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
