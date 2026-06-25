import pandas as pd
import json

file_path = "Stock report (APR-26) 30.04.26.xlsx"
sheet_name = 'Planing & Incoming'

try:
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None, skiprows=15, nrows=20)
    # Take first 10 columns
    df = df.iloc[:, :15]
    
    # print raw data row by row
    data = []
    for index, row in df.iterrows():
        # clean nan
        cleaned_row = [str(x) if pd.notna(x) else "" for x in row.tolist()]
        data.append(cleaned_row)
        
    for row in data:
        print(row)
except Exception as e:
    print(f"Error: {e}")
