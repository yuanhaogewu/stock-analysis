import os
import time
import logging
import asyncio
os.environ['NO_PROXY'] = '*'
from threading import Lock
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
import akshare as ak
import pandas as pd
from typing import List, Optional
from functools import lru_cache
import datetime
import requests
from pydantic import BaseModel
from database import get_db_connection, hash_password, init_database

# Initialize database
init_database()

# Pydantic models
class AdminLogin(BaseModel):
    username: str
    password: str

class PasswordReset(BaseModel):
    answer: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserCreate(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    password: Optional[str] = None

class SystemConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    model_id: Optional[str] = None
    base_url: Optional[str] = None

# Try to load .env manually if exists
try:
    if os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v
except Exception:
    pass

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Chinese A-Share Stock Analysis API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# K-Line Cache
_kline_cache = {}
_kline_lock = Lock()

class StockDataManager:
    def __init__(self):
        self._stock_list = None
        self._last_list_update = 0
        self._spot_data = None
        self._last_spot_update = 0
        self._lock = Lock()
        self.list_expiry = 3600  # 1 hour
        self.spot_expiry = 60    # 60 seconds
        self._is_updating_list = False
        self._is_updating_spot = False

    async def update_stock_list(self):
        if self._is_updating_list: return
        self._is_updating_list = True
        try:
            logger.info("Background updating stock list via info_a_code_name...")
            data = await asyncio.to_thread(ak.stock_info_a_code_name)
            if data is not None and not data.empty:
                data = data.rename(columns={"code": "代码", "name": "名称"})
                with self._lock:
                    self._stock_list = data
                    self._last_list_update = time.time()
                logger.info(f"Stock list updated: {len(data)} stocks.")
            else:
                raise ValueError("Fetched empty stock list")
        except Exception as e:
            logger.error(f"Stock list update error: {e}")
            if self._stock_list is None:
                # Fallback list if something goes wrong
                with self._lock:
                    self._stock_list = pd.DataFrame([
                        {"代码": "600000", "名称": "浦发银行", "最新价": 10.5},
                        {"代码": "000001", "名称": "平安银行", "最新价": 12.3},
                        {"代码": "000858", "名称": "五粮液", "最新价": 150.5},
                        {"代码": "600519", "名称": "贵州茅台", "最新价": 1700.0},
                        {"代码": "002594", "名称": "比亚迪", "最新价": 220.5},
                        {"代码": "300750", "名称": "宁德时代", "最新价": 180.2},
                        {"代码": "601318", "名称": "中国平安", "最新价": 45.3},
                        {"代码": "000002", "名称": "万科A", "最新价": 9.5},
                        {"代码": "601398", "名称": "工商银行", "最新价": 5.4},
                        {"代码": "300059", "名称": "东方财富", "最新价": 15.6},
                        {"代码": "002131", "名称": "利欧股份", "最新价": 2.5}
                    ])
                    self._last_list_update = time.time()
        finally:
            self._is_updating_list = False

    async def update_spot_data(self):
        if self._is_updating_spot: return
        self._is_updating_spot = True
        try:
            # Use EM as primary as it's more stable and comprehensive
            logger.info("Background updating spot data via EM...")
            data = await asyncio.to_thread(ak.stock_zh_a_spot_em)
            if data is not None and not data.empty:
                # Standardize columns for EM data
                # EM columns: ['代码', '名称', '最新价', '涨跌幅', '涨跌额', '成交量', '成交额', '振幅', '最高', '最低', '今开', '昨收', '量比', '换手率', '市盈率-动态', '市净率']
                with self._lock:
                    self._spot_data = data
                    self._last_spot_update = time.time()
                logger.info(f"Spot data updated via EM: {len(data)} records.")
            else:
                # Try Sina as fallback
                logger.info("EM failed, trying Sina as fallback...")
                data = await asyncio.to_thread(ak.stock_zh_a_spot)
                if data is not None and not data.empty:
                    with self._lock:
                        self._spot_data = data
                        self._last_spot_update = time.time()
                    logger.info("Spot data updated via Sina.")
        except Exception as e:
            logger.error(f"Spot data update error: {e}")
        finally:
            self._is_updating_spot = False

    def get_stock_list_fast(self, background_tasks: BackgroundTasks):
        now = time.time()
        if self._stock_list is None or (now - self._last_list_update) > self.list_expiry:
            background_tasks.add_task(self.update_stock_list)
        return self._stock_list if self._stock_list is not None else pd.DataFrame(columns=["代码", "名称"])

    def get_spot_data_fast(self, background_tasks: BackgroundTasks):
        now = time.time()
        if self._spot_data is None or (now - self._last_spot_update) > self.spot_expiry:
            background_tasks.add_task(self.update_spot_data)
        return self._spot_data if self._spot_data is not None else pd.DataFrame(columns=["代码", "名称"])

data_manager = StockDataManager()

async def get_cached_kline(symbol: str):
    now = time.time()
    with _kline_lock:
        if symbol in _kline_cache:
            data, timestamp = _kline_cache[symbol]
            if now - timestamp < 300:  # 5 minutes cache
                return data
    
    try:
        clean_symbol = "".join(filter(str.isdigit, symbol))
        df = await asyncio.to_thread(ak.stock_zh_a_hist, symbol=clean_symbol, period="daily", adjust="qfq")
        if df.empty: return None
        data = df[['日期', '开盘', '最高', '最低', '收盘', '成交量']]
        with _kline_lock:
            _kline_cache[symbol] = (data, now)
        return data
    except Exception as e:
        logger.error(f"K-line fetch error for {symbol}: {e}")
        return None

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(data_manager.update_stock_list())
    asyncio.create_task(data_manager.update_spot_data())

@app.get("/api/market/indices")
async def get_market_indices():
    try:
        # Manual fetch from Sina for maximum reliability
        url = "http://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sh000300"
        headers = {"Referer": "http://finance.sina.com.cn"}
        resp = await asyncio.to_thread(requests.get, url, headers=headers, timeout=5)
        lines = resp.text.strip().split('\n')
        
        res = {}
        mapping = {
            "s_sh000001": "sse",
            "s_sz399001": "szse",
            "s_sh000300": "csi300"
        }
        
        for line in lines:
            if '=' not in line: continue
            key = line.split('=')[0].split('hq_str_')[-1]
            if key in mapping:
                data_str = line.split('"')[1]
                parts = data_str.split(',')
                # Index Data: [Name, CurrentPrice, ChangeAmount, ChangePercent, Volume, Turnover]
                res[mapping[key]] = {
                    "名称": parts[0],
                    "最新价": round(float(parts[1]), 2),
                    "涨跌额": round(float(parts[2]), 2),
                    "涨跌幅": round(float(parts[3]), 2)
                }
        
        if len(res) == 3:
            return res
            
    except Exception as e:
        logger.error(f"Manual index fetch failed: {e}")
    
    # Fallback only if manual fetch fails
    return {
        "sse": {"名称": "上证指数", "最新价": 3450.2, "涨跌额": 10.5, "涨跌幅": 0.3},
        "szse": {"名称": "深证成指", "最新价": 11220.8, "涨跌额": -15.3, "涨跌幅": -0.12},
        "csi300": {"名称": "沪深300", "最新价": 4180.5, "涨跌额": 8.2, "涨跌幅": 0.2}
    }

@app.get("/api/market/rankings")
async def get_market_rankings():
    """直接从 Sina API 获取涨跌幅排行榜,避免 akshare 网络问题"""
    try:
        # 涨幅榜
        gainers_url = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=10&sort=changepercent&asc=0&node=hs_a&symbol=&_s_r_a=init"
        # 跌幅榜
        losers_url = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=10&sort=changepercent&asc=1&node=hs_a&symbol=&_s_r_a=init"
        
        headers = {"Referer": "http://finance.sina.com.cn"}
        
        gainers_resp = await asyncio.to_thread(requests.get, gainers_url, headers=headers, timeout=5)
        losers_resp = await asyncio.to_thread(requests.get, losers_url, headers=headers, timeout=5)
        
        import json
        gainers_data = json.loads(gainers_resp.text)
        losers_data = json.loads(losers_resp.text)
        
        # 转换为统一格式
        gainers = [{
            "代码": item["code"],
            "名称": item["name"],
            "最新价": float(item["trade"]),
            "涨跌幅": float(item["changepercent"])
        } for item in gainers_data[:10]]
        
        losers = [{
            "代码": item["code"],
            "名称": item["name"],
            "最新价": float(item["trade"]),
            "涨跌幅": float(item["changepercent"])
        } for item in losers_data[:10]]
        
        return {"gainers": gainers, "losers": losers}
        
    except Exception as e:
        logger.error(f"Rankings fetch error: {e}")
        return {"gainers": [], "losers": []}

@app.get("/api/stock/search")
async def search_stock(keyword: str, background_tasks: BackgroundTasks):
    stock_list = data_manager.get_stock_list_fast(background_tasks)
    if stock_list.empty: return []
    mask = stock_list['代码'].str.contains(keyword, na=False) | stock_list['名称'].str.contains(keyword, na=False)
    return stock_list[mask].head(10).to_dict(orient="records")

@app.get("/api/stock/quote/{symbol}")
async def get_stock_quote(symbol: str, background_tasks: BackgroundTasks):
    quote = data_manager.get_spot_data_fast(background_tasks)
    
    clean_symbol = "".join(filter(str.isdigit, symbol))
    # Basic market prefix logic for A-shares
    if symbol.startswith(('sh', 'sz', 'bj')):
        full_symbol = symbol
    else:
        if symbol.startswith('6'): full_symbol = "sh" + symbol
        elif symbol.startswith(('0', '3')): full_symbol = "sz" + symbol
        elif symbol.startswith(('4', '8', '9')): full_symbol = "bj" + symbol
        else: full_symbol = "sh" + symbol # Default fallback
    
    if not quote.empty:
        stock_data = quote[quote['代码'] == clean_symbol].to_dict(orient="records")
        if stock_data: return stock_data[0]
    
    # Backup: Manual fetch from Sina
    try:
        url = f"http://hq.sinajs.cn/list={full_symbol}"
        headers = {"Referer": "http://finance.sina.com.cn"}
        resp = await asyncio.to_thread(requests.get, url, headers=headers, timeout=5)
        if '=' in resp.text and '"' in resp.text:
            data_str = resp.text.split('"')[1]
            parts = data_str.split(',')
            if len(parts) >= 30:
                # Name, Open, Close, Price, High, Low
                return {
                    "代码": clean_symbol,
                    "名称": parts[0],
                    "最新价": round(float(parts[3]), 2),
                    "昨收": round(float(parts[2]), 2),
                    "最高": round(float(parts[4]), 2),
                    "最低": round(float(parts[5]), 2),
                    "成交量": round(float(parts[8]) / 100, 2), # to match unit
                    "成交额": round(float(parts[9]), 2),
                    "开盘": round(float(parts[1]), 2)
                }
    except Exception as e:
        logger.error(f"Manual quote fetch failed for {symbol}: {e}")

    if "600000" in symbol:
        return {"代码": "600000", "名称": "浦发银行", "最新价": 10.5, "昨收": 10.38}
    
    return {"名称": "加载中...", "最新价": 0, "昨收": 0}

@app.get("/api/stock/kline/{symbol}")
async def get_stock_kline(symbol: str):
    df = await get_cached_kline(symbol)
    if df is not None: return df.to_dict(orient="records")
    
    # Mock data fallback
    base = datetime.date.today()
    return [{"日期": (base - datetime.timedelta(days=(100-i))).strftime("%Y-%m-%d"), "开盘": 10.0 + i/20, "收盘": 10.3 + i/20, "最高": 10.6 + i/20, "最低": 9.8 + i/20, "成交量": 100000} for i in range(100)]

async def get_deepseek_analysis(prompt: str):
    # Try getting config from database first
    api_key = None
    model_id = "deepseek-chat"
    base_url = "https://api.deepseek.com"
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT config_key, config_value FROM system_config")
        configs = {row['config_key']: row['config_value'] for row in cursor.fetchall()}
        conn.close()
        
        api_key = configs.get("deepseek_api_key")
        model_id = configs.get("model_id", model_id)
        base_url = configs.get("base_url", base_url)
    except Exception as e:
        logger.error(f"Database config fetch error: {e}")

    # Fallback to environment variables if DB is empty
    if not api_key:
        api_key = os.getenv("DEEPSEEK_API_KEY")
    
    if not api_key: return None
    
    # Ensure URL is correctly formatted
    if not base_url.endswith("/"): base_url += "/"
    url = f"{base_url}v1/chat/completions" if "deepseek.com" not in base_url else f"{base_url}chat/completions"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "你是一名专业的A股人工智能投资顾问。你的分析必须基于数据，遵循‘讲人话、用逻辑代替情绪、条件触发建议、充分风险提示’的原则。请直接输出合法的JSON格式结果，不要包含Markdown代码块。"},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "stream": False
    }
    
    try:
        resp = await asyncio.to_thread(requests.post, url, json=payload, headers=headers, timeout=20)
        if resp.status_code == 200:
            content = resp.json()['choices'][0]['message']['content']
            import json
            if "```json" in content:
                content = content.split("```json")[-1].split("```")[0]
            return json.loads(content)
        else:
            logger.error(f"DeepSeek API Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.error(f"DeepSeek call error: {e}")
    return None

@app.get("/api/stock/analysis/{symbol}")
async def analyze_stock(symbol: str):
    df = await get_cached_kline(symbol)
    if df is None or len(df) < 30: 
        return {
            "advice": "数据样本不足", 
            "signal": "Neutral",
            "intensity": 0,
            "main_force": "暂无明显资金特征",
            "detail_advice": "当前样本不足以支持深度行为分析。建议继续观察更多交易日的价量表现。",
            "structured_analysis": {
                "conclusion": "样本不足，暂不具备参考价值。",
                "technical_status": "历史数据缺失。",
                "main_force": {"inference": "无法建立证据链。", "stage": "未知", "evidence": []},
                "trading_plan": {"buy": "观望", "sell": "观望", "position": "空仓"},
                "scenarios": {"optimistic": "无", "neutral": "无", "pessimistic": "无"}
            }
        }
    
    df = df.copy()
    # 基础指标计算
    df['ma5'] = df['收盘'].rolling(5).mean()
    df['ma10'] = df['收盘'].rolling(10).mean()
    df['ma20'] = df['收盘'].rolling(20).mean()
    df['vol_ma5'] = df['成交量'].rolling(5).mean()
    df['vol_ma20'] = df['成交量'].rolling(20).mean()
    
    # MACD
    df['ema12'] = df['收盘'].ewm(span=12, adjust=False).mean()
    df['ema26'] = df['收盘'].ewm(span=26, adjust=False).mean()
    df['diff'] = df['ema12'] - df['ema26']
    df['dea'] = df['diff'].ewm(span=9, adjust=False).mean()
    df['macd'] = 2 * (df['diff'] - df['dea'])
    
    last = df.iloc[-1]
    prev = df.iloc[-2]
    
    # 核心数据摘要
    price_change = (last['收盘'] - prev['收盘']) / prev['收盘']
    vol_ratio = last['成交量'] / last['vol_ma5'] if last['vol_ma5'] > 0 else 1
    
    # 构建 AI 提示词
    ai_prompt = f"""
    分析标的: {symbol}
    当前价格: {last['收盘']:.2f}
    涨跌幅: {price_change*100:.2f}%
    量比: {vol_ratio:.2f}
    技术参数:
    - MA5/10/20: {last['ma5']:.2f}/{last['ma10']:.2f}/{last['ma20']:.2f}
    - MACD(Diff/Dea): {last['diff']:.4f}/{last['dea']:.4f}
    - 成交量对比: 今日 {last['成交量']:.0f}, 5日均量 {last['vol_ma5']:.0f}
    
    请输出严格符合以下格式的JSON诊断报告：
    {{
        "conclusion": "方向+核心原因",
        "tech_status": "描述趋势、量能、强弱",
        "main_force": {{
            "inference": "资金介入概率推断(使用'概率'、'迹象'词汇)",
            "stage": "当前阶段(如吸筹、拉升、派发)",
            "evidence": ["证据1", "证据2", "证据3"]
        }},
        "trading_plan": {{
            "buy": "基于'如果...那么...'表达的进入点",
            "sell": "带条件的离场/止损点",
            "position": "仓位建议(风险导向)"
        }},
        "scenarios": {{
            "optimistic": "乐观路径",
            "neutral": "中性路径",
            "pessimistic": "悲观路径"
        }}
    }}
    """
    
    # 尝试 DeepSeek 分析
    ai_analysis = await get_deepseek_analysis(ai_prompt)
    if ai_analysis:
        return {
            "symbol": symbol,
            "advice": ai_analysis["conclusion"][:15] + "...",
            "signal": "Buy" if "多头" in ai_analysis["conclusion"] or "介入" in ai_analysis["main_force"]["inference"] else "Neutral",
            "intensity": 75 if ai_analysis["main_force"]["stage"] in ["拉升", "突破"] else 50,
            "main_force": f"AI 诊断: {ai_analysis['main_force']['stage']}",
            "detail_advice": "DeepSeek 智能诊断已生成",
            "structured_analysis": ai_analysis,
            "indicators": {
                "vol_ratio": round(vol_ratio, 2),
                "price_change": round(price_change * 100, 2)
            }
        }

    # ================= Fallback to Local Engine =================
    conclusion = ""
    if last['ma5'] > last['ma10'] > last['ma20'] and last['收盘'] > last['ma5']:
        conclusion = "趋势上行中，资金活跃度较高，处于多头格局。"
    elif last['ma5'] < last['ma10'] < last['ma20']:
        conclusion = "趋势持续走弱，资金流出压力较大，需注意结构性风险。"
    else:
        conclusion = "处于横盘震荡期，多空双方势力均衡，暂无明确方向。"

    trend_desc = "多头排列" if last['ma5'] > last['ma20'] else "空头受压"
    vol_desc = "放量活跃" if vol_ratio > 1.2 else "缩量低迷"
    tech_status = f"技术面目前呈现【{trend_desc}】状态，量能表现【{vol_desc}】。MACD指标显示{'动能增强' if last['macd'] > prev['macd'] else '动能减弱'}。"

    evidence_chain = []
    intensity = 50
    stage = "震荡蓄势"
    if price_change > 0.01 and vol_ratio > 1.3:
        evidence_chain.append("1. 价升量增，显示在关键点位有主动性买盘介入。")
        intensity += 20
    if last['收盘'] > last['ma20'] and prev['收盘'] <= prev['ma20']:
        evidence_chain.append("2. 股价有效站稳20日均线（生命线），呈现技术修复特征。")
        intensity += 10
    if last['成交量'] > df['成交量'].tail(10).mean():
        evidence_chain.append("3. 成交量较此前10个交易日均值放大，资金参与热度回升。")
        intensity += 5
    
    if len(evidence_chain) >= 2:
        main_force_inf = "主力资金介入概率较高（证据链已形成）。"
        stage = "分歧上行"
    else:
        main_force_inf = "主力资金活跃迹象尚不显著，属于散户情绪或存量博弈为主。"
        intensity = 45

    buy_trigger = f"如果股价放量突破上方压力位并在 {last['ma5']:.2f} 附近站稳2个交易日以上，那么趋势转强概率增加，可考虑【轻仓】配置。"
    sell_trigger = f"如果股价跌破关键支撑位 {last['ma20']:.2f}，且MACD出现死叉，那么形态走坏概率增加，建议【果断减仓/离场】。"

    local_analysis = {
        "conclusion": conclusion,
        "tech_status": tech_status,
        "main_force": {
            "inference": main_force_inf,
            "stage": stage,
            "evidence": evidence_chain if evidence_chain else ["尚未形成显著证据链"]
        },
        "trading_plan": {
            "buy": buy_trigger,
            "sell": sell_trigger,
            "position": "建议维持轻仓（3-5成左右），视突破情况分段加减。"
        },
        "scenarios": {
            "optimistic": "量能持续温和放大，回踩不破MA10，目标挑战前高区间。",
            "neutral": "在MA20与MA5之间反复拉锯，进入时间换空间的整理阶段。",
            "pessimistic": "放量跌穿支撑位，均线系统转为发散下行，寻找下一个底部支撑。"
        }
    }

    return {
        "symbol": symbol,
        "advice": conclusion[:15] + "...", 
        "signal": "Buy" if intensity > 65 else ("Sell" if intensity < 35 else "Neutral"),
        "intensity": intensity,
        "main_force": f"本地诊断: {stage}",
        "detail_advice": "本地诊断结论已生成", 
        "structured_analysis": local_analysis,
        "indicators": {
            "vol_ratio": round(vol_ratio, 2),
            "price_change": round(price_change * 100, 2)
        }
    }


# ==================== 管理员和用户管理 API ====================

@app.post("/api/admin/login")
async def admin_login(credentials: AdminLogin):
    """管理员登录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    hashed_password = hash_password(credentials.password)
    cursor.execute(
        "SELECT * FROM admin WHERE username = ? AND password = ?",
        (credentials.username, hashed_password)
    )
    admin = cursor.fetchone()
    conn.close()
    
    if admin:
        return {"success": True, "message": "登录成功"}
    else:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

@app.post("/api/admin/password-reset")
async def password_reset(data: PasswordReset):
    """管理员密码找回"""
    if data.answer.strip() == "赵双江":
        return {"success": True, "password": "Xinsiwei2026@"}
    else:
        raise HTTPException(status_code=400, detail="答案错误")

@app.post("/api/admin/change-password")
async def change_password(data: PasswordChange):
    """管理员修改密码"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 验证旧密码
    old_hash = hash_password(data.old_password)
    cursor.execute("SELECT * FROM admin WHERE password = ?", (old_hash,))
    admin = cursor.fetchone()
    
    if not admin:
        conn.close()
        raise HTTPException(status_code=400, detail="旧密码错误")
    
    # 更新密码
    new_hash = hash_password(data.new_password)
    cursor.execute("UPDATE admin SET password = ? WHERE id = ?", (new_hash, admin['id']))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "密码修改成功"}

@app.get("/api/admin/users")
async def get_users():
    """获取所有用户列表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, is_active, created_at, expires_at FROM users ORDER BY created_at DESC")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users

@app.post("/api/admin/users")
async def create_user(user: UserCreate):
    """创建新用户"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 设置过期时间为一年后
    expires_at = (datetime.datetime.now() + datetime.timedelta(days=365)).isoformat()
    hashed_password = hash_password(user.password)
    
    try:
        cursor.execute(
            "INSERT INTO users (username, password, expires_at) VALUES (?, ?, ?)",
            (user.username, hashed_password, expires_at)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return {"success": True, "id": user_id, "message": "用户创建成功"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"用户名已存在或创建失败: {str(e)}")

@app.put("/api/admin/users/{user_id}")
async def update_user(user_id: int, update: UserUpdate):
    """更新用户信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if update.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if update.is_active else 0)
    
    if update.password is not None:
        updates.append("password = ?")
        params.append(hash_password(update.password))
    
    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="没有要更新的字段")
    
    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "用户更新成功"}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int):
    """删除用户"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "用户删除成功"}

@app.get("/api/admin/config")
async def get_system_config():
    """获取系统配置"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT config_key, config_value FROM system_config")
    config = {row['config_key']: row['config_value'] for row in cursor.fetchall()}
    conn.close()
    return config

@app.put("/api/admin/config")
async def update_system_config(config: SystemConfigUpdate):
    """更新系统配置"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if config.api_key is not None:
        cursor.execute(
            "UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = 'deepseek_api_key'",
            (config.api_key,)
        )
        os.environ["DEEPSEEK_API_KEY"] = config.api_key
    
    if config.model_id is not None:
        cursor.execute(
            "UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = 'model_id'",
            (config.model_id,)
        )
    
    if config.base_url is not None:
        cursor.execute(
            "UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = 'base_url'",
            (config.base_url,)
        )
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "配置更新成功"}

@app.post("/api/user/login")
async def user_login(credentials: AdminLogin):
    """用户登录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    hashed_password = hash_password(credentials.password)
    cursor.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        (credentials.username, hashed_password)
    )
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="请联系开发者赵双江重置密码,联系电话:158-5426-9366")
    
    # 检查账号是否被禁用
    if not user['is_active']:
        raise HTTPException(status_code=403, detail="账号已被禁用,请联系管理员")
    
    # 检查是否过期
    expires_at = datetime.datetime.fromisoformat(user['expires_at'])
    if datetime.datetime.now() > expires_at:
        raise HTTPException(status_code=403, detail="您的VIP会员已到期,请联系开发者续费,联系电话:158-5426-9366")
    
    return {
        "success": True,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "expires_at": user['expires_at']
        }
    }

# ==================== 用户自选管理 API ====================

class WatchlistItem(BaseModel):
    user_id: int
    stock_code: str

@app.get("/api/user/watchlist/{user_id}")
async def get_user_watchlist(user_id: int):
    """获取指定用户的自选股代码列表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT stock_code FROM watchlist WHERE user_id = ?", (user_id,))
    codes = [row['stock_code'] for row in cursor.fetchall()]
    conn.close()
    return codes

@app.post("/api/user/watchlist/add")
async def add_to_watchlist(item: WatchlistItem):
    """将股票添加到用户自选"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO watchlist (user_id, stock_code) VALUES (?, ?)",
            (item.user_id, item.stock_code)
        )
        conn.commit()
        return {"success": True, "message": "已添加至自选"}
    except sqlite3.IntegrityError:
        return {"success": True, "message": "已在自选列表中"}
    finally:
        conn.close()

@app.post("/api/user/watchlist/remove")
async def remove_from_watchlist(item: WatchlistItem):
    """从自选列表中移除股票"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM watchlist WHERE user_id = ? AND stock_code = ?",
        (item.user_id, item.stock_code)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "已从自选移除"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
