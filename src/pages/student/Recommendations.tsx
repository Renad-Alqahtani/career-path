import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  Sparkles,
  Target,
  Filter,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

type Occupation = {
  id: string
  title: string
  description: string
  industry: string | null
  outlook: string | null
}

type Recommendation = {
  occupation: Occupation
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export default function Recommendations() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [selectedCareer, setSelectedCareer] = useState<Recommendation | null>(null)
  const [studentProfile, setStudentProfile] = useState<any>(null)

  useEffect(() => {
    loadRecommendations()
  }, [user?.id])

  const loadRecommendations = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data: profileData, error: profileError } = await (supabase as any)
      .from('student_academic_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profileData) {
      setLoading(false)
      toast.error('Please complete your transcript first')
      return
    }

    if (!profileData.ai_consent) {
      setLoading(false)
      toast.error('Enable AI consent in Transcript page first')
      return
    }

    setStudentProfile(profileData)

    const { data: occupations, error: occError } = await (supabase as any)
      .from('occupations')
      .select('*')

    if (occError) {
      setLoading(false)
      toast.error(occError.message)
      return
    }

    const { data: occupationSkills, error: osError } = await (supabase as any)
      .from('occupation_skills')
      .select(`
        occupation_id,
        skill_id,
        skills(id,name)
      `)

    if (osError) {
      setLoading(false)
      toast.error(osError.message)
      return
    }

    let studentText = normalize(
      `${profileData.major || ''} ${profileData.completed_courses || ''} ${profileData.self_reported_skills || ''}`
    )

    const expandedSkills: Record<string, string[]> = {
      python: ['programming', 'data analysis'],
      java: ['programming', 'software engineering'],
      javascript: ['programming', 'web development'],
      sql: ['database systems', 'data analysis'],
      database: ['database systems', 'sql'],
      ai: ['machine learning', 'data analysis'],
      'artificial intelligence': ['machine learning', 'data analysis'],
      cybersecurity: ['information security', 'systems evaluation'],
      network: ['systems analysis', 'information security'],
      communication: ['speaking', 'active listening'],
      math: ['mathematics'],
      statistics: ['mathematics', 'data analysis'],
      'problem solving': ['complex problem solving', 'critical thinking'],
      programming: ['programming'],
    }

    Object.entries(expandedSkills).forEach(([key, values]) => {
      if (studentText.includes(key)) {
        studentText += ' ' + values.join(' ')
      }
    })

    const results: Recommendation[] = (occupations || []).map((occupation: Occupation) => {
      const related = (occupationSkills || []).filter(
        (row: any) => row.occupation_id === occupation.id
      )

      const requiredSkills = related
        .map((row: any) => row.skills?.name)
        .filter(Boolean)

      const matchedSkills = requiredSkills.filter((skill: string) =>
        studentText.includes(normalize(skill))
      )

      const missingSkills = requiredSkills.filter(
        (skill: string) => !studentText.includes(normalize(skill))
      )

      const matchScore =
        requiredSkills.length > 0
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : 0

      return {
        occupation,
        matchScore,
        matchedSkills,
        missingSkills,
      }
    })

    const sorted = results
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)

    setRecommendations(sorted)
    setSelectedCareer(sorted[0] || null)
    setLoading(false)
  }

  const saveResults = async () => {
    if (!user?.id || recommendations.length === 0) return

    setSaving(true)

    const rows = recommendations.map((item) => ({
      user_id: user.id,
      occupation_id: item.occupation.id,
      match_score: item.matchScore,
      matched_skills: item.matchedSkills,
      missing_skills: item.missingSkills,
    }))

    const { error } = await (supabase as any)
      .from('recommendations')
      .upsert(rows, { onConflict: 'user_id,occupation_id' })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Results saved successfully')
  }

  const openSkillGap = () => {
    if (!selectedCareer) return

    navigate('/student/skill-gap', {
      state: {
        occupationId: selectedCareer.occupation.id,
        occupationTitle: selectedCareer.occupation.title,
        occupationDescription: selectedCareer.occupation.description,
        matchedSkills: selectedCareer.matchedSkills,
        missingSkills: selectedCareer.missingSkills,
        matchScore: selectedCareer.matchScore,
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Career Recommendations</h1>
            <p className="text-muted-foreground">
              Personalized career paths based on your profile and O*NET skills
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadRecommendations}>
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button onClick={saveResults} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Save Results
            </Button>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No recommendations yet</h2>
              <p className="text-muted-foreground">
                Add more skills in Transcript to improve matching.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {recommendations.map((career, index) => (
                <Card
                  key={career.occupation.id}
                  className={`cursor-pointer transition-all ${
                    selectedCareer?.occupation.id === career.occupation.id
                      ? 'ring-2 ring-primary'
                      : ''
                  }`}
                  onClick={() => setSelectedCareer(career)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold">
                            {career.occupation.title}
                          </h3>

                          <p className="text-sm text-muted-foreground mb-3">
                            {career.occupation.description}
                          </p>

                          <div className="flex gap-2 flex-wrap">
                            {career.matchedSkills.slice(0, 3).map((skill) => (
                              <Badge key={skill}>{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {career.matchScore}%
                        </p>
                        <p className="text-xs text-muted-foreground">Match</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              {selectedCareer && (
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>{selectedCareer.occupation.title}</CardTitle>
                    <CardDescription>
                      {selectedCareer.occupation.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Match Score</span>
                        <span>{selectedCareer.matchScore}%</span>
                      </div>
                      <Progress value={selectedCareer.matchScore} />
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Matched Skills</h4>
                      <div className="flex gap-2 flex-wrap">
                        {selectedCareer.matchedSkills.map((skill) => (
                          <Badge key={skill}>{skill}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Missing Skills</h4>
                      <div className="flex gap-2 flex-wrap">
                        {selectedCareer.missingSkills.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No missing skills for this career.
                          </p>
                        ) : (
                          selectedCareer.missingSkills.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <Button className="w-full" onClick={openSkillGap}>
                      View Skill Gap Analysis
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}