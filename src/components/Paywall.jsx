import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store'
import { X, Crown, Zap, Clock, CheckCircle, Copy, MessageCircle } from 'lucide-react'

const SBP_PHONE = '+7 926 222 74 73'
const CONTACT_LINK = 'https://t.me/+79262227473'
const PRICE = '299 ₽/мес'

const FEATURES = [
  'Безлимитные AI запросы',
  'AI анализ питания и тренировок',
  'Расшифровка медицинских анализов',
  'Персональный AI тренер',
  'AI план тренировок на неделю',
  'Полный доступ навсегда',
]

export default function Paywall({ onClose, reason }) {
  const { getSubscriptionStatus, getAiRequestsLeft } = useStore()
  const status = getSubscriptionStatus()
  const [copied, setCopied] = useState(false)

  const copyPhone = () => {
    navigator.clipboard.writeText(SBP_PHONE.replace(/\s/g, '')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLimit = reason === 'PAYWALL_LIMIT'

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-end', fontFamily: 'Montserrat,sans-serif',
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #13131e 0%, #0d0d16 100%)',
        borderRadius: '28px 28px 0 0',
        border: '1px solid rgba(255,255,255,.1)',
        width: '100%', maxWidth: 560,
        maxHeight: '92vh', overflowY: 'auto',
        padding: '0 0 40px',
      }}>

        {/* Gold header */}
        <div style={{
          background: 'linear-gradient(135deg, #C9A84C 0%, #E8C878 50%, #C9A84C 100%)',
          borderRadius: '28px 28px 0 0',
          padding: '28px 20px 24px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(0,0,0,0.15)', border: 'none',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(0,0,0,0.6)',
          }}>
            <X size={16} />
          </button>
          <Crown size={36} color="#000" style={{ marginBottom: 10, opacity: 0.85 }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: '#000', letterSpacing: -0.5 }}>
            Fit Diary Pro
          </div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', marginTop: 4, fontWeight: 600 }}>
            Полный доступ к AI тренеру
          </div>
        </div>

        <div style={{ padding: '20px 20px 0' }}>

          {/* Status banner */}
          {isLimit ? (
            <div style={{
              background: 'rgba(255,159,67,.1)', border: '1px solid rgba(255,159,67,.3)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Zap size={18} color="#ff9f43" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ff9f43' }}>
                  Лимит запросов исчерпан
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                  Лимит 10 AI запросов в день на пробном периоде
                </div>
              </div>
            </div>
          ) : status.type === 'trial' ? (
            <div style={{
              background: 'rgba(79,172,254,.1)', border: '1px solid rgba(79,172,254,.3)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Clock size={18} color="#4facfe" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4facfe' }}>
                  Пробный период: {status.daysLeft} {status.daysLeft === 1 ? 'день' : status.daysLeft < 5 ? 'дня' : 'дней'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                  Затем доступ будет ограничен
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,77,106,.1)', border: '1px solid rgba(255,77,106,.3)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Clock size={18} color="#ff4d6a" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ff4d6a' }}>
                  Пробный период истёк
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                  Оформите подписку для продолжения
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div style={{
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 16, padding: '16px', marginBottom: 20,
          }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0',
                borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
              }}>
                <CheckCircle size={15} color="#10d9a4" />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#C9A84C', letterSpacing: -1 }}>{PRICE}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
              без автосписания · ручная активация
            </div>
          </div>

          {/* SBP Payment */}
          <div style={{
            background: 'rgba(201,168,76,.07)', border: '1px solid rgba(201,168,76,.25)',
            borderRadius: 16, padding: '16px 18px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: '#C9A84C', marginBottom: 12 }}>
              Оплата через СБП
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 10, lineHeight: 1.6 }}>
              1. Откройте приложение банка<br />
              2. СБП → Перевод по номеру телефона<br />
              3. Переведите <b style={{ color: '#fff' }}>{PRICE.split('/')[0]}</b> на номер:
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.3)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C', letterSpacing: 1 }}>
                {SBP_PHONE}
              </span>
              <button onClick={copyPhone} style={{
                background: copied ? 'rgba(16,217,164,.15)' : 'rgba(201,168,76,.15)',
                border: `1px solid ${copied ? 'rgba(16,217,164,.4)' : 'rgba(201,168,76,.4)'}`,
                borderRadius: 8, padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                color: copied ? '#10d9a4' : '#C9A84C',
                cursor: 'pointer', transition: 'all .2s',
              }}>
                <Copy size={13} />
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 10, lineHeight: 1.5 }}>
              В комментарии к переводу укажите ваш email.<br />
              После оплаты напишите нам — активируем в течение 24 часов.
            </div>
          </div>

          {/* Telegram contact */}
          <a href={CONTACT_LINK} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'rgba(79,172,254,.1)', border: '1px solid rgba(79,172,254,.3)',
            borderRadius: 14, padding: '14px', marginBottom: 14,
            color: '#4facfe', fontSize: 14, fontWeight: 700,
            textDecoration: 'none', cursor: 'pointer',
          }}>
            <MessageCircle size={18} />
            Написать после оплаты
          </a>

          <button onClick={onClose} style={{
            width: '100%', background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.1)', borderRadius: 14,
            padding: '13px', fontSize: 14, fontWeight: 600,
            color: 'rgba(255,255,255,.4)', cursor: 'pointer',
          }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  , document.body)
}
