import re

with open('schema.sql', 'r', encoding='utf-8') as f:
    content = f.read()

def repl(m):
    table_name = m.group(1)
    body = m.group(2)
    cols = m.group(3)
    where_cond = m.group(4)
    trailing = m.group(5)
    
    body = re.sub(r',\s*$', '', body)
    
    new_table = f"CREATE TABLE {table_name} ({body}{trailing});"
    new_index = f"\nCREATE UNIQUE INDEX uq_{table_name} ON {table_name}({cols}) WHERE {where_cond};\n"
    
    return new_table + new_index

pattern = r'(?i)CREATE TABLE\s+([A-Za-z0-9_]+)\s*\((.*?)(?:,\s*)?UNIQUE\s*\(([^)]+)\)\s*WHERE\s+([^,;\n]+)(.*?)\);'

new_content = re.sub(pattern, repl, content, flags=re.DOTALL)

with open('schema.sql', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Replaced constraints')
