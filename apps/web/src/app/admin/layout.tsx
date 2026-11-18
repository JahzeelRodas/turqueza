import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Panel de administración',
    template: '%s · Admin',
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-100 font-sans">{children}</div>;
}
