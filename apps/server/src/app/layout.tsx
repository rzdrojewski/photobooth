export const metadata = { title: 'Photobooth' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 20 }}>{children}</body>
    </html>
  );
}

