from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI()

JOB_ID = "ftjob-WvDeYx6cvQX8zeIUvL7MIzb5"

job = client.fine_tuning.jobs.retrieve(JOB_ID)
print("status:", job.status)
print("fine_tuned_model:", job.fine_tuned_model)
print("error:", job.error)
