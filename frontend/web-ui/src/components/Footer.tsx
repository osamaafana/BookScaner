import { Link } from 'react-router-dom'
import { Github, Mail, BookOpen, Brain, Instagram, Linkedin } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-16 md:mt-24 border-t border-primary/20 bg-gradient-to-br from-card/50 via-background to-primary/5 backdrop-blur-sm">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-primary/5 to-blue-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 md:py-16 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-primary flex items-center justify-center shadow-lg border border-primary/30">
                <Brain className="h-5 w-5 md:h-6 md:w-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  BookScanner AI
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Transform Your Library with AI Intelligence
                </p>
              </div>
            </div>

            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-md">
              Advanced computer vision technology that automatically identifies, and enriches your book collection
              with intelligent metadata extraction and personalized recommendations.
            </p>


          </div>

          {/* Quick Links - Hidden on Mobile */}
          <div className="hidden md:block space-y-6">
            <h4 className="text-lg font-semibold text-foreground">Quick Links</h4>
            <nav className="space-y-3">
              <Link
                to="/"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  Home
                </span>
              </Link>
              <Link
                to="/history"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  Scan History
                </span>
              </Link>
              <Link
                to="/reading-list"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  My Library
                </span>
              </Link>
              <Link
                to="/recommendations"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  Recommendations
                </span>
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4 md:space-y-6">
            <h4 className="text-base md:text-lg font-semibold text-foreground">Contact</h4>
            <div className="space-y-3 md:space-y-4">
              <div className="space-y-2 md:space-y-3">
                <div className="text-sm md:text-base font-medium text-foreground">Osama Afana</div>
                <div className="text-xs md:text-sm text-muted-foreground">Data Scientist</div>

                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 md:h-4 md:w-4 mt-0.5 flex-shrink-0" />
                    <span className="break-all">Work: o.afana@xocialive.com</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 md:h-4 md:w-4 mt-0.5 flex-shrink-0" />
                    <span className="break-all">Personal: osamaafana4@gmail.com</span>
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <span className="font-medium text-sm">📞</span>
                    <span>+962 781 612 941</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <span className="font-medium text-sm">📞</span>
                    <span>+90 555 189 0757</span>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-primary/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-2 md:gap-4">
              <a
                href="https://github.com/osamaafana/BookScaner"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 md:p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-200 group touch-manipulation"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4 md:h-5 md:w-5 text-primary group-hover:scale-110 transition-transform duration-200" />
              </a>
              <a
                href="https://www.instagram.com/o._sl/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 md:p-2 rounded-lg bg-pink-400/10 hover:bg-pink-400/20 transition-colors duration-200 group touch-manipulation"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4 md:h-5 md:w-5 text-pink-400 group-hover:scale-110 transition-transform duration-200" />
              </a>
              <a
                href="https://www.linkedin.com/in/osama-afana/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 md:p-2 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 transition-colors duration-200 group touch-manipulation"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4 md:h-5 md:w-5 text-blue-400 group-hover:scale-110 transition-transform duration-200" />
              </a>
              <a
                href="mailto:osamaafana4@gmail.com"
                className="p-1.5 md:p-2 rounded-lg bg-purple-400/10 hover:bg-purple-400/20 transition-colors duration-200 group touch-manipulation"
                aria-label="Email"
              >
                <Mail className="h-4 w-4 md:h-5 md:w-5 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground text-center">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
              <span>© {currentYear} BookScanner AI. All rights reserved.</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="mt-6 md:mt-8 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      </div>
    </footer>
  )
}
