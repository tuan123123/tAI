from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain.agents import create_agent
from langchain.agents.structured_output import ProviderStrategy
import os, json

from tools import search_tool, wiki_tool, save_tool, image_tool, retrieve_tool

load_dotenv()

class ResearchResponse(BaseModel):
    topic: str
    summary: str
    sources: list[str]
    tools_used: list[str]
    image_b64: str | None = None

class UserQuery(BaseModel):
    query: str

SYSTEM_PROMPT = """
You are a research assistant that will help generate a research paper. You need to be somehow funny but informational
The response should be 150 words long.
Rules:
- Use tools when useful.
- Be concise and factual.
- Put sources as URLs in the sources list.
- Fill tools_used with the tool names you called.
- If the user asks for a picture/image/diagram, call the image tool and put the returned base64 string in image_b64.
- If no image was requested, set image_b64 to null.
- Try to use as much tools as possible to get accurate information.
- Use retrieve first ONLY when the question is likely answered by local docs.
- For general encyclopedic definitions (e.g., animals, basic concepts), prefer wikipedia.
- For recent events or “latest”, prefer search.
- If retrieve returns NO_RETRIEVAL_RESULTS, then use wikipedia or search.
"""

# Lazy init globals
llm = None
agent = None

def get_agent():
    global llm, agent
    if agent is not None:
        return agent

    llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-5.2"))

    agent = create_agent(
        model=llm,
        tools=[search_tool, wiki_tool, save_tool, image_tool, retrieve_tool],
        system_prompt=SYSTEM_PROMPT,
        response_format=ProviderStrategy(ResearchResponse),
    )
    return agent

def log_example(query: str, response, filename: str = "data/logs.jsonl"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    if hasattr(response, "model_dump"):
        response = response.model_dump()
    elif hasattr(response, "dict"):
        response = response.dict()

    with open(filename, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "ts": datetime.now().isoformat(),
            "query": query,
            "response": response
        }, ensure_ascii=False) + "\n")

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL")

allow_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if FRONTEND_URL:
    allow_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs", "endpoint": "POST /api/research"}



@app.post("/api/research", response_model=ResearchResponse)
async def run_research(user_input: UserQuery):
    a = get_agent()
    result = a.invoke({"messages": [HumanMessage(content=user_input.query)]})
    structured = result["structured_response"]

    structured_dict = structured.model_dump() if hasattr(structured, "model_dump") else structured.dict()
    log_example(user_input.query, structured_dict)
    return structured_dict
