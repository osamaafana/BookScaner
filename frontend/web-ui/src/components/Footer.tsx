import { Link } from 'react-router-dom'
import { Github, Mail, Phone, Instagram, Linkedin } from 'lucide-react'

const socialLinks = [
  { href: 'https://github.com/osamaafana/BookScaner', label: 'Source code on GitHub', icon: Github },
  { href: 'https://www.instagram.com/o._sl/', label: 'Instagram', icon: Instagram },
  { href: 'https://www.linkedin.com/in/osama-afana/', label: 'LinkedIn', icon: Linkedin },
  { href: 'mailto:osamaafana4@gmail.com', label: 'Email', icon: Mail }
]

const footerLinks = [
  { to: '/', label: 'Scan' },
  { to: '/recommendations', label: 'For you' },
  { to: '/reading-list', label: 'Library' },
  { to: '/history', label: 'History' }
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-12 md:mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">BookScanner</p>
            <p className="text-sm text-muted-foreground max-w-[42ch]">
              Photograph a shelf, see every book on it, and find the ones worth reading.
            </p>
          </div>

          <nav aria-label="Footer" className="hidden md:block">
            <ul className="space-y-2 text-sm">
              {footerLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="not-italic space-y-2 text-sm">
            <p className="font-medium text-foreground">
              Osama Afana <span className="font-normal text-muted-foreground">· Data Scientist</span>
            </p>
            <a href="mailto:osamaafana4@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-foreground break-all">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              osamaafana4@gmail.com
            </a>
            <a href="tel:+962781612941" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              +962 781 612 941
            </a>
            <a href="tel:+905551890757" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              +90 555 189 0757
            </a>
          </address>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">© {currentYear} BookScanner</p>
          <ul className="flex items-center gap-1">
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={label}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
