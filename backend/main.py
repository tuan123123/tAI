import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain.agents import create_agent


from tools import search_tool, wiki_tool, save_tool


# --- Robust .env loading ---
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

llm = ChatOpenAI(model="gpt-5-nano")


class ResearchResponse(BaseModel):
    topic: str
    summary: str
    sources: list[str]
    tools_used: list[str]


class UserQuery(BaseModel):
    query: str


agent = create_agent(
    model=llm,
    tools=[search_tool, wiki_tool, save_tool],
    response_format=ResearchResponse,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/research", response_model=ResearchResponse)
async def run_research(user_input: UserQuery):
    state = {"messages": [HumanMessage(content=user_input.query)]}

    result = await agent.ainvoke(state)

    return result["structured_response"]
