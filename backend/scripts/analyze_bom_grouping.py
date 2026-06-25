import pandas as pd
import json

file_path = "Stock report (APR-26) 30.04.26.xlsx"
sheet_name = 'Planing & Incoming'

try:
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    
    # Find the header row
    header_row_idx = -1
    for idx, row in df.iterrows():
        if any(isinstance(cell, str) and "PART NO" in cell for cell in row.values):
            header_row_idx = idx
            break
            
    if header_row_idx == -1:
        print("Header row not found.")
        exit(1)
        
    print(f"Header row is {header_row_idx}")
    
    current_model = "Unknown Model"
    boms = {}
    
    # Iterate from header row onwards to see if we can deduce grouping
    for idx in range(header_row_idx + 1, len(df)):
        row = df.iloc[idx]
        
        # Check if this row is a model header (e.g. only 1 or 2 text columns, no part no)
        # Or maybe it has "PART NO" column empty but some text in DESCRIPTION column
        part_no = str(row[2]).strip() if pd.notna(row[2]) else ""
        desc = str(row[3]).strip() if pd.notna(row[3]) else ""
        
        if part_no == "" and desc != "" and "Total" not in desc:
            current_model = desc
            if current_model not in boms:
                boms[current_model] = []
            continue
            
        if part_no != "" and part_no != "nan":
            if current_model not in boms:
                boms[current_model] = []
            boms[current_model].append(part_no)

    for model, parts in list(boms.items())[:5]: # Print first 5 models
        print(f"Model: {model}, Parts count: {len(parts)}")
        print(f"First 3 parts: {parts[:3]}")
        
    print(f"Total models found: {len(boms)}")

except Exception as e:
    print(f"Error: {e}")
