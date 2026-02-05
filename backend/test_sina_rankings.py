import requests
import os

os.environ['NO_PROXY'] = '*'

url = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=10&sort=changepercent&asc=0&node=hs_a&symbol=&_s_r_a=init"

try:
    print(f"Requesting Sina API...")
    headers = {"Referer": "http://finance.sina.com.cn"}
    resp = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {resp.status_code}")
    print(resp.text[:200])
except Exception as e:
    print(f"Sina API Error: {e}")
