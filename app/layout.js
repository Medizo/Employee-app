import "./globals.css";

export const metadata = {
  title: "NexusFlow — Employee Portal",
  description: "Employee CRM Portal with Lead Management, Task Tracking, and Team Performance Analytics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
