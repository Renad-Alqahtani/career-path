import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Send,
  Trash2,
  Loader2,
  Paperclip,
  FileText,
  ImageIcon,
  UserRound,
  X,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type ChatUser = {
  user_id: string
  name: string | null
  role: string | null
  request_id: string
  conversation_id: string
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  message: string | null
  image_url: string | null
  file_url: string | null
  file_name: string | null
  file_type: string | null
  created_at: string
}

type StudentAcademicProfile = {
  major: string | null
  gpa: number | null
  university: string | null
  completed_courses: string | null
  self_reported_skills: string | null
  transcript_file_name: string | null
  transcript_file_path: string | null
  visible_to_mentors: boolean
  visibility_settings: any
}

export default function MentorChat() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [people, setPeople] = useState<ChatUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [showStudentProfile, setShowStudentProfile] = useState(false)
  const [studentProfile, setStudentProfile] = useState<StudentAcademicProfile | null>(null)
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false)

  const isProfessional = profile?.role === 'mentor' || profile?.role === 'advisor'

  useEffect(() => {
    if (user?.id && profile?.role) loadPeople()
  }, [user?.id, profile?.role])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!user?.id || !selectedUser?.conversation_id) return

    setMessages([])
    loadMessages(selectedUser.conversation_id)

    const channel = supabase
      .channel(`chat-${selectedUser.conversation_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedUser.conversation_id}`,
        },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((item) => item.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, selectedUser?.conversation_id])

  const loadPeople = async () => {
    if (!user?.id || !profile?.role) return

    if (profile.role === 'mentor' || profile.role === 'advisor') {
      const { data: rows, error } = await (supabase as any)
        .from('connection_requests')
        .select('id, student_id, professional_id, professional_role')
        .eq('professional_id', user.id)
        .eq('professional_role', profile.role)
        .eq('status', 'accepted')

      if (error) {
        toast.error(error.message)
        setPeople([])
        return
      }

      const users = await Promise.all(
        (rows || []).map(async (item: any) => {
          const { data: profileData } = await (supabase as any)
            .from('profiles')
            .select('user_id, name, role')
            .eq('user_id', item.student_id)
            .maybeSingle()

          let conversationId = ''

          const { data: conversation } = await (supabase as any)
            .from('conversations')
            .select('id')
            .eq('student_id', item.student_id)
            .eq('professional_id', item.professional_id)
            .maybeSingle()

          if (conversation?.id) {
            conversationId = conversation.id
          } else {
            const { data: newConversation } = await (supabase as any)
              .from('conversations')
              .insert({
                student_id: item.student_id,
                professional_id: item.professional_id,
                request_id: item.id,
              })
              .select('id')
              .single()

            conversationId = newConversation?.id || ''
          }

          return {
            user_id: item.student_id,
            name: profileData?.name || 'Student',
            role: profileData?.role || 'student',
            request_id: item.id,
            conversation_id: conversationId,
          }
        })
      )

      setPeople(users.filter((item) => item.conversation_id))
      return
    }

    if (profile.role === 'student') {
      const { data: rows, error } = await (supabase as any)
        .from('connection_requests')
        .select('id, student_id, professional_id, professional_role')
        .eq('student_id', user.id)
        .eq('status', 'accepted')

      if (error) {
        toast.error(error.message)
        setPeople([])
        return
      }

      const users = await Promise.all(
        (rows || []).map(async (item: any) => {
          const { data: professionalData } = await (supabase as any)
            .from('professional_profiles')
            .select('user_id, full_name, role')
            .eq('user_id', item.professional_id)
            .maybeSingle()

          let conversationId = ''

          const { data: conversation } = await (supabase as any)
            .from('conversations')
            .select('id')
            .eq('student_id', item.student_id)
            .eq('professional_id', item.professional_id)
            .maybeSingle()

          if (conversation?.id) {
            conversationId = conversation.id
          } else {
            const { data: newConversation } = await (supabase as any)
              .from('conversations')
              .insert({
                student_id: item.student_id,
                professional_id: item.professional_id,
                request_id: item.id,
              })
              .select('id')
              .single()

            conversationId = newConversation?.id || ''
          }

          return {
            user_id: item.professional_id,
            name: professionalData?.full_name || item.professional_role || 'Professional',
            role: professionalData?.role || item.professional_role || 'professional',
            request_id: item.id,
            conversation_id: conversationId,
          }
        })
      )

      setPeople(users.filter((item) => item.conversation_id))
      return
    }

    setPeople([])
  }

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await (supabase as any)
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error(error.message)
      return
    }

    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!user?.id || !selectedUser || !text.trim()) return

    const messageText = text.trim()
    setText('')
    setLoading(true)

    const { data, error } = await (supabase as any)
      .from('messages')
      .insert({
        conversation_id: selectedUser.conversation_id,
        sender_id: user.id,
        receiver_id: selectedUser.user_id,
        message: messageText,
      })
      .select('*')
      .single()

    setLoading(false)

    if (error) {
      toast.error(error.message)
      setText(messageText)
      return
    }

    if (data) {
      setMessages((prev) => {
        if (prev.some((item) => item.id === data.id)) return prev
        return [...prev, data]
      })
    }
  }

  const uploadAttachment = async (file: File) => {
    if (!user?.id || !selectedUser) return

    setUploading(true)

    const ext = file.name.split('.').pop() || 'file'
    const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `${selectedUser.conversation_id}/${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file)

    if (uploadError) {
      setUploading(false)
      toast.error(uploadError.message)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-attachments').getPublicUrl(filePath)

    const isImage = file.type.startsWith('image/')

    const { data, error } = await (supabase as any)
      .from('messages')
      .insert({
        conversation_id: selectedUser.conversation_id,
        sender_id: user.id,
        receiver_id: selectedUser.user_id,
        message: isImage ? 'Image attachment' : 'File attachment',
        image_url: isImage ? publicUrl : null,
        file_url: isImage ? null : publicUrl,
        file_name: file.name,
        file_type: file.type,
      })
      .select('*')
      .single()

    setUploading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (data) {
      setMessages((prev) => {
        if (prev.some((item) => item.id === data.id)) return prev
        return [...prev, data]
      })
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeConnection = async (person: ChatUser) => {
    setRemovingId(person.user_id)

    const { error } = await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', person.request_id)

    setRemovingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    setPeople((prev) => prev.filter((item) => item.user_id !== person.user_id))

    if (selectedUser?.user_id === person.user_id) {
      setSelectedUser(null)
      setMessages([])
      setShowStudentProfile(false)
      setStudentProfile(null)
    }

    toast.success(isProfessional ? 'Student removed' : 'Connection removed')
  }

  const loadStudentProfile = async () => {
    if (!selectedUser?.user_id || !isProfessional) return

    setLoadingStudentProfile(true)
    setShowStudentProfile(true)

    const { data, error } = await (supabase as any)
      .from('student_academic_profiles')
      .select('*')
      .eq('user_id', selectedUser.user_id)
      .maybeSingle()

    setLoadingStudentProfile(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setStudentProfile(data || null)
  }

  const canShowField = (field: string) => {
    if (!studentProfile?.visible_to_mentors) return false

    const settings = studentProfile.visibility_settings

    if (!settings) return true

    const value = settings[field]

    if (typeof value === 'boolean') return value
    if (typeof value === 'object') {
      if (profile?.role === 'advisor') return value?.advisor === true || value?.mentor === true
      return value?.mentor === true
    }

    return true
  }

  const getTranscriptFileUrl = () => {
    if (!studentProfile?.transcript_file_path) return null

    const {
      data: { publicUrl },
    } = supabase.storage.from('transcripts').getPublicUrl(studentProfile.transcript_file_path)

    return publicUrl
  }

  const listTitle = profile?.role === 'student' ? 'My Mentors' : 'My Students'
  const emptyText = profile?.role === 'student' ? 'No accepted mentors yet.' : 'No accepted students yet.'
  const selectText = profile?.role === 'student' ? 'Select Mentor' : 'Select Student'

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4">
            <h2 className="mb-4 text-xl font-bold">{listTitle}</h2>

            <div className="space-y-2">
              {people.map((person) => (
                <div
                  key={person.user_id}
                  className={`flex items-center gap-2 rounded-xl border p-3 ${
                    selectedUser?.user_id === person.user_id
                      ? 'bg-primary text-white'
                      : 'hover:bg-muted'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedUser(person)
                      setShowStudentProfile(false)
                      setStudentProfile(null)
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="font-semibold">{person.name || 'User'}</p>
                    <p className="text-xs capitalize opacity-80">{person.role}</p>
                  </button>

                  <button
                    onClick={() => removeConnection(person)}
                    disabled={removingId === person.user_id}
                    className="rounded-lg p-2 hover:bg-red-500 hover:text-white"
                  >
                    {removingId === person.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}

              {people.length === 0 && (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
              )}
            </div>
          </div>

          <div className="flex h-[650px] flex-col rounded-2xl border bg-card md:col-span-2">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-bold">{selectedUser?.name || selectText}</h3>
                {selectedUser && (
                  <p className="text-xs capitalize text-muted-foreground">{selectedUser.role}</p>
                )}
              </div>

              {selectedUser && isProfessional && (
                <Button size="sm" variant="outline" onClick={loadStudentProfile}>
                  <UserRound className="mr-2 h-4 w-4" />
                  View Student Profile
                </Button>
              )}
            </div>

            {showStudentProfile && isProfessional && (
              <div className="border-b bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Student Profile</h4>
                  <Button size="icon" variant="ghost" onClick={() => setShowStudentProfile(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {loadingStudentProfile ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : !studentProfile ? (
                  <p className="text-sm text-muted-foreground">
                    No transcript profile found.
                  </p>
                ) : !studentProfile.visible_to_mentors ? (
                  <p className="text-sm text-muted-foreground">
                    This student has not allowed access to transcript information.
                  </p>
                ) : (
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    {canShowField('major') && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-muted-foreground">Major</p>
                        <p className="font-medium">{studentProfile.major || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('gpa') && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-muted-foreground">GPA</p>
                        <p className="font-medium">{studentProfile.gpa ?? 'Hidden'}</p>
                      </div>
                    )}

                    {canShowField('university') && (
                      <div className="rounded-lg border bg-background p-3">
                        <p className="text-muted-foreground">University</p>
                        <p className="font-medium">{studentProfile.university || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('courses') && (
                      <div className="rounded-lg border bg-background p-3 sm:col-span-2">
                        <p className="text-muted-foreground">Completed Courses</p>
                        <p className="whitespace-pre-wrap">{studentProfile.completed_courses || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('skills') && (
                      <div className="rounded-lg border bg-background p-3 sm:col-span-2">
                        <p className="text-muted-foreground">Skills</p>
                        <p className="whitespace-pre-wrap">{studentProfile.self_reported_skills || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('transcript_file') && studentProfile.transcript_file_name && getTranscriptFileUrl() && (
                      <div className="rounded-lg border bg-background p-3 sm:col-span-2">
                        <p className="text-muted-foreground">Transcript File</p>
                        <a
                          href={getTranscriptFileUrl() || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline"
                        >
                          {studentProfile.transcript_file_name}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg) => {
                const mine = msg.sender_id === user?.id

                return (
                  <div
                    key={msg.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        mine ? 'bg-primary text-white' : 'bg-muted'
                      }`}
                    >
                      {msg.image_url && (
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.image_url}
                            alt={msg.file_name || 'attachment'}
                            className="mb-2 max-h-64 rounded-lg object-cover"
                          />
                        </a>
                      )}

                      {msg.file_url && (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-2 flex items-center gap-2 rounded-lg border bg-background/80 p-3 text-foreground"
                        >
                          <FileText className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            {msg.file_name || 'Download file'}
                          </span>
                        </a>
                      )}

                      {msg.message && !msg.image_url && !msg.file_url && <p>{msg.message}</p>}

                      {msg.image_url && (
                        <Badge variant="secondary" className="mb-1">
                          <ImageIcon className="mr-1 h-3 w-3" />
                          Image
                        </Badge>
                      )}

                      <p className="mt-1 text-[10px] opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}

              <div ref={bottomRef} />
            </div>

            {selectedUser && (
              <div className="flex gap-2 border-t p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadAttachment(file)
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>

                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write message..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />

                <Button onClick={sendMessage} disabled={loading || !text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}