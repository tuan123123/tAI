from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

models = client.models.list()
for m in models.data:
    print(m.id)
