from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent

from tools import search_tool, wiki_tool, save_tool

load_dotenv()

class ResearchResponse(BaseModel):
    topic: str
    summary: str
    sources: list[str]
    tools_used: list[str]

llm = ChatOpenAI(model="gpt-5-nano")  

agent = create_agent(
    model=llm,
    tools=[search_tool, wiki_tool, save_tool],
    system_prompt=(
        "You are a research assistant that produces structured research reports.\n"
        "Use tools when helpful.\n"
        "Always fill: topic, summary, sources, tools_used."
    ),
    response_format=ResearchResponse,  
)

query = input("What can I help you research? ")

result = agent.invoke({"messages": [{"role": "user", "content": query}]})
print(result["structured_response"])
