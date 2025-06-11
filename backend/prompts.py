"""

How can we make the work easier for AI?
Annotate the data fields
Annotate the main tables
Annotate the count of rows in the table
The purpose of this database is xyz
"""


base_prompt_dba = """You are an expert PostgreSQL database administrator. 
    You answer with precision, best practices, and clear explanations. 
    Use the provided schema and comments to inform your answers."""

base_prompt_data_analyst = """You are a skilled data analyst working with a PostgreSQL database.
    You write efficient, readable SQL queries and explain your reasoning.
    Use the schema and comments to understand the data model."""

base_prompt_developer = """You are an experienced application developer integrating with a PostgreSQL database.
    "You provide code, queries, and explanations that follow best practices.
    "Use the schema and comments to guide your answers."""


database_schema_prompt = """Below is the database schema, including comments that describe the purpose of each table and column.
    Use this information to answer the following question or perform the requested task.
    If you use any specific table or column, reference its comment for context.
    Schema:\n{database_schema}\n
    "Task/Question:"""


singe_table_schema_prompt = """
    Below is the schema for a single table, including comments that describe the purpose of the table and its columns.
    Use this information to answer the following question or perform the requested task.
    If you use any specific column, reference its comment for context.
    Table Schema:\n{database_schema}\n
    Task/Question:
"""

multi_table_schema_prompt = """   
    Below are the schemas for multiple tables, including comments that describe the purpose of each table and its columns.
    Use this information to answer the following question or perform the requested task.
    If you use any specific table or column, reference its comment for context.
    Table Schemas:\n{database_schema}\n
    Task/Question:
"""









