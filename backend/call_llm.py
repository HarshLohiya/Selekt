"""
write a class that can be initialised with options to behave as A DBA or data analyst, choose a model
then have a function to call the llm with either base context or user selected context or previous conversion context 
and have a natural language prompt to call the llm and return the response    

How would a interaction transaction look like?
when will the model be initialised with the base context? ()
When will the model answer based on old chat? (send old messages to the model)

If the number of prompts have increase a lot. 
in that case what we will prune the previous conversation array. 
By maintaining the last 3-4 messages and the first message. 

What should i do next?

1. I want to improve the code?
    What is to be improved here?
    What should be the interface?
        Select a database and pass the database creds. (this 
            should go ahead and connect to the db and download the shema.)
        select a LLM and role
         Use either the complete schema or a some tables as schmea.
         Ask questions. 
         Have options to either clear all the context.
         Or clear partial conext?

    p0:- Let me test this interface out

2. Improve the prompt?
3. Add support for gemini?
    No better to go in the claude route.

4. Add tick token to count tokens
"""

from venv import logger
from openai import OpenAI
import requests
import json
import httpx
import boto3
import os
from .prompts import (base_prompt_dba, 
                    base_prompt_data_analyst, 
                    base_prompt_developer,
                    database_schema_prompt)

from .load_schema import load_schema_driver, get_schema
from dotenv import load_dotenv
load_dotenv()

roles_to_prompts = {
            "dba": base_prompt_dba,
            "data_analyst": base_prompt_data_analyst,
            "developer": base_prompt_developer
        }

GEMINI_API_KEY = "AIzaSyAzMWXvT1rT9Vu4vkBPr-zh3ilnnvfc-8A"
DEFAULT_MODEL = "llama3:latest"
DEFAULT_ROLE = "dba"

model_api_data = {
    "deepseek-r1":{"api_key":"ollama",
                   "base_url":"http://localhost:11434/v1"},
    "llama3:latest":{"api_key":"ollama",
                    "base_url":"http://localhost:11434/v1"},
    "gemini":{"api_key":GEMINI_API_KEY,
              "base_url":"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"},
    "bedrock":{"api_key":os.getenv("AWS_ACCESS_KEY_ID"),
               "base_url":os.getenv("AWS_REGION", "ap-south-1")}
}

class LLM:
    def __init__(self, model, role, database_name):
        self.model = model
        self.client = None
        self.role = role
        self.context = None
        self.database_name = database_name
        self.previous_conversations = []
        self.call_count = 0
        self.database_schema = None
        self.mode = "base_schema"
        self.toke_count = 0

    def stringify(self):
        attrs = [
            f"model: {self.model}",
            f"role: {self.role}",
            f"context: {self.context}" if self.context else "context: None",
            f"previous_conversations: {self.previous_conversations}",
            f"call_count: {self.call_count}",
            f"database_schema: {self.database_schema}" if self.database_schema else "database_schema: None",
            f"mode: {self.mode}",
            f"toke_count: {self.toke_count}",
        ]
        str_to_print="\n".join(attrs)
        print(str_to_print)
    
    def lighten_conversation_history(self):
        """
        If previous_conversations exceeds 5, keep only the first and last two messages.
        """
        if len(self.previous_conversations) > 5:
            self.previous_conversations = [
                self.previous_conversations[0],
                *self.previous_conversations[-2:]
            ]

    def clear_conversations(self, peserve_count=0):
        if peserve_count > 0:
            self.previous_conversations = self.previous_conversations[:peserve_count]
        self.database_schema = None
        self.context = None
        self.call_count = 0

    def initialise_schema(self, table_names=[]):
        schema = get_schema(database_name=self.database_name,
                            table_names=table_names)
        self.database_schema = schema
        logger.info("\n" + "="*50)
        logger.info(f"Loaded schema for database {self.database_name}")
        logger.info(f"Schema length: {len(schema) if schema else 0} characters")
        if not schema:
            logger.warning("No schema was loaded!")
            return
        logger.info("First 100 characters of schema:")
        logger.info(schema[:100] if schema else "No schema content")
        logger.info("="*50 + "\n")

    def get_base_context(self):
        if self.role not in roles_to_prompts:
            return base_prompt_developer
        
        return roles_to_prompts[self.role]
    
    def initialise_base_context(self):
        base_prompt = self.get_base_context()
        if not self.database_schema:
            logger.warning("\n" + "="*50)
            logger.warning("No database schema available when initializing base context!")
            logger.warning("="*50 + "\n")
            self.context = base_prompt
            return
            
        self.context = base_prompt + database_schema_prompt.format(
                database_schema=self.database_schema)
        logger.info("\n" + "="*50)
        logger.info(f"Initialized base context with schema. Context length: {len(self.context)}")
        logger.info("="*50 + "\n")

    def initialise_first_message(self):
        self.previous_conversations=[]
        self.previous_conversations.append({"role": "system", "content": self.context})

    def initialise_model_client(self, api_key, base_url):
        if self.model == "bedrock":
            # print("AWS_ACCESS_KEY_ID:", os.getenv("AWS_ACCESS_KEY_ID"))
            # print("AWS_SECRET_ACCESS_KEY:", os.getenv("AWS_SECRET_ACCESS_KEY"))
            # print("AWS_REGION:", os.getenv("AWS_REGION"))
            # print("AWS_SESSION_TOKEN:", os.getenv("AWS_SESSION_TOKEN"))
            self.client = boto3.client(
                "bedrock-runtime",
                region_name=base_url,
                aws_access_key_id=api_key,
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                aws_session_token=os.getenv("AWS_SESSION_TOKEN")
            )
        else:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                http_client=httpx.Client()
            )
        
    def stream_chat(self, messages):
        if self.call_count > 5:
            self.lighten_conversation_history()

        assistant_response = ""
        try:
            if self.model == "bedrock":
                # Prepare the request for Bedrock
                logger.info("\n" + "="*50)
                logger.info(f"Body sent to llm: {messages[-1]['content']}")
                logger.info("="*50 + "\n")
                bedrock_request = {
                    "modelId": os.getenv('BEDROCK_ID'),
                    "contentType": "application/json",
                    "accept": "application/json",
                    "body": json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 1000,
                        "system": self.context,
                        "messages": [
                            *[{"role": msg["role"], "content": [{"type": "text", "text": msg["content"]}]} 
                              for msg in messages[1:]]  # Skip system message as it's in system field
                        ]
                    })
                }
                response = self.client.invoke_model(**bedrock_request)
                response_body = json.loads(response["body"].read())
                
                # Extract the actual content from the Bedrock response
                if isinstance(response_body, dict):
                    if 'content' in response_body:
                        content_list = response_body['content']
                        if isinstance(content_list, list) and len(content_list) > 0:
                            content_item = content_list[0]
                            if isinstance(content_item, dict) and 'text' in content_item:
                                raw_response = content_item['text']
                            else:
                                raw_response = str(content_item)
                        else:
                            raw_response = str(content_list)
                    else:
                        raw_response = str(response_body)
                else:
                    raw_response = str(response_body)
                
                return raw_response
            else:
                
                
                stream = self.client.chat.completions.create(
                    model=self.model,
                    messages=self.previous_conversations,
                    stream=True,
                )
                raw_response = ""
                for chunk in stream:
                    if hasattr(chunk.choices[0].delta, "reasoning_content") and chunk.choices[0].delta.reasoning_content:
                        print(chunk.choices[0].delta.reasoning_content, end="", flush=True)
                    if chunk.choices[0].delta.content:
                        print(chunk.choices[0].delta.content, end="", flush=True)
                        raw_response += chunk.choices[0].delta.content

                self.call_count += 1
                self.previous_conversations.append({"role": "assistant", "content": raw_response})
                return raw_response

        except Exception as e:
            print(f"Unexpected Error: {e}")
            raise e

    def to_json(self):
        return json.dumps({
            "model": self.model,
            "role": self.role,
            "context": self.context,
            "database_name": self.database_name,
            "previous_conversations": self.previous_conversations,
            "call_count": self.call_count,
            "database_schema": self.database_schema,
            "mode": self.mode,
            "toke_count": self.toke_count
        })

    @classmethod
    def from_json(cls, json_str):
        data = json.loads(json_str)
        llm = cls(model=data["model"], role=data["role"], database_name=data["database_name"])
        llm.context = data["context"]
        llm.previous_conversations = data["previous_conversations"]
        llm.call_count = data["call_count"]
        llm.database_schema = data["database_schema"]
        llm.mode = data["mode"]
        llm.toke_count = data["toke_count"]
        # Reinitialize the model client
        api_key = model_api_data[llm.model].get("api_key")
        base_url = model_api_data[llm.model].get("base_url")
        llm.initialise_model_client(api_key=api_key, base_url=base_url)
        return llm

def llm_initialisation_factory(role, llm_name, database_name):
    api_key = model_api_data[llm_name].get("api_key")
    base_url = model_api_data[llm_name].get("base_url")
    llm = LLM(model=llm_name, role=role, database_name=database_name)
    llm.initialise_model_client(api_key=api_key, base_url=base_url)

    return llm


if __name__ == '__main__':

    db_creds = input('Enter the database creds in format \n{"db_name": "db_name","db_user": "db_user", "db_password": "db_password","db_host": "db_host","db_port": "db_port"} : \n').strip().lower()
    db_creds_json = json.loads(db_creds)
    
    load_schema_flag = input('load schema yes / no : \n')
    if load_schema_flag=='yes':
        load_schema_driver(
            db_name=db_creds_json.get("db_name"),
            db_host=db_creds_json.get("db_host"),
            db_password=db_creds_json.get("db_password"),
            db_port=db_creds_json.get("db_port"),
            db_user=db_creds_json.get("db_user")
        )
    
    input_string = input('Enter the model to use and role(dba, data_analyst, developer) seperated by space : \n').strip().lower()
    model, role = input_string.split(" ")
    if model not in model_api_data:
        model = input('Please select a model from availible models: \n')

        if model not in model_api_data:
            model = DEFAULT_MODEL
    
    llm_object = llm_initialisation_factory(role=role, llm_name=model, database_name=db_creds_json.get("db_name"))

    initialize_tables = input("Enter the table names to initialize the context, empty to use complete db schema: \n").strip().lower()
    table_names = []
    if ',' in initialize_tables:
        table_names = initialize_tables.split(',')
    llm_object.initialise_schema(table_names)
    llm_object.initialise_base_context()
    llm_object.initialise_first_message()
    while True:
        user_input = input("\nYou: \n").strip().lower()
        if user_input == "clear":
            llm_object.clear_conversations()
            continue
        if user_input == "debug":
            llm_object.stringify()
            continue
        if user_input in ["exit", "quit"]:
            break
        if user_input.startswith("reinitialise"):
            message, table_names = user_input.split(" ")
            table_names = table_names.split(",")
            llm_object.clear_conversations()
            llm_object.initialise_schema(table_names)
            llm_object.initialise_base_context()
            llm_object.initialise_first_message()
            continue
        # on what input should i initialise a new table schema
        llm_object.stream_chat(prompt=user_input)

    
