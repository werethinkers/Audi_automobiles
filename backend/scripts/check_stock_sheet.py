import pandas as pd

# Read ORDER sheet properly
df = pd.read_excel('Stock report (APR-26) 30.04.26.xlsx', sheet_name='ORDER', header=2)
df.columns = [str(c).strip() for c in df.columns]

print('Columns:', df.columns.tolist())
print('Total rows:', len(df))
print()

# Focus on key columns for inventory
stock_cols = ['PART NO .', 'DESCRIPTION', 'UOM', 'OP. STOCK', 'Total Received', 'Consume', 'Closing Stock']
df_sub = df[stock_cols].copy()
df_sub.columns = ['part_no', 'description', 'uom', 'op_stock', 'total_received', 'consume', 'closing_stock']

# Clean part_no
df_sub['part_no'] = df_sub['part_no'].astype(str).str.strip()
df_sub['part_no'] = df_sub['part_no'].apply(lambda x: x[:-2] if x.endswith('.0') else x)

# Drop rows where part_no is empty or NaN
df_sub = df_sub[df_sub['part_no'].notna() & (df_sub['part_no'] != '') & (df_sub['part_no'] != 'nan')]

# Convert numeric
df_sub['closing_stock'] = pd.to_numeric(df_sub['closing_stock'], errors='coerce').fillna(0)

print(f'Valid rows with part_no: {len(df_sub)}')
print(f'Rows with closing_stock > 0: {(df_sub["closing_stock"] > 0).sum()}')
print(f'Rows with closing_stock == 0: {(df_sub["closing_stock"] == 0).sum()}')
print(f'Total closing stock qty: {df_sub["closing_stock"].sum():.0f}')
print()
print('Sample (first 5 rows):')
print(df_sub.head(5).to_string())
