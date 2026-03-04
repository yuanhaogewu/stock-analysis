import akshare as ak
import pandas as pd
import sys

try:
    print("Fetching data from EM...")
    data = ak.stock_zh_a_spot_em()
    print("Success!")
    print("Columns in ak.stock_zh_a_spot_em:")
    print(data.columns.tolist())
    print("\nFirst row sample:")
    print(data.iloc[0].to_dict())
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
