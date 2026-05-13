import "./globals.css";

export const metadata = {
  title: "Cluso Employee CRM Portal",
  description: "Employee CRM Portal with Lead Management, Task Tracking, and Team Performance Analytics",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
