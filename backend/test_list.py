import akshare as ak
import os
os.environ['NO_PROXY'] = '*'
try:
    df = ak.stock_zh_a_spot()
    print(f"Total stocks: {len(df)}")
    print(df[df['代码'].str.contains('002131')])
except Exception as e:
    print(f"Error: {e}")
