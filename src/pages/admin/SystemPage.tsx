import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent, Toggle } from '@/components/ui'
import toast from 'react-hot-toast'

export function SystemSettingsPage() {
  const { initialized } = useAuthStore()
  const [settings, setSettings] = useState({
    enable_biometric: true,
    enable_announcements: true,
    enable_suggestions: true,
    maintenance_mode: false,
  })

  const { data: stats } = useQuery({
    queryKey: ['system-stats'],
    enabled: !!initialized,
    queryFn: async () => {
      const [emp, users, divisions, tickets] = await Promise.all([
        supabase.from('employees').select('id',{count:'exact',head:true}),
        supabase.from('user_profiles').select('id',{count:'exact',head:true}),
        supabase.from('divisions').select('id',{count:'exact',head:true}),
        supabase.from('help_desk_tickets').select('id',{count:'exact',head:true}).eq('status','open'),
      ])
      return { employees:emp.count??0, users:users.count??0, divisions:divisions.count??0, openTickets:tickets.count??0 }
    }
  })

  const toggle = (key: string, val: boolean) => {
    setSettings(p=>({...p,[key]:val}))
    toast.success('Setting updated')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>System Settings</h1></div>
      </div>
      <PageContent>
        {/* System overview */}
        <div style={{background:'#17294A',borderRadius:14,padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:'white',marginBottom:12}}>System Overview</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[{label:'Employees',val:stats?.employees,icon:'users'},{label:'User Accounts',val:stats?.users,icon:'user-circle'},{label:'Divisions',val:stats?.divisions,icon:'building'},{label:'Open Tickets',val:stats?.openTickets,icon:'ticket'}].map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.06)',borderRadius:10,padding:12,display:'flex',alignItems:'center',gap:10}}>
                <i className={`ti ti-${s.icon}`} style={{color:'#C8A96E',fontSize:20}} />
                <div><div style={{fontSize:18,fontWeight:700,color:'white'}}>{s.val??0}</div><div style={{fontSize:10,color:'rgba(255,255,255,.5)'}}>{s.label}</div></div>
              </div>
            ))}
          </div>
        </div>

        {/* Security settings */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Security</div>
          {[{key:'enable_biometric',label:'Biometric Login',desc:'Allow fingerprint/face login'}].map((s,i,arr)=>(
            <div key={s.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<arr.length-1?'0.5px solid #F0F0F0':'none'}}>
              <div><div style={{fontSize:13,color:'#1A202C'}}>{s.label}</div><div style={{fontSize:11,color:'#718096'}}>{s.desc}</div></div>
              <Toggle on={(settings as any)[s.key]} onChange={v=>toggle(s.key,v)} />
            </div>
          ))}
        </div>

        {/* Feature toggles */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1A202C',marginBottom:8}}>Features</div>
          {[{key:'enable_announcements',label:'Announcements',desc:'Company-wide announcements'},{key:'enable_suggestions',label:'Suggestion Box',desc:'Anonymous employee suggestions'}].map((s,i,arr)=>(
            <div key={s.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<arr.length-1?'0.5px solid #F0F0F0':'none'}}>
              <div><div style={{fontSize:13,color:'#1A202C'}}>{s.label}</div><div style={{fontSize:11,color:'#718096'}}>{s.desc}</div></div>
              <Toggle on={(settings as any)[s.key]} onChange={v=>toggle(s.key,v)} />
            </div>
          ))}
        </div>

        {/* Maintenance */}
        <div style={{background:'white',borderRadius:14,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:13,color:'#E24B4A',fontWeight:600}}>Maintenance Mode</div><div style={{fontSize:11,color:'#718096'}}>Temporarily disable employee access</div></div>
            <Toggle on={settings.maintenance_mode} onChange={v=>toggle('maintenance_mode',v)} />
          </div>
        </div>

        <div style={{textAlign:'center',fontSize:10,color:'#CBD5E0',paddingBottom:8}}>
          SA'DA ONE v1.0 · Supabase · Vercel<br/>Powered by A360
        </div>
      </PageContent>
    </div>
  )
}
