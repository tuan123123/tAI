from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain.agents import create_agent
from langchain.agents.structured_output import ProviderStrategy

from tools import search_tool, wiki_tool, save_tool, image_tool, retrieve_tool

load_dotenv()

llm = ChatOpenAI(model="gpt-4.1")


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

Rules:
- Use tools when useful.
- Be concise and factual.
- Put sources as URLs in the sources list.
- Fill tools_used with the tool names you called.
- If the user asks for a picture/image/diagram, call the image tool and put the returned base64 string in image_b64.
- If no image was requested, set image_b64 to null.
- Always call retrieve first for factual questions.
- If retrieve returns NO_RETRIEVAL_RESULTS, then you may use search or wikipedia.
- Never invent sources. If you can’t find sources, return an empty sources list.
"""

agent = create_agent(
    model=llm,
    tools=[search_tool, wiki_tool, save_tool, image_tool, retrieve_tool],
    system_prompt=SYSTEM_PROMPT,  
    response_format=ProviderStrategy(ResearchResponse),  
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/research", response_model=ResearchResponse)
async def run_research(user_input: UserQuery):
    result = agent.invoke({"messages": [HumanMessage(content=user_input.query)]})
    return result["structured_response"]
