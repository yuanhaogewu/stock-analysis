import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
    title: "A股专业股票分析工具",
    description: "多维度、系统性专业股票分析",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN">
            <body>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
