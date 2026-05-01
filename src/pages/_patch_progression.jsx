          {plan.progression && plan.progression.increment_percent && (
            <div style={{ background:'#1a1a1a', borderRadius:18, padding:16, border:'1px solid #2e2e2e' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Прогрессия нагрузки</div>
              {[{ l:'Выполнил все подходы', v:`+${plan.progression.increment_percent?.min ?? 2.5}–${plan.progression.increment_percent?.max ?? 5}% к весу`, c:'#4ade80' }, { l:'RPE < 7 (легко)', v:'Увеличить нагрузку', c:'#4ade80' }, { l:'RPE 7–9 (норма)', v:'Оставить как есть', c:'#fbbf24' }, { l:'RPE > 9 (тяжело)', v:'Снизить нагрузку', c:'#f87171' }].map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#222', borderRadius:10, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#9ca3af' }}>{row.l}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:row.c, fontFamily:'var(--mono)' }}>{row.v}</span>
                </div>
              ))}
            </div>
          )}