import requests
import json
import os

os.environ['NO_PROXY'] = '*'

url = "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152"

try:
    print(f"Requesting EM URL...")
    resp = requests.get(url, timeout=10)
    print(f"Status Code: {resp.status_code}")
    print(resp.json()['data']['diff'][0])
except Exception as e:
    print(f"Manual EM Error: {e}")
