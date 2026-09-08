import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyTeam } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, SearchBar, EmptyState, SkeletonList } from '@/components/ui'

export function TeamPage() {
  const navigate = useNavigate()
  const { data: team, isLoading } = useMyTeam()
  const [search, setSearch] = useState('')
  const filtered = team?.filter((m:any) => m.full_name_en.toLowerCase().includes(search.toLowerCase())) ?? []

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>My Team</h1></div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search team members..." />
        {isLoading && <SkeletonList />}
        {!isLoading && !filtered.length && <EmptyState icon="users-off" title="No results" />}
        {filtered.map((m: any) => (
          <div key={m.id} onClick={()=>navigate(`/manager/team/${m.id}`)}
            style={{background:'white',borderRadius:14,padding:14,display:'flex',alignItems:'center',gap:12,marginBottom:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <Avatar name={m.full_name_en} size={44} />
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{m.full_name_en}</div>
              <div style={{fontSize:12,color:'#718096',marginTop:2}}>{m.job_title_en}</div>
              <div style={{fontSize:11,color:'#CBD5E0',marginTop:2}}>{m.division?.name_en}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              <span className={`badge badge-${m.status==='active'?'success':'warning'}`}>{m.status}</span>
              <i className="ti ti-chevron-right" style={{color:'#CBD5E0',fontSize:16}} />
            </div>
          </div>
        ))}
      </PageContent>
    </div>
  )
}
