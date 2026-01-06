from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()
client = OpenAI()

path = "data/train.jsonl"

print("Uploading file:", os.path.abspath(path))
print("File size bytes:", os.path.getsize(path))


with open(path, "r", encoding="utf-8") as f:
    n_lines = sum(1 for _ in f)
print("Line count:", n_lines)

training_file = client.files.create(
    file=open(path, "rb"),
    purpose="fine-tune",
)

print("Training file ID:", training_file.id)

job = client.fine_tuning.jobs.create(
    model="gpt-4.1-mini-2025-04-14",
    training_file=training_file.id,
)

print("Job ID:", job.id)
