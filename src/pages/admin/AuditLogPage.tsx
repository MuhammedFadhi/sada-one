import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { StatusBar, PageContent, SearchBar, EmptyState, SkeletonList } from '@/components/ui'
import { formatDayMonthTime } from '@/lib/dates'

const ACTION_META: Record<string,{color:string;icon:string}> = {
  create:{color:'#1D9E75',icon:'plus'}, update:{color:'#17B8D0',icon:'edit'},
  delete:{color:'#E24B4A',icon:'trash'}, login:{color:'#7F77DD',icon:'login'},
  logout:{color:'#718096',icon:'logout'}, approve:{color:'#1D9E75',icon:'check'},
  reject:{color:'#E24B4A',icon:'x'}, view:{color:'#CBD5E0',icon:'eye'},
}

export function AuditLogPage() {
  const { initialized } = useAuthStore()
  const [search, setSearch] = useState('')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    enabled: !!initialized,
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs')
        .select('*, actor:employees(full_name_en,avatar_url)')
        .order('created_at',{ascending:false})
        .limit(100)
      return data ?? []
    }
  })

  const filtered = logs?.filter((l:any)=>!search||l.action?.toLowerCase().includes(search.toLowerCase())||l.entity_type?.toLowerCase().includes(search.toLowerCase())||l.actor?.full_name_en?.toLowerCase().includes(search.toLowerCase()))??[]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Audit Log</h1></div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search actions, users..." />
        {isLoading && <SkeletonList />}
        {!isLoading && !filtered.length && <EmptyState icon="history" title="No activity logged" subtitle="System activity will be recorded here." />}
        {filtered.map((log:any)=>{
          const meta = ACTION_META[log.action] ?? ACTION_META.view
          return (
            <div key={log.id} style={{background:'white',borderRadius:12,padding:'12px 14px',marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',gap:10}}>
              <div style={{width:34,height:34,borderRadius:9,background:meta.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={`ti ti-${meta.icon}`} style={{color:meta.color,fontSize:16}} />
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:'#1A202C'}}>
                  <span style={{fontWeight:600}}>{log.actor?.full_name_en??'System'}</span>
                  {' '}<span style={{color:meta.color}}>{log.action}</span>
                  {' '}<span style={{color:'#718096'}}>{log.entity_type?.replace(/_/g,' ')}</span>
                </div>
                {log.details && <div style={{fontSize:11,color:'#718096',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{typeof log.details==='string'?log.details:JSON.stringify(log.details)}</div>}
                <div style={{fontSize:10,color:'#CBD5E0',marginTop:3}}>
                  {formatDayMonthTime(log.created_at)}
                  {log.ip_address && ` · ${log.ip_address}`}
                </div>
              </div>
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
