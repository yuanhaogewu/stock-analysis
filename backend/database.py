import sqlite3
import hashlib
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'stock_system.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """初始化数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建套餐表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            duration_days INTEGER NOT NULL,
            price REAL NOT NULL,
            is_active INTEGER DEFAULT 1,
            description TEXT
        )
    ''')

    # 创建邀请码表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            duration_days INTEGER DEFAULT 30,
            is_used INTEGER DEFAULT 0,
            used_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP,
            FOREIGN KEY (used_by) REFERENCES users (id)
        )
    ''')

    # 创建支付日志表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payment_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_id INTEGER NOT NULL,
            trade_no TEXT UNIQUE,
            out_trade_no TEXT UNIQUE NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
        )
    ''')

    # 创建请求频次统计表 (用于每小时20次限制)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS request_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action_type TEXT NOT NULL, -- e.g., 'analysis'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 插入默认管理员账号
    default_password = hashlib.sha256("Xinsiwei2026@".encode()).hexdigest()
    try:
        cursor.execute(
            "INSERT INTO admin (username, password) VALUES (?, ?)",
            ("xinsiwei", default_password)
        )
    except sqlite3.IntegrityError:
        pass  # 管理员已存在

    # 插入初始套餐 (季度/年度)
    initial_plans = [
        ("季度会员", 90, 299.0, "VIP全量功能使用权（90天）"),
        ("年度会员", 365, 999.0, "VIP全量功能使用权（365天）")
    ]
    for name, days, price, desc in initial_plans:
        try:
            cursor.execute(
                "INSERT INTO subscription_plans (name, duration_days, price, description) VALUES (?, ?, ?, ?)",
                (name, days, price, desc)
            )
        except sqlite3.IntegrityError:
            pass
    
    # 插入默认系统配置
    default_configs = [
        ("deepseek_api_key", os.getenv("DEEPSEEK_API_KEY", "")),
        ("model_id", "deepseek-chat"),
        ("base_url", "https://api.deepseek.com"),
        ("alipay_app_id", ""),  # 后续管理员在后台配置
        ("alipay_private_key", ""),
        ("alipay_public_key", "")
    ]
    
    for key, value in default_configs:
        try:
            cursor.execute(
                "INSERT INTO system_config (config_key, config_value) VALUES (?, ?)",
                (key, value)
            )
        except sqlite3.IntegrityError:
            pass
    
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

# 初始化数据库
init_database()
