import { Link } from 'react-router-dom'
import { Github, Twitter, Mail, BookOpen, Brain, Sparkles } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-24 border-t border-primary/20 bg-gradient-to-br from-card/50 via-background to-primary/5 backdrop-blur-sm">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-primary/5 to-blue-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-16 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-primary flex items-center justify-center shadow-lg border border-primary/30">
                <Brain className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  BookScanner AI
                </h3>
                <p className="text-sm text-muted-foreground">
                  Transform Your Library with AI Intelligence
                </p>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed max-w-md">
              Advanced computer vision technology that automatically identifies, catalogs, and enriches your book collection
              with intelligent metadata extraction and personalized recommendations.
            </p>

            {/* Tech badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-primary">Neural Networks</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-400/10 rounded-full border border-blue-400/20">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                <span className="text-sm font-medium text-blue-400">Computer Vision</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-400/10 rounded-full border border-purple-400/20">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-700"></div>
                <span className="text-sm font-medium text-purple-400">Deep Learning</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
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

          {/* Support & Settings */}
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-foreground">Support</h4>
            <nav className="space-y-3">
              <Link
                to="/settings"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  Settings
                </span>
              </Link>
              <Link
                to="/preferences"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  Preferences
                </span>
              </Link>
              <a
                href="mailto:support@bookscanner.ai"
                className="block text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">
                  Contact Support
                </span>
              </a>
              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>AI-Powered Support Available</span>
                </div>
              </div>
            </nav>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-12 pt-8 border-t border-primary/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/bookscanner"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-200 group"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-200" />
              </a>
              <a
                href="https://twitter.com/bookscanner"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 transition-colors duration-200 group"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform duration-200" />
              </a>
              <a
                href="mailto:hello@bookscanner.ai"
                className="p-2 rounded-lg bg-purple-400/10 hover:bg-purple-400/20 transition-colors duration-200 group"
                aria-label="Email"
              >
                <Mail className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
              </a>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>© {currentYear} BookScanner AI. All rights reserved.</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      </div>
    </footer>
  )
}
