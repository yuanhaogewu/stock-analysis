"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function StockSearch() {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const router = useRouter();
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (keyword.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:8000/api/stock/search?keyword=${keyword}`);
                const data = await res.json();
                setResults(data);
                setShow(true);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShow(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="search-container" ref={wrapperRef}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="搜索股票代码/名称"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onFocus={() => {
                        if (keyword.length >= 2) setShow(true);
                    }}
                />
                {loading && (
                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                        <div className="spinner-small"></div>
                    </div>
                )}
            </div>
            {show && keyword.length >= 2 && (
                <div className="search-results">
                    {results.length > 0 ? (
                        results.map((item) => (
                            <div
                                key={item.代码}
                                className="search-item"
                                onClick={() => {
                                    router.push(`/stock/${item.代码}`);
                                    setShow(false);
                                    setKeyword('');
                                }}
                            >
                                <span>{item.名称}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{item.代码}</span>
                            </div>
                        ))
                    ) : !loading ? (
                        <div className="search-item" style={{ color: 'var(--text-secondary)', cursor: 'default' }}>
                            未找到相关股票
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
