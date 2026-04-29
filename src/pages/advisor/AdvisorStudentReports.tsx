import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

type StudentProfile = {
  user_id: string
  name: string | null
  major: string | null
}

type Report = {
  id: string
  advisor_id: string
  student_id: string
  title: string
 content: string | null
report_type: string | null
  file_name: string | null
  file_path: string | null
  created_at: string
}

export default function AdvisorStudentReports() {
  const { studentId } = useParams()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    loadData()
  }, [studentId, user?.id])

  const loadData = async () => {
    if (!studentId || !user?.id) return

    setLoading(true)

    const { data: studentData } = await (supabase as any)
      .from('profiles')
      .select('user_id, name, major')
      .eq('user_id', studentId)
      .maybeSingle()

    setStudent(studentData)

    const { data: reportData, error } = await (supabase as any)
      .from('advisor_reports')
      .select('*')
      .eq('advisor_id', user.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
    }

    setReports(reportData || [])
    setLoading(false)
  }

  const getFileUrl = (path: string | null) => {
    if (!path) return null

    const {
      data: { publicUrl },
    } = supabase.storage.from('advisor-reports').getPublicUrl(path)

    return publicUrl
  }

  const uploadReport = async () => {
    if (!studentId || !user?.id) return

    if (!title.trim()) {
      toast.error('Please enter report title')
      return
    }

    setUploading(true)

    let fileName: string | null = null
    let filePath: string | null = null

    if (file) {
      fileName = file.name
      filePath = `${user.id}/${studentId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('advisor-reports')
        .upload(filePath, file)

      if (uploadError) {
        setUploading(false)
        toast.error(uploadError.message)
        return
      }
    }

    const { error } = await (supabase as any).from('advisor_reports').insert({
      advisor_id: user.id,
      student_id: studentId,
      title: title.trim(),
      content: notes.trim() || null,
report_type: 'advisor_report',
      file_name: fileName,
      file_path: filePath,
    })

    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }

    toast.success('Report uploaded')
    setTitle('')
    setNotes('')
    setFile(null)
    setUploading(false)
    await loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="outline" asChild className="mb-6">
          <Link to="/advisor/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Reports for {student?.name || 'Student'}
          </h1>
          <p className="text-muted-foreground">
            {student?.major || 'No major added'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Report</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                placeholder="Report title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                placeholder="Report notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <Button onClick={uploadReport} disabled={uploading} className="w-full">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Reports</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {reports.length === 0 ? (
                <p className="text-muted-foreground">No reports uploaded yet.</p>
              ) : (
                reports.map((report) => {
                  const fileUrl = getFileUrl(report.file_path)

                  return (
                    <div key={report.id} className="rounded-xl border p-4">
                      <h3 className="font-semibold text-lg">{report.title}</h3>

                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>

                    {report.content && (
  <p className="text-sm text-muted-foreground mb-3">
    {report.content}
  </p>
)}

                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary underline"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {report.file_name || 'Open file'}
                        </a>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}