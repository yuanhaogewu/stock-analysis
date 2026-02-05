import akshare as ak
import pandas as pd
import os

os.environ['NO_PROXY'] = '*'

try:
    print("Fetching EM spot data...")
    print(ak.stock_zh_a_spot_em().head())
except Exception as e:
    print(f"EM Error: {e}")

try:
    print("\nFetching Sina spot data...")
    print(ak.stock_zh_a_spot().head())
except Exception as e:
    print(f"Sina Error: {e}")
