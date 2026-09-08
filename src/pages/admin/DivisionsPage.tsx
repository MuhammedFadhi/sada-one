import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { StatusBar, PageContent, BottomSheet, EmptyState, SkeletonList } from '@/components/ui'
import toast from 'react-hot-toast'

export function DivisionsPage() {
  const { profile, initialized } = useAuthStore()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name_en:'', name_ar:'', city:'Al Khobar', cost_center_code:'' })

  const { data: divisions, isLoading } = useQuery({
    queryKey: ['admin-divisions'],
    enabled: !!initialized,
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*, departments(id), employees!division_id(id)').order('name_en')
      return data ?? []
    }
  })

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.name_en) throw new Error('Division name required')
      const { error } = await supabase.from('divisions').insert({ ...form, company_id: profile?.employee?.company_id, is_active:true })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Division created'); setOpen(false); setForm({name_en:'',name_ar:'',city:'Al Khobar',cost_center_code:''}); qc.invalidateQueries({queryKey:['admin-divisions']}) },
    onError: (e:any) => toast.error(e.message)
  })

  const COLORS = ['#17B8D0','#C8A96E','#1D9E75','#7F77DD','#E67E22','#E24B4A','#17294A','#718096']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Divisions & Depts</h1>
          <button onClick={()=>setOpen(true)} style={{background:'#17B8D0',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-plus" /> Add
          </button>
        </div>
      </div>
      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && !divisions?.length && <EmptyState icon="building-off" title="No divisions" subtitle="Create your first division." />}
        {divisions?.map((d:any,i)=>{
          const color = COLORS[i%COLORS.length]
          return (
            <div key={d.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:8,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="ti ti-building" style={{color,fontSize:22}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{d.name_en}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:2}}>{d.name_ar} · {d.city}</div>
                </div>
                <div style={{display:'flex',gap:12}}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:color}}>{d.employees?.length??0}</div><div style={{fontSize:9,color:'#CBD5E0'}}>staff</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'#CBD5E0'}}>{d.departments?.length??0}</div><div style={{fontSize:9,color:'#CBD5E0'}}>depts</div></div>
                </div>
              </div>
              {d.cost_center_code && <div style={{fontSize:10,color:'#CBD5E0',marginTop:8}}>Cost Center: {d.cost_center_code}</div>}
            </div>
          )
        })}
      </PageContent>

      <BottomSheet open={open} onClose={()=>setOpen(false)} title="Add Division">
        <div>
          <div className="form-row" style={{marginBottom:12}}>
            <div><div className="form-label">Name (English)</div><input className="input" placeholder="e.g. Marketing" value={form.name_en} onChange={e=>setForm(p=>({...p,name_en:e.target.value}))} /></div>
            <div><div className="form-label">Name (Arabic)</div><input className="input" placeholder="التسويق" value={form.name_ar} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} /></div>
          </div>
          <div className="form-row" style={{marginBottom:16}}>
            <div><div className="form-label">City</div>
              <select className="input" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))}>
                {['Al Khobar','Dammam','Jubail','Dhahran','Riyadh','Jeddah'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><div className="form-label">Cost Center</div><input className="input" placeholder="CC-009" value={form.cost_center_code} onChange={e=>setForm(p=>({...p,cost_center_code:e.target.value}))} /></div>
          </div>
          <button onClick={()=>createMut.mutate()} disabled={createMut.isPending}
            style={{width:'100%',background:'#17B8D0',color:'white',border:'none',borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:createMut.isPending?.7:1}}>
            {createMut.isPending?'Creating…':'Create Division'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
