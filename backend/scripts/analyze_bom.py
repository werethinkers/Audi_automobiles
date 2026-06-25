import pandas as pd
import json

file_path = "Stock report (APR-26) 30.04.26.xlsx"
sheet_name = 'Planing & Incoming'

try:
    # Read the whole sheet
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    
    # Find the header row
    header_row_idx = -1
    for idx, row in df.iterrows():
        # Check if row has "PART NO . "
        if any(isinstance(cell, str) and "PART NO" in cell for cell in row.values):
            header_row_idx = idx
            break
            
    if header_row_idx == -1:
        print("Header row not found.")
        exit(1)
        
    print(f"Found headers at row {header_row_idx}")
    
    # Read the actual data table
    df_parts = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=header_row_idx)
    # clean up column names
    df_parts.columns = df_parts.columns.str.strip()
    
    # Drop rows without a part number
    df_parts = df_parts.dropna(subset=['PART NO .'])
    
    unique_models = df_parts['MODEL'].dropna().unique()
    print(f"Unique models found: {unique_models}")
    
    unique_parts = df_parts['PART NO .'].unique()
    print(f"Unique parts found: {len(unique_parts)}")
    
    # Let's inspect rows where MODEL is not empty
    df_with_model = df_parts[df_parts['MODEL'].notna() & (df_parts['MODEL'] != "")]
    print(f"Parts with explicit model: {len(df_with_model)}")
    if len(df_with_model) > 0:
        print(df_with_model[['PART NO .', 'MODEL']].head(10))

except Exception as e:
    print(f"Error: {e}")
