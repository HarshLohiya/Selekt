import psycopg2
from psycopg2.extras import RealDictCursor
import argparse
import os


def get_connection_client(db_name, db_user, db_password, db_host, db_port):
    return psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_password,
        database=db_name
    )


def get_tables_info(cursor):
    """Get all tables and their basic info"""
    query = """
    SELECT 
        schemaname,
        tablename,
        tableowner
    FROM pg_tables 
    WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
    ORDER BY schemaname, tablename;
    """
    cursor.execute(query)
    return cursor.fetchall()

def get_table_columns(cursor, schema_name, table_name):
    """Get detailed column information for a table"""
    query = """
    SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
    FROM information_schema.columns
    WHERE table_schema = %s AND table_name = %s
    ORDER BY ordinal_position;
    """
    cursor.execute(query, (schema_name, table_name))
    return cursor.fetchall()

def get_table_constraints(cursor, schema_name, table_name):
    """Get constraints (primary keys, foreign keys, etc.) for a table"""
    query = """
    SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = %s AND tc.table_name = %s
    ORDER BY tc.constraint_type, tc.constraint_name;
    """
    cursor.execute(query, (schema_name, table_name))
    return cursor.fetchall()

def get_table_indexes(cursor, schema_name, table_name):
    """Get indexes for a table"""
    query = """
    SELECT 
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = %s AND tablename = %s
    AND indexname NOT LIKE '%%_pkey';
    """
    cursor.execute(query, (schema_name, table_name))
    return cursor.fetchall()

def format_column_definition(column):
    """Format a column definition"""
    col_def = f"{column['column_name']} {column['data_type']}"
    
    # Add length for character types
    if column['character_maximum_length']:
        col_def += f"({column['character_maximum_length']})"
    
    # Add NOT NULL
    if column['is_nullable'] == 'NO':
        col_def += " NOT NULL"
    
    # Add default value
    if column['column_default']:
        col_def += f" DEFAULT {column['column_default']}"
    
    return col_def

def generate_create_table_sql(schema_name, table_name, columns, constraints):
    """Generate CREATE TABLE SQL statement"""
    sql_parts = []
    
    # Start CREATE TABLE
    if schema_name != 'public':
        return ""
        sql_parts.append(f"CREATE TABLE {schema_name}.{table_name} (")
    else:
        sql_parts.append(f"CREATE TABLE {table_name} (")
    
    # Add columns
    column_defs = []
    for column in columns:
        column_defs.append("    " + format_column_definition(column))
    
    # Add primary key constraints
    pk_columns = []
    for constraint in constraints:
        if constraint['constraint_type'] == 'PRIMARY KEY':
            pk_columns.append(constraint['column_name'])
    
    if pk_columns:
        column_defs.append(f"    PRIMARY KEY ({', '.join(pk_columns)})")
    
    sql_parts.append(",\n".join(column_defs))
    sql_parts.append(");")
    
    # Add foreign key constraints
    fk_constraints = []
    for constraint in constraints:
        if constraint['constraint_type'] == 'FOREIGN KEY':
            fk_sql = f"ALTER TABLE {schema_name}.{table_name} ADD CONSTRAINT {constraint['constraint_name']} "
            fk_sql += f"FOREIGN KEY ({constraint['column_name']}) "
            fk_sql += f"REFERENCES {constraint['foreign_table_name']}({constraint['foreign_column_name']});"
            fk_constraints.append(fk_sql)
    
    return "\n".join(sql_parts) + ("\n\n" + "\n".join(fk_constraints) if fk_constraints else "")

def get_enums(cursor, schema=None):
    """Get all enum types and their values"""
    query = """
    SELECT n.nspname as schema,
           t.typname as name,
           e.enumlabel as value,
           e.enumsortorder as sort_order
    FROM pg_type t
         JOIN pg_enum e ON t.oid = e.enumtypid
         JOIN pg_namespace n ON n.oid = t.typnamespace
    """
    if schema:
        query += " WHERE n.nspname = %s"
        cursor.execute(query, (schema,))
    else:
        cursor.execute(query)
    rows = cursor.fetchall()
    # Group by type
    enums = {}
    for row in rows:
        key = (row['schema'], row['name'])
        if key not in enums:
            enums[key] = []
        enums[key].append((row['sort_order'], row['value']))
    # Sort values
    for key in enums:
        enums[key] = [v for _, v in sorted(enums[key])]
    return enums

def get_functions(cursor, schema=None):
    """Get all user-defined functions and their definitions"""
    query = """
    SELECT n.nspname as schema,
           p.proname as name,
           pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    """
    if schema:
        query += " AND n.nspname = %s"
        cursor.execute(query, (schema,))
    else:
        cursor.execute(query)
    return cursor.fetchall()



def load_data_in_folder_structure(db_client, db_name):
       # 1. Create the folder if it doesn't exist
    if not os.path.exists(db_name):
        os.makedirs(db_name)

    cursor = db_client.cursor(cursor_factory=RealDictCursor)
    # 2. Get all tables
    tables = get_tables_info(cursor)

    # 3. Get all enums
    enums = get_enums(cursor)

    # 4. Get all functions
    functions = get_functions(cursor)

    sql_output = []
    sql_output.append("-- PostgreSQL Schema Export")
    sql_output.append("-- Generated by Python\n")
    
    # 5. Get enums
    enum_sql_str = ""
    if enums:
        sql_output.append("-- Enums")   
        for (schema, name), values in enums.items():
            enum_sql = f"CREATE TYPE {schema}.{name} AS ENUM ({', '.join([repr(v) for v in values])});"
            enum_sql_str += f"CREATE TYPE {schema}.{name} AS ENUM ({', '.join([repr(v) for v in values])});\n"

            sql_output.append(enum_sql)
            sql_output.append("")


    if functions:
        sql_output.append("-- Functions")
        for func in functions:
            sql_output.append(func['definition'].strip())
            sql_output.append("")

    # 3. For each table, get the schema
    for table in tables:
        table_schema = []
        schema_name = table['schemaname']
        table_name = table['tablename']

        print(f"Processing {schema_name}.{table_name}...")
            
        # Get columns
        columns = get_table_columns(cursor, schema_name, table_name)
            
        # Get constraints
        constraints = get_table_constraints(cursor, schema_name, table_name)
            
        # Get indexes
        indexes = get_table_indexes(cursor, schema_name, table_name)
            
        # Generate CREATE TABLE SQL
        create_sql = generate_create_table_sql(schema_name, table_name, columns, constraints)
        sql_output.append(create_sql)

        table_schema.append(create_sql)

        # Add indexes
        for index in indexes:
                sql_output.append(index['indexdef'] + ";")
                table_schema.append(index['indexdef'] + ";")

        table_file_path = os.path.join(db_name, f"{table_name}.sql")
        with open(table_file_path, "w") as f:
            # Write all enums at the top of each table schema file
            f.write(enum_sql_str)
            f.write("\n".join(table_schema))
        sql_output.append("") 
    
    # 6. Write to file
    with open(f"{db_name}/base_schema.sql", "w") as f:
        f.write("\n".join(sql_output))
    
    print(f"\nSchema successfully exported to {db_name}/base_schema.sql")
    print(f"Exported {len(tables)} tables")
            

def get_schema(database_name, table_names=[]):
    """
    Reads and returns the schema string for the given database_name.
    If table_names are provided, reads and concatenates their schemas from /database_name/table_name.sql.
    If not, reads the base_schema.sql.
    Returns the schema string.
    """
    if table_names is None or len(table_names) == 0:
        base_schema_path = os.path.join(database_name, "base_schema.sql")
        with open(base_schema_path, 'r') as f:
            return f.read()
    else:
        schemas = []
        for table in table_names:
            table_path = os.path.join(database_name, f"{table}.sql")
            with open(table_path, 'r') as f:
                schemas.append(f.read())
        return "\n".join(schemas)


def load_schema_driver(db_name="", db_user="", db_password="", db_host="", db_port=""):
    
    db_connection = get_connection_client(
        db_name=db_name,
        db_user=db_user,
        db_password=db_password,
        db_host=db_host,
        db_port=db_port
    )

    load_data_in_folder_structure(db_connection, "dg_local")

    db_connection.close()

    

if __name__ == '__main__':
    load_schema_driver(
        db_name='dg_local',
        db_host='localhost',
        db_password='random_dg_pass',
        db_user='dg_user',
        db_port='5432'
    )
