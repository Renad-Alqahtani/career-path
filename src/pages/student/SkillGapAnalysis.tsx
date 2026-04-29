import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

type SavedRecommendation = {
  id: string
  match_score: number
  matched_skills: string[]
  missing_skills: string[]
  occupations: {
    id: string
    title: string
    description: string | null
    industry: string | null
    outlook: string | null
  } | null
}

type SkillGapItem = {
  skill: string
  category: string
  currentLevel: number
  requiredLevel: number
  priority: 'high' | 'medium' | 'low'
  resources: { title: string; provider: string; type: string; url: string }[]
}

type SkillGapState = {
  occupationId?: string
  occupationTitle?: string
  occupationDescription?: string
  matchedSkills?: string[]
  missingSkills?: string[]
  matchScore?: number
}

const priorityConfig = {
  high: { label: 'High Priority', variant: 'destructive' as const, color: 'text-destructive' },
  medium: { label: 'Medium', variant: 'warning' as const, color: 'text-chart-4' },
  low: { label: 'Low', variant: 'secondary' as const, color: 'text-muted-foreground' },
}

const resourcesBySkill: Record<string, { title: string; provider: string; type: string; url: string }[]> = {
  Python: [
    { title: 'Python for Everybody', provider: 'Coursera', type: 'Course', url: 'https://www.coursera.org/specializations/python' },
  ],
  SQL: [
    { title: 'SQL for Data Science', provider: 'Coursera', type: 'Course', url: 'https://www.coursera.org/learn/sql-for-data-science' },
  ],
  'Machine Learning': [
    { title: 'Machine Learning Specialization', provider: 'Coursera', type: 'Course', url: 'https://www.coursera.org/specializations/machine-learning-introduction' },
  ],
  Cybersecurity: [
    { title: 'Google Cybersecurity Certificate', provider: 'Coursera', type: 'Certificate', url: 'https://www.coursera.org/professional-certificates/google-cybersecurity' },
  ],
  Communication: [
    { title: 'Improve Your Communication Skills', provider: 'LinkedIn Learning', type: 'Course', url: 'https://www.linkedin.com/learning/' },
  ],
}

function getResources(skill: string) {
  return resourcesBySkill[skill] || [
    {
      title: `Learn ${skill}`,
      provider: 'Coursera',
      type: 'Course',
      url: 'https://www.coursera.org/search?query=' + encodeURIComponent(skill),
    },
  ]
}

function getPriority(index: number): 'high' | 'medium' | 'low' {
  if (index < 2) return 'high'
  if (index < 5) return 'medium'
  return 'low'
}

export default function SkillGapAnalysis() {
  const { user } = useAuth()
  const location = useLocation()
  const selectedFromRecommendations = location.state as SkillGapState | null

  const [recommendations, setRecommendations] = useState<SavedRecommendation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [user?.id])

  const loadRecommendations = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data, error } = await (supabase as any)
      .from('recommendations')
      .select(`
        id,
        match_score,
        matched_skills,
        missing_skills,
        occupations (
          id,
          title,
          description,
          industry,
          outlook
        )
      `)
      .eq('user_id', user.id)
      .order('match_score', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const rows = data || []
    setRecommendations(rows)

    if (rows.length > 0) {
      const matchedFromState = selectedFromRecommendations?.occupationId
        ? rows.find((item: SavedRecommendation) => item.occupations?.id === selectedFromRecommendations.occupationId)
        : null

      setSelectedId(matchedFromState?.id || rows[0].id)
    }

    setLoading(false)
  }

  const selectedRecommendation = useMemo(() => {
    return recommendations.find((item) => item.id === selectedId) || null
  }, [recommendations, selectedId])

  const skillGaps: SkillGapItem[] = useMemo(() => {
    if (!selectedRecommendation) return []

    const missingSkills = selectedRecommendation.missing_skills || []

    return missingSkills.map((skill, index) => {
      const priority = getPriority(index)

      return {
        skill,
        category: 'Required Skill',
        currentLevel: priority === 'high' ? 20 : priority === 'medium' ? 35 : 50,
        requiredLevel: priority === 'high' ? 85 : priority === 'medium' ? 75 : 65,
        priority,
        resources: getResources(skill),
      }
    })
  }, [selectedRecommendation])

  const overallReadiness = selectedRecommendation?.match_score || 0
  const criticalGaps = skillGaps.filter((gap) => gap.priority === 'high').length
  const resourcesCount = skillGaps.reduce((total, gap) => total + gap.resources.length, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <div className="flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/student/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <Card className="mx-auto max-w-2xl">
            <CardContent className="p-8 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-2xl font-bold">No saved recommendations yet</h2>
              <p className="mb-6 text-muted-foreground">
                Generate and save career recommendations first, then skill gaps will appear here.
              </p>
              <Button asChild>
                <Link to="/student/recommendations">Go to Recommendations</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/student/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BarChart3 className="h-8 w-8 text-primary" />
              Skill Gap Analysis
            </h1>
            <p className="mt-1 text-muted-foreground">
              Based on your saved recommendation results.
            </p>
          </div>

          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Select career" />
            </SelectTrigger>
            <SelectContent>
              {recommendations.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.occupations?.title || 'Unknown Career'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallReadiness}%</p>
                  <p className="text-sm text-muted-foreground">Overall Readiness</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{criticalGaps}</p>
                  <p className="text-sm text-muted-foreground">Critical Gaps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resourcesCount}</p>
                  <p className="text-sm text-muted-foreground">Resources Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedRecommendation?.occupations?.title || 'Selected Career'} Readiness
            </CardTitle>
            <CardDescription>
              Your current match score for this career.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{overallReadiness}%</span>
              </div>
              <Progress value={overallReadiness} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {skillGaps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold">No major gaps found</h3>
              <p className="text-muted-foreground">
                Your saved recommendation does not include missing skills.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {skillGaps.map((item) => {
              const gap = item.requiredLevel - item.currentLevel

              return (
                <Card key={item.skill}>
                  <CardContent className="pt-6">
                    <div
                      className="flex cursor-pointer items-center justify-between"
                      onClick={() => setExpandedSkill(expandedSkill === item.skill ? null : item.skill)}
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{item.skill}</h3>
                            <Badge variant={priorityConfig[item.priority].variant}>
                              {priorityConfig[item.priority].label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                          <p className="text-sm font-medium">
                            Gap: <span className={priorityConfig[item.priority].color}>{gap}%</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.currentLevel}% → {item.requiredLevel}%
                          </p>
                        </div>

                        {expandedSkill === item.skill ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: {item.currentLevel}%</span>
                        <span>Required: {item.requiredLevel}%</span>
                      </div>
                      <div className="relative">
                        <Progress value={item.requiredLevel} className="h-2 opacity-30" />
                        <Progress value={item.currentLevel} className="absolute left-0 top-0 h-2 w-full" />
                      </div>
                    </div>

                    {expandedSkill === item.skill && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <h4 className="flex items-center gap-1 text-sm font-medium">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Recommended Resources
                        </h4>

                        {item.resources.map((resource) => (
                          <div key={resource.title} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                            <div>
                              <p className="text-sm font-medium">{resource.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {resource.provider} · {resource.type}
                              </p>
                            </div>

                            <Button variant="ghost" size="sm" asChild>
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}