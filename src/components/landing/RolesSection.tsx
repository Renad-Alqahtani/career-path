import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Briefcase, ArrowRight } from 'lucide-react';

const roles = [
  {
    icon: GraduationCap,
    title: 'For Students',
    description: 'Get personalized career recommendations, track your skill development, and connect with mentors to guide your professional journey.',
    features: [
      'AI-powered career matching',
      'Skill gap analysis',
      'Mentor connections',
      'Academic transcript integration',
    ],
    cta: 'Start as Student',
    href: '/auth?mode=register&role=student',
    gradient: 'from-primary to-accent',
  },
  {
    icon: BookOpen,
    title: 'For Academic Advisors',
    description: 'Access comprehensive student profiles, view AI recommendations, and generate detailed counseling reports to support student success.',
    features: [
      'Student profile access',
      'Recommendation insights',
      'Counseling reports',
      'Progress tracking',
    ],
    cta: 'Join as Advisor',
    href: '/auth?mode=register&role=advisor',
    gradient: 'from-accent to-chart-3',
  },
  {
    icon: Briefcase,
    title: 'For Mentors',
    description: 'Share your expertise with the next generation. Manage your professional profile and guide students towards successful careers.',
    features: [
      'Professional profile',
      'Mentorship management',
      'Student matching',
      'Flexible availability',
    ],
    cta: 'Become a Mentor',
    href: '/auth?mode=register&role=mentor',
    gradient: 'from-chart-3 to-chart-4',
  },
];

export function RolesSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Designed for
            <span className="text-gradient"> Everyone</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you're a student exploring careers, an advisor guiding success, or a mentor sharing wisdom — we've got you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {roles.map((role, index) => (
            <Card 
              key={role.title} 
              variant="elevated"
              className="relative overflow-hidden animate-fade-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.gradient}`} />
              <CardHeader className="pb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary mb-4">
                  <role.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">{role.title}</CardTitle>
                <CardDescription className="text-base">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20">
                        <div className="h-2 w-2 rounded-full bg-accent" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="gradient" className="w-full" asChild>
                  <Link to={role.href}>
                    {role.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
