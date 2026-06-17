import re

# Parse rm_models.py
models_code = open(r'd:\dev audi\Audi\backend\app\models\rm_models.py').read()
tables = {}
current_table = None
for line in models_code.split('\n'):
    line = line.strip()
    if line.startswith('__tablename__'):
        current_table = line.split('=')[1].strip().strip('\'\"')
        tables[current_table] = []
    elif current_table and 'Column(' in line and not line.startswith('#'):
        col_name = line.split('=')[0].strip()
        tables[current_table].append(col_name)
    elif line.startswith('class '):
        current_table = None

print('Current ORM Tables:')
for t, cols in tables.items():
    print(f'- {t}: {cols}')
