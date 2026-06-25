import pandas as pd

file_path = "Stock report (APR-26) 30.04.26.xlsx"
sheets_to_check = ['MASTER', 'Summary', 'Special Part List']

for sheet in sheets_to_check:
    print(f"\n=== Checking sheet: {sheet} ===")
    try:
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=10)
        print("Columns:", df.columns.tolist())
        print(df.head(3).to_dict(orient='records'))
    except Exception as e:
        print(f"Error reading {sheet}: {e}")
