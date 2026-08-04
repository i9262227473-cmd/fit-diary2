import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { getTechnique } from '../../data/exerciseTechnique'

// ─── TECHNIQUE MODAL (окно с техникой упражнения) ─────────────────────﻿
export default function TechniqueModal({ name, muscle, onClose }) {
  const tech = getTechnique(name)
  const M_COLORS = { Грудь:'#329063', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#0e0e0e', borderRadius:'20px 20px 0 0', padding:'20px 16px calc(20px + env(safe-area-inset-bottom, 0px))', width:'100%', maxWidth:500, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:18 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#f5f5f5' }}>{name}</div>
            {muscle && <span style={{ display:'inline-block', marginTop:6, padding:'2px 10px', borderRadius:50, fontSize:11, color:'#000', background:M_COLORS[muscle]||'#3d9970', fontWeight:600 }}>{muscle}</span>}
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'#1a1a1a', border:'1px solid #2e2e2e', color:'#9ca3af', cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
        </div>

        {tech ? (
          <>
            <div style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:16, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Как выполнять</div>
              <ol style={{ margin:0, paddingLeft:20, color:'#d1d5db', fontSize:14, lineHeight:1.75 }}>
                {tech.steps.map((s, i) => <li key={i} style={{ marginBottom:4 }}>{s}</li>)}
              </ol>
            </div>

            {tech.mistakes?.length > 0 && (
              <div style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Частые ошибки</div>
                <ul style={{ margin:0, paddingLeft:20, color:'#d1d5db', fontSize:14, lineHeight:1.75 }}>
                  {tech.mistakes.map((m, i) => <li key={i} style={{ marginBottom:4 }}>{m}</li>)}
                </ul>
              </div>
            )}

            {tech.safety && (
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:14, padding:'14px 16px' }}>
                <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
                <div style={{ fontSize:13, lineHeight:1.6, color:'#fbd97a' }}>{tech.safety}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'30px 0', color:'#6b7280', fontSize:14 }}>
            Описание техники для этого упражнения пока готовится.
          </div>
        )}
      </div>
    </div>, document.body
  )
}
