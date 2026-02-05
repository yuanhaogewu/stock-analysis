import akshare as ak
import os
os.environ['NO_PROXY'] = '*'
try:
    df = ak.stock_info_a_code_name()
    print(f"Total stocks: {len(df)}")
    print(df.head())
except Exception as e:
    print(f"Error: {e}")
