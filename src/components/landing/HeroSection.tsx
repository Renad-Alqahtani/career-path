import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Target, Users } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-Powered Career Guidance</span>
          </div>

          <h1
            className="animate-fade-up font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '0.1s' }}
          >
            Discover Your
            <span className="text-gradient"> Perfect Career </span>
            Path
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            style={{ animationDelay: '0.2s' }}
          >
            Get personalized career recommendations based on your skills, academic background, and market trends.
            Connect with mentors and advisors to guide your journey.
          </p>

          <div
            className="animate-fade-up mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animationDelay: '0.3s' }}
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/auth">
                Sign In
              </Link>
            </Button>
          </div>

          <div
            className="animate-fade-up mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold font-display">500+</div>
              <div className="text-sm text-muted-foreground">Career Paths</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-3">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div className="text-3xl font-bold font-display">10K+</div>
              <div className="text-sm text-muted-foreground">Students Guided</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-3/10 mb-3">
                <Sparkles className="h-6 w-6 text-chart-3" />
              </div>
              <div className="text-3xl font-bold font-display">95%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}