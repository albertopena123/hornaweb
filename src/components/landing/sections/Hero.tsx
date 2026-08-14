"use client"

import { useEffect, useRef, useState } from 'react'
import {
  Target,
  ClipboardList,
  MapPin,
  ArrowRight,
  Users,
  Globe,
  ChevronRight,
  Leaf,
  HeartPulse,
  BookOpen,
  Landmark,
  ShieldCheck,
  TreePine,
  Gem,
} from 'lucide-react'

/* ─── Typewriter ─────────────────────────────────────────── */
const PHRASES = [
  'Todo el poder a las regiones.',
  'Conquistar los mercados del mundo.',
  'Madre de Dios, tierra de oportunidades.',
  'Juntos construimos el futuro.',
]

function useTyping(speed = 60, pause = 1900) {
  const [text, setText] = useState('')
  const [pi, setPi]     = useState(0)
  const [ci, setCi]     = useState(0)
  const [del, setDel]   = useState(false)
  useEffect(() => {
    const phrase = PHRASES[pi]
    let t: ReturnType<typeof setTimeout>
    if (!del && ci < phrase.length)        t = setTimeout(() => setCi(c => c + 1), speed)
    else if (!del && ci === phrase.length) t = setTimeout(() => setDel(true), pause)
    else if (del && ci > 0)               t = setTimeout(() => setCi(c => c - 1), speed / 2)
    else { setDel(false); setPi(i => (i + 1) % PHRASES.length) }
    setText(phrase.slice(0, ci))
    return () => clearTimeout(t)
  }, [ci, del, pi, speed, pause])
  return text
}

/* ─── CountUp ───────────────────────────────────────────── */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV]   = useState(0)
  const el          = useRef<HTMLSpanElement>(null)
  const done        = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return
      done.current = true
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - t0) / 1800, 1)
        setV(Math.round(p * to))
        if (p < 1) requestAnimationFrame(tick); else setV(to)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    if (el.current) obs.observe(el.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={el}>{v}{suffix}</span>
}

/* ─── Icon wrapper with glow ring ──────────────────────── */
function StatIcon({
  icon: Icon,
  color,
  bgColor,
}: {
  icon: React.ElementType
  color: string
  bgColor: string
}) {
  return (
    <div style={{
      width: 48, height: 48,
      borderRadius: 14,
      background: bgColor,
      border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 10,
      position: 'relative',
      transition: 'transform .3s, box-shadow .3s',
      boxShadow: `0 4px 16px ${color}25`,
    }}
      className="stat-icon-wrap"
    >
      <Icon size={22} color={color} strokeWidth={1.75} />
    </div>
  )
}

/* ─── Ticker item ───────────────────────────────────────── */
const TICKER_ITEMS = [
  { label: 'Bioeconomía Amazónica',    Icon: Leaf        },
  { label: 'Salud Universal',          Icon: HeartPulse  },
  { label: 'Educación de Calidad',     Icon: BookOpen    },
  { label: 'Minería Formal',           Icon: Gem         },
  { label: 'Amazonía Protegida',       Icon: TreePine    },
  { label: 'Gobierno Transparente',    Icon: Landmark    },
  { label: 'Seguridad Ciudadana',      Icon: ShieldCheck },
  { label: 'Ahora Nación 2027',        Icon: Target      },
]

/* ─── Hero ───────────────────────────────────────────────── */
export default function Hero() {
  const typed   = useTyping()
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const [headerH, setHeaderH] = useState(76)

  useEffect(() => {
    const hdr = document.querySelector<HTMLElement>('header')
    if (hdr) setHeaderH(hdr.offsetHeight)
    const mm = (e: MouseEvent) => {
      setMx((e.clientX / window.innerWidth  - 0.5) * 12)
      setMy((e.clientY / window.innerHeight - 0.5) * 7)
    }
    window.addEventListener('mousemove', mm)
    return () => window.removeEventListener('mousemove', mm)
  }, [])

  const TICKER_H = 43

  return (
    <>
      <style>{`
        /* ── animations ── */
        @keyframes orb   { 0%,100%{transform:translateY(0)scale(1)} 50%{transform:translateY(-24px)scale(1.04)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(233,3,5,.6)} 50%{box-shadow:0 0 0 10px rgba(233,3,5,0)} }
        @keyframes fl    { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:none} }
        @keytml fr    { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:none} }
        @keyframes fr    { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:none} }
        @keyframes fu    { from{opacity:0;transform:translateY(18px)}  to{opacity:1;transform:none} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes shine { 0%{left:-100%} 100%{left:220%} }
        @keyframes tick  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes pop   { from{opacity:0;transform:scale(.82)} to{opacity:1;transform:scale(1)} }
        @keyframes icon-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

        /* grid */
        .h-grid{position:absolute;inset:0;pointer-events:none;z-index:0;
          background-image:
            linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
          background-size:64px 64px;}
        .h-orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;
          animation:orb 8s ease-in-out infinite;z-index:0;}

        /* stat card */
        .h-stat{
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.11);
          border-radius:20px;padding:18px 22px;text-align:center;min-width:104px;
          transition:transform .3s,border-color .3s,box-shadow .3s;cursor:default;
          position:relative;overflow:hidden;
        }
        .h-stat:hover{
          transform:translateY(-6px);
          border-color:rgba(233,3,5,.45);
          box-shadow:0 16px 40px rgba(233,3,5,.18);
        }
        .h-stat:hover .stat-icon-wrap{
          transform:translateY(-3px) scale(1.08);
          box-shadow:0 8px 24px rgba(233,3,5,.3);
        }
        .stat-icon-wrap{ margin-left:auto; margin-right:auto; animation:icon-float 3s ease-in-out infinite; }

        /* primary button */
        .h-btn-r{
          position:relative;overflow:hidden;
          background:linear-gradient(135deg,#E90305,#B50204);
          color:#fff;border:none;border-radius:14px;
          padding:15px 32px;font-weight:700;font-size:16px;letter-spacing:.3px;
          cursor:pointer;transition:transform .25s,box-shadow .25s;
          text-decoration:none;display:inline-flex;align-items:center;gap:10px;
          box-shadow:0 8px 28px rgba(233,3,5,.45);}
        .h-btn-r::after{content:'';position:absolute;top:0;left:-100%;width:55%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);
          animation:shine 2.6s infinite;}
        .h-btn-r:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(233,3,5,.6);color:#fff;}
        .h-btn-r:hover .btn-arrow{transform:translateX(5px);}
        .btn-arrow{transition:transform .25s;}

        /* ghost button */
        .h-btn-g{
          background:rgba(255,255,255,.08);color:#fff;
          border:1.5px solid rgba(255,255,255,.28);border-radius:14px;
          padding:15px 32px;font-weight:700;font-size:16px;letter-spacing:.3px;
          cursor:pointer;transition:all .25s;
          text-decoration:none;display:inline-flex;align-items:center;gap:10px;
          backdrop-filter:blur(10px);}
        .h-btn-g:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.6);
          transform:translateY(-3px);color:#fff;}

        /* live badge */
        .h-live{display:inline-flex;align-items:center;gap:9px;
          background:rgba(233,3,5,.14);border:1px solid rgba(233,3,5,.4);
          border-radius:50px;padding:8px 18px;animation:pulse 2s infinite;}
        .h-dot{width:9px;height:9px;background:#E90305;border-radius:50%;animation:pulse 1.5s infinite;}

        /* cursor */
        .h-cur{display:inline-block;width:2px;height:.9em;background:#FFD700;
          margin-left:3px;vertical-align:middle;animation:blink .9s step-end infinite;}

        /* region badge */
        .h-region{position:absolute;bottom:18px;left:12px;z-index:10;
          background:rgba(4,10,20,.93);border:1.5px solid #E90305;border-radius:18px;
          padding:11px 18px;backdrop-filter:blur(18px);
          box-shadow:0 8px 28px rgba(0,0,0,.45);animation:fu .9s .4s both;}

        /* party badge */
        .h-party{position:absolute;top:18%;right:12%;z-index:10;
          background:rgba(255,255,255,.97);border-radius:18px;padding:12px 18px;
          box-shadow:0 10px 32px rgba(0,0,0,.28),0 2px 6px rgba(0,0,0,.14);
          display:flex;align-items:center;gap:10px;
          animation:pop .55s .5s both;}

        /* ticker */
        .h-ticker{
          background:linear-gradient(90deg,#8c0102,#E90305,#8c0102);
          padding:11px 0;overflow:hidden;flex-shrink:0;}
        .h-t-wrap{display:flex;animation:tick 34s linear infinite;white-space:nowrap;}
        .h-t-item{display:inline-flex;align-items:center;gap:10px;
          padding:0 36px;color:#fff;font-size:11.5px;font-weight:600;
          text-transform:uppercase;letter-spacing:1.3px;}
        .h-t-sep{display:inline-flex;opacity:.55;}

        /* Responsive Layout Rules */
        .h-section {
          background: linear-gradient(148deg,#05101d 0%,#0D1B2A 60%,#071219 100%);
          position: relative;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 992px) {
          .h-section { height: calc(100vh - var(--header-h, 76px)); overflow: hidden; }
        }
        @media (max-width: 991px) {
          .h-section { height: auto; min-height: calc(100vh - var(--header-h, 76px)); overflow: visible; }
        }

        .h-body-grid {
          flex: 1;
          min-height: 0;
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
        }
        @media (min-width: 992px) {
          .h-body-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; align-items: center; }
        }
        @media (max-width: 991px) {
          .h-body-grid { display: flex; flex-direction: column; padding-top: 16px; }
        }

        .h-left-col {
          display: flex;
          align-items: center;
          animation: fl .85s cubic-bezier(.22,1,.36,1) both;
        }
        @media (min-width: 1200px) {
          .h-left-col { padding: 24px 32px; text-align: left; }
        }
        @media (min-width: 992px) and (max-width: 1199px) {
          .h-left-col { padding: 16px 20px; text-align: left; }
        }
        @media (max-width: 991px) {
          .h-left-col { padding: 16px 20px; text-align: center; justify-content: center; }
        }

        .h-stats-flex {
          display: flex;
          gap: 12px;
          margin-bottom: 1.6rem;
          flex-wrap: wrap;
        }
        @media (max-width: 991px) {
          .h-stats-flex { justify-content: center; gap: 8px; }
          .h-stat { min-width: 95px; padding: 12px 14px; flex: 1 1 calc(33.33% - 8px); }
        }

        .h-btn-wrap {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          animation: fu .9s .4s both;
        }
        @media (max-width: 991px) {
          .h-btn-wrap { justify-content: center; }
          .h-btn-r, .h-btn-g { padding: 14px 24px; font-size: 15px; flex: 1 1 200px; justify-content: center; }
        }

        .h-region-wrap {
          display: flex; align-items: center; gap: 8px; margin-top: 16px;
          animation: fu .9s .6s both;
        }
        @media (max-width: 991px) {
          .h-region-wrap { justify-content: center; }
        }

        .h-right-col {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
          height: 100%;
          animation: fr .9s cubic-bezier(.22,1,.36,1) .15s both;
        }
        @media (min-width: 992px) {
          .h-right-col { overflow: visible; }
        }
        @media (max-width: 991px) {
          .h-right-col { margin-top: 24px; overflow: hidden; min-height: 380px; }
        }

        .h-candidate-img {
          display: block;
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          object-fit: contain;
          object-position: bottom center;
          filter: drop-shadow(0 -4px 22px rgba(233,3,5,.18)) drop-shadow(0 16px 44px rgba(0,0,0,.65));
        }
        @media (min-width: 992px) {
          .h-candidate-img {
            max-height: calc(100vh - var(--header-h, 76px) - 43px - 30px);
            height: auto; width: auto; max-width: 100%;
            margin-top: 20px;
          }
        }
        @media (max-width: 991px) {
          .h-candidate-img {
            max-height: 420px;
            width: auto; max-width: 92%;
            margin: 0 auto;
          }
          .h-party { top: 8px; right: 12px; padding: 8px 12px; }
          .h-party img { width: 30px !important; height: 30px !important; }
          .h-region { bottom: 12px; left: 50%; transform: translateX(-50%); padding: 8px 14px; width: max-content; }
        }
      `}</style>

      <section
        id="inicio"
        className="h-section"
        style={{
          '--header-h': `${headerH}px`,
        } as React.CSSProperties}
      >
        <div className="h-grid" />
        <div className="h-orb" style={{width:500,height:500,top:'-15%',left:'-10%',background:'rgba(192,57,43,.18)'}} />
        <div className="h-orb" style={{width:300,height:300,bottom:'8%',right:'0',background:'rgba(39,174,96,.09)',animationDelay:'-4s'}} />
        <div className="h-orb" style={{width:200,height:200,top:'20%',right:'22%',background:'rgba(233,3,5,.11)',animationDelay:'-2s'}} />

        {/* Flag */}
        <div style={{
          position:'absolute',top:0,right:0,height:'100%',width:'62%',
          opacity:.5,overflow:'hidden',pointerEvents:'none',zIndex:0,
          maskImage:'linear-gradient(to right,transparent 0%,black 40%)',
          WebkitMaskImage:'linear-gradient(to right,transparent 0%,black 40%)',
        }}>
          <img src="/assets/images/shapes/bandera-peru.png" alt=""
            style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top right'}} />
        </div>

        {/* ── BODY ── */}
        <div className="h-body-grid">

          {/* LEFT — vertically centered */}
          <div className="h-left-col">
            <div style={{width:'100%'}}>

              {/* Live badge */}
              <div style={{marginBottom:18}}>
                <span className="h-live">
                  <span className="h-dot" />
                  <img src="/assets/images/logo/logo-an.webp" alt="AN"
                    style={{width:22,height:22,objectFit:'contain',borderRadius:5}} />
                  <span style={{color:'#fff',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>
                    Candidato Regional 2027–2030
                  </span>
                </span>
              </div>

              {/* Name */}
              <h1 style={{
                fontSize:'clamp(2.4rem,5vw,5rem)',fontWeight:900,color:'#fff',
                lineHeight:1.05,marginBottom:'0.7rem',letterSpacing:'-1.5px',
              }}>
                Simón <span style={{color:'#E90305'}}>Horna</span><br/>Alpaca
              </h1>

              {/* Typewriter */}
              <div style={{
                fontSize:'clamp(1rem,1.8vw,1.35rem)',fontWeight:600,color:'#FFD700',
                minHeight:'1.8em',marginBottom:'1.6rem',letterSpacing:'.2px',
              }}>
                "<span style={{fontStyle:'italic'}}>{typed}</span><span className="h-cur" />"
              </div>

              {/* Stat cards with Lucide icons */}
              <div className="h-stats-flex">
                {([
                  { to:4,  s:'',  label:'Dimensiones\nEstratégicas', Icon:Target,       color:'#E90305', bg:'rgba(233,3,5,.12)'   },
                  { to:17, s:'+', label:'Propuestas\nConcretas',      Icon:ClipboardList, color:'#4A9EFF', bg:'rgba(74,158,255,.12)' },
                  { to:3,  s:'',  label:'Provincias\nBeneficiadas',   Icon:MapPin,        color:'#2ECC71', bg:'rgba(46,204,113,.12)' },
                ] as const).map(c => (
                  <div key={c.label} className="h-stat">
                    <StatIcon icon={c.Icon} color={c.color} bgColor={c.bg} />
                    <div style={{fontSize:'clamp(1.5rem,2.5vw,2.2rem)',fontWeight:900,color:'#fff',lineHeight:1}}>
                      <CountUp to={c.to} suffix={c.s} />
                    </div>
                    <div style={{fontSize:9.5,color:'rgba(255,255,255,.6)',textTransform:'uppercase',
                      letterSpacing:'.7px',marginTop:5,whiteSpace:'pre-line',lineHeight:1.3}}>
                      {c.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="h-btn-wrap">
                <a href="#apoyo" className="h-btn-r">
                  Súmate ahora
                  <span className="btn-arrow"><ArrowRight size={17} strokeWidth={2.2} /></span>
                </a>
                <a href="#apoyo" className="h-btn-g">
                  <Users size={17} strokeWidth={2} />
                  Mapa de apoyo
                </a>
              </div>

              {/* Region strip */}
              <div className="h-region-wrap">
                <Globe size={13} color="rgba(255,255,255,.4)" strokeWidth={1.5} />
                <span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>
                  Tambopata · Manu · Tahuamanu — Madre de Dios
                </span>
              </div>

            </div>
          </div>

          {/* RIGHT — image anchored to bottom */}
          <div className="h-right-col">
            <div style={{
              position:'relative',display:'flex',alignItems:'flex-end',
              justifyContent:'center',width:'100%',height:'100%',
              transform:`translate(${mx}px,${my}px)`,transition:'transform .1s linear',
            }}>

              {/* Glow under feet */}
              <div style={{
                position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',
                width:'52%',height:90,
                background:'radial-gradient(ellipse,rgba(233,3,5,.55) 0%,transparent 70%)',
                filter:'blur(22px)',zIndex:0,
              }} />

              <img
                src="/assets/images/thumbs/simon-horna.png"
                alt="Simón Horna Alpaca — Candidato Gobierno Regional Madre de Dios"
                className="h-candidate-img"
              />

              {/* Ahora Nación party badge — near raised hand */}
              <div className="h-party">
                <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación"
                  style={{width:38,height:38,objectFit:'contain'}} />
                <div>
                  <div style={{fontSize:11.5,fontWeight:800,color:'#E90305',textTransform:'uppercase',letterSpacing:.5}}>
                    Ahora Nación
                  </div>
                  <div style={{fontSize:10,color:'#888',fontWeight:500}}>2027–2030</div>
                </div>
              </div>

              {/* Region pill */}
              <div className="h-region">
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <MapPin size={18} color="#E90305" strokeWidth={2} />
                  <div>
                    <div style={{color:'#fff',fontWeight:700,fontSize:13}}>Madre de Dios</div>
                    <div style={{color:'rgba(255,255,255,.6)',fontSize:10}}>Tambopata · Manu · Tahuamanu</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── TICKER ── */}
        <div className="h-ticker">
          <div className="h-t-wrap">
            {[0,1].map(r => (
              <span key={r}>
                {TICKER_ITEMS.map(({ label, Icon }, i) => (
                  <span key={i} className="h-t-item">
                    <Icon size={12} strokeWidth={2} />
                    {label}
                    <span className="h-t-sep"><ChevronRight size={12} /></span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

