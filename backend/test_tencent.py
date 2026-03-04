import httpx
import asyncio

async def test_tencent():
    symbol = "sz000977" # 浪潮信息
    url = f"http://qt.gtimg.cn/q={symbol}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        print(f"Raw Response: {resp.text}")
        parts = resp.text.split('~')
        for i, p in enumerate(parts):
            print(f"{i}: {p}")

if __name__ == "__main__":
    asyncio.run(test_tencent())
