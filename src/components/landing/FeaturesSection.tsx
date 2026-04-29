import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, LineChart, MessageSquare, FileText, Users, Compass } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Recommendations',
    description: 'Get career suggestions based on skill taxonomy and real-time labor market data.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: LineChart,
    title: 'Skill Gap Analysis',
    description: 'Identify missing skills and get personalized learning paths to achieve your goals.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: Users,
    title: 'Mentor Connections',
    description: 'Connect with industry professionals who can guide your career development.',
    color: 'text-chart-3',
    bg: 'bg-chart-3/10',
  },
  {
    icon: MessageSquare,
    title: 'Academic Advising',
    description: 'Work with academic advisors who understand your curriculum and career aspirations.',
    color: 'text-chart-4',
    bg: 'bg-chart-4/10',
  },
  {
    icon: FileText,
    title: 'Transcript Analysis',
    description: 'Upload your academic transcript to enhance recommendation accuracy.',
    color: 'text-chart-5',
    bg: 'bg-chart-5/10',
  },
  {
    icon: Compass,
    title: 'Career Exploration',
    description: 'Explore different career paths with detailed insights on requirements and outlook.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to
            <span className="text-gradient"> Succeed</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Our comprehensive platform combines AI technology with human expertise to guide your career journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              variant="interactive"
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
