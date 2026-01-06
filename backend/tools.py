from datetime import datetime
from openai import OpenAI
from langchain.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper


@tool("save")
def save_tool(data: str, filename: str = "research_output.txt") -> str:
    """Append the research output to a local .txt file and return a confirmation message."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted_text = f"--- Research Output ---\nTimestamp: {timestamp}\n\n{data}\n\n"

    with open(filename, "a", encoding="utf-8") as f:
        f.write(formatted_text)

    return f"Data successfully saved to {filename}"


_search = DuckDuckGoSearchRun()

@tool("search")
def search_tool(query: str) -> str:
    """Search the web for relevant information and return results."""
    return _search.run(query)


_api_wrapper = WikipediaAPIWrapper(top_k_results=1, doc_content_chars_max=300)
wiki_tool = WikipediaQueryRun(api_wrapper=_api_wrapper)

@tool("image")
def image_tool(prompt: str) -> str:
    """Generate an image from a text prompt and return base64 PNG."""
    client = OpenAI()
    result = client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt,
        size="1024x1024"
    )
    return result.data[0].b64_json
