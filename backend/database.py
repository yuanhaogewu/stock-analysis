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
    
    # 创建用户表
    # 迁移：检查并添加缺失的列
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN referral_code TEXT")
    except sqlite3.OperationalError:
        pass # 列已存在
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN invited_by INTEGER")
    except sqlite3.OperationalError:
        pass # 列已存在
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
    except sqlite3.OperationalError:
        pass # 列已存在

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT UNIQUE,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            referral_code TEXT UNIQUE,
            invited_by INTEGER,
            avatar TEXT,
            FOREIGN KEY (invited_by) REFERENCES users (id)
        )
    ''')
    
    # 创建管理员表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            security_question TEXT DEFAULT '您的出生地是哪里？',
            security_answer TEXT DEFAULT '上海'
        )
    ''')

    # 创建系统配置表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_config (
            config_key TEXT PRIMARY KEY,
            config_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 创建自选股表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            stock_code TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, stock_code)
        )
    ''')
    
    # 创建套餐表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            duration_days INTEGER NOT NULL,
            price REAL NOT NULL,
            is_active INTEGER DEFAULT 1,
            description TEXT,
            sort_order INTEGER DEFAULT 0
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
    
    # 插入默认系统配置
    default_configs = [
        ("deepseek_api_key", os.getenv("DEEPSEEK_API_KEY", "")),
        ("model_id", "deepseek-chat"),
        ("base_url", "https://api.deepseek.com"),
        ("alipay_app_id", ""),  # 后续管理员在后台配置
        ("alipay_private_key", ""),
        ("alipay_public_key", ""),
        ("platform_name", "芯思维股票分析"),
        ("platform_name_en", "Xinsiwei Stock Analysis"),
        ("platform_slogan", "多维度股票AI分析系统"),
        ("platform_logo", ""),
        ("dev_name", "芯思维开发团队"),
        ("dev_phone", ""),
        ("dev_email", ""),
        ("dev_wechat_qr", ""),
        ("announcement_content", "# 平台公告\n欢迎使用智弈股票AI分析系统。\n\n我们将竭诚为您提供最专业的深度诊断服务。"),
        ("rate_limit_rules", "VIP会员每小时限20次AI分析"),
        ("rate_limit_msg", "您已达到每小时 {limit} 次分析的限制。请于 {resume_at} 后继续。"),
        ("alert_msg_auth_required", "智能诊断是 VIP 会员专属权益，请先登录账户。"),
        ("alert_msg_vip_expired", "您的智能分析权益已消耗或已到期，请前往‘会员中心’续费开通。"),
        ("rate_limit_count", "20"),
        ("rate_limit_period", "1"),
        ("platform_industry_tags", "科技,芯片,半导体,人工智能,金融")
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
