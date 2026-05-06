import './globals.css'

export const metadata = {
  title: 'Nepasub',
  description: 'Community-powered NEPA tracker'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}