import { useState } from 'react'
import { useEmployees } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, SearchBar, EmptyState, SkeletonList } from '@/components/ui'

export function DirectoryPage() {
  const [search, setSearch] = useState('')
  const { data: employees, isLoading } = useEmployees({ status:'active', search:search||undefined })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Directory</h1></div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search employees..." />
        {isLoading && <SkeletonList />}
        {!isLoading && !employees?.length && <EmptyState icon="users-off" title="No results" />}
        {employees?.map(emp=>(
          <div key={emp.id} style={{background:'white',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:12,marginBottom:6,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <Avatar name={emp.full_name_en} size={40} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1A202C'}}>{emp.full_name_en}</div>
              <div style={{fontSize:11,color:'#718096',marginTop:1}}>{emp.job_title_en}</div>
              <div style={{fontSize:10,color:'#CBD5E0'}}>{emp.division?.name_en}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
              {emp.mobile && (
                <a href={`tel:${emp.mobile}`} style={{color:'#17B8D0',textDecoration:'none',display:'flex',alignItems:'center',gap:4,fontSize:12}}>
                  <i className="ti ti-phone" style={{fontSize:14}} />
                </a>
              )}
              <a href={`mailto:${emp.work_email}`} style={{color:'#C8A96E',textDecoration:'none',display:'flex',alignItems:'center',gap:4,fontSize:12}}>
                <i className="ti ti-mail" style={{fontSize:14}} />
              </a>
            </div>
          </div>
        ))}
      </PageContent>
    </div>
  )
}
