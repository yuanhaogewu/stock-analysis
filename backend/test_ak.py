import requests
url = "http://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sh000300"
headers = {"Referer": "http://finance.sina.com.cn"}
try:
    r = requests.get(url, headers=headers)
    print(r.text)
except Exception as e:
    print(f"Failed: {e}")
