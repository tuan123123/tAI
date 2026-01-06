import json

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

with open("data/logs.jsonl", "r", encoding="utf-8") as fin, open("data/train.jsonl", "w", encoding="utf-8") as fout:
    for line in fin:
        row = json.loads(line)
        query = row["query"]
        resp = row["response"]

        #if add image_b64 later
        resp.setdefault("image_b64", None)

        example = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
                {"role": "assistant", "content": json.dumps(resp, ensure_ascii=False)}
            ]
        }
        fout.write(json.dumps(example, ensure_ascii=False) + "\n")
