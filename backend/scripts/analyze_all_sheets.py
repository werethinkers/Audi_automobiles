import pandas as pd
import json

file_path = "Stock report (APR-26) 30.04.26.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    for sheet in xl.sheet_names:
        print(f"\n{'='*40}")
        print(f"SHEET: {sheet}")
        print(f"{'='*40}")
        try:
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
            # Find the first row that looks like headers (has > 3 string values)
            header_idx = -1
            for idx, row in df.iterrows():
                str_count = sum(isinstance(v, str) for v in row.values)
                if str_count > 3:
                    header_idx = idx
                    break
            
            if header_idx != -1:
                df = pd.read_excel(file_path, sheet_name=sheet, skiprows=header_idx, nrows=3)
            
            print("Headers:", df.columns.tolist()[:15]) # Print first 15 columns
            print("First row:", df.iloc[0].to_list()[:15] if len(df) > 0 else "Empty")
        except Exception as e:
            print(f"Error reading {sheet}: {e}")

except Exception as e:
    print(f"Error: {e}")
