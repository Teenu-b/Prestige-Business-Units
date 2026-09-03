import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Gauge,
  HardHat,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'

function useInView(threshold = 0.25) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView(0.15)
  return (
    <div ref={ref} className={`reveal ${inView ? 'visible' : ''} ${className}`.trim()} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function Counter({ to, suffix = '', decimals = 0 }) {
  const [ref, inView] = useInView(0.4)
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const duration = 1400
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(to * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return <span ref={ref}>{value.toFixed(decimals)}{suffix}</span>
}

const PROCESS = [
  { n: '01', label: 'Leads & Marketing', hint: 'Initial inquiries & tracking' },
  { n: '02', label: 'Estimation & Proposals', hint: 'Quote prep & presentation' },
  { n: '03', label: 'Approvals', hint: 'Client & regulatory sign-offs' },
  { n: '04', label: 'Procurement & Delivery', hint: 'Material sourcing & logistics' },
  { n: '05', label: 'Construction', hint: 'On-site build & commissioning' },
  { n: '06', label: 'Invoicing & Payments', hint: 'Financial close-out & billing' },
  { n: '07', label: 'Warranty Registration', hint: 'Certificate issue & logging' },
  { n: '08', label: 'Referrals & Feedback', hint: 'Client review & advocacy' },
  { n: '09', label: 'DLP, O&M Period', hint: 'Defects liability & maintenance' },
]

const FEATURES = [
  { icon: ClipboardCheck, title: 'Lead capture & qualification', desc: 'Every enquiry — campaign, referrer, inbound or repeat — logged, assigned and qualified with a full audit trail.' },
  { icon: Gauge, title: 'Estimation & margin control', desc: 'Solution options, cost build-ups and margin-floor checks before a proposal ever reaches a client.' },
  { icon: FileText, title: 'Proposals & approvals', desc: 'Director sign-off on below-floor pricing, DA / DNSP / finance approvals tracked to close.' },
  { icon: PackageSearch, title: 'Procurement & purchase orders', desc: 'BOQ matching, price-variation checks and delivery confirmation tied straight to billing milestones.' },
  { icon: HardHat, title: 'Site delivery & sign-off', desc: 'Crew scheduling, sub-stage checklists, SWMS and commissioning evidence captured on site.' },
  { icon: CircleDollarSign, title: 'Milestone billing', desc: 'Deposit, delivery and final invoices generated automatically as each milestone is met.' },
  { icon: ShieldCheck, title: 'Warranty & compliance', desc: 'CCEW, STC and warranty registration tracked with escalation if a step stalls.' },
  { icon: Users, title: 'Referrals & commission', desc: 'Referrer network, involvement tiers and commission calculated straight from accepted value.' },
  { icon: Bell, title: 'SLA-aware notifications', desc: 'Every stage carries a response-time target — overdue items surface automatically, to the right person.' },
]

export default function Landing() {
  const heroRef = useRef(null)

  const onHeroMove = (e) => {
    const el = heroRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const my = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    el.style.setProperty('--mx', mx.toFixed(3))
    el.style.setProperty('--my', my.toFixed(3))
  }
  const onHeroLeave = () => {
    const el = heroRef.current
    if (!el) return
    el.style.setProperty('--mx', 0)
    el.style.setProperty('--my', 0)
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark">P</span>
          Prestige
        </div>
        <div className="landing-nav-links">
          <a href="#process">Process</a>
          <a href="#platform">Platform</a>
          <a href="#stats">Results</a>
          <Link className="btn btn-primary btn-sm" to="/login">Sign in</Link>
        </div>
      </nav>

      <header className="landing-hero" ref={heroRef} onMouseMove={onHeroMove} onMouseLeave={onHeroLeave}>
        <span className="landing-aura" />
        <span className="landing-blob b1" />
        <span className="landing-blob b2" />
        <span className="landing-blob b3" />
        <span className="landing-blob b4" />
        <span className="landing-grid-overlay" />
        <div className="landing-float-cards">
          <div className="landing-float-card fc1">
            <span className="fc-icon"><Briefcase size={16} /></span>
            <div><div className="fc-value">176</div><div className="fc-label">Open jobs</div></div>
          </div>
          <div className="landing-float-card fc2">
            <span className="fc-icon"><CircleDollarSign size={16} /></span>
            <div><div className="fc-value">$1.64M</div><div className="fc-label">Contracted, not installed</div></div>
          </div>
          <div className="landing-float-card fc3">
            <span className="fc-icon"><Gauge size={16} /></span>
            <div><div className="fc-value">17.2%</div><div className="fc-label">Margin, this month</div></div>
          </div>
          <div className="landing-float-card fc4">
            <span className="fc-icon"><MapPin size={16} /></span>
            <div><div className="fc-value">9</div><div className="fc-label">Stages, one system</div></div>
          </div>
        </div>
        <div className="landing-hero-inner">
          <span className="landing-badge"><Sparkles size={13} /> Lead to service, in one platform</span>
          <h1>From first enquiry to final <em>commission</em> — one system, every stage.</h1>
          <p>
            Prestige runs the entire solar &amp; electrical delivery lifecycle — leads, estimation, approvals,
            procurement, construction, billing and warranty — so nothing gets lost between a WhatsApp message
            and a signed-off job.
          </p>
          <div className="landing-cta-row">
            <Link className="btn btn-primary" to="/login">
              Sign in to your workspace <ArrowRight size={16} />
            </Link>
            <a className="btn btn-ghost" href="#process">See the process</a>
          </div>
        </div>
        <a href="#process" className="landing-scroll-cue">
          Scroll <ChevronDown size={16} />
        </a>
      </header>

      <div className="landing-marquee" aria-hidden="true">
        <div className="landing-marquee-track">
          {[...PROCESS, ...PROCESS].map((s, i) => (
            <span className="landing-marquee-item" key={i}>
              <Zap size={13} /> {s.label}
            </span>
          ))}
        </div>
      </div>

      <section className="landing-section" id="platform">
        <Reveal>
          <div className="landing-section-head">
            <span className="landing-eyebrow">Platform</span>
            <h2>Every module your team already needs</h2>
            <p>Built around the actual way a job moves — not a generic pipeline bolted on afterwards.</p>
          </div>
        </Reveal>
        <div className="landing-features">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="landing-feature-card">
                <div className="landing-feature-icon"><f.icon size={20} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-stats-band" id="stats">
        <div className="landing-stats-grid">
          <Reveal><div><div className="landing-stat-num"><Counter to={9} /></div><div className="landing-stat-label">Stages tracked end to end</div></div></Reveal>
          <Reveal delay={80}><div><div className="landing-stat-num"><Counter to={3} /></div><div className="landing-stat-label">Milestone billing splits</div></div></Reveal>
          <Reveal delay={160}><div><div className="landing-stat-num"><Counter to={100} suffix="%" /></div><div className="landing-stat-label">Actions in the audit trail</div></div></Reveal>
          <Reveal delay={240}><div><div className="landing-stat-num"><Counter to={24} suffix="/7" /></div><div className="landing-stat-label">SLA-aware notifications</div></div></Reveal>
        </div>
      </section>

      <section className="landing-section" id="process">
        <Reveal>
          <div className="landing-section-head">
            <span className="landing-eyebrow">Process</span>
            <h2>The whole company process, mapped</h2>
            <p>From the first marketing touch to the day defects liability closes out — one record, start to finish.</p>
          </div>
        </Reveal>
        <div className="landing-timeline">
          {PROCESS.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <div className="landing-timeline-step on">
                <div className="landing-timeline-dot"><CheckCircle2 size={16} /></div>
                <h4>{s.label}</h4>
                <p>{s.hint}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <div className="landing-cta-banner">
          <h2>Ready to see your pipeline like this?</h2>
          <p>Sign in with your team credentials — every lead, quote and job you already have is waiting.</p>
          <Link className="btn btn-primary" to="/login">
            Sign in <ArrowRight size={16} />
          </Link>
        </div>
      </Reveal>

      <footer className="landing-footer">
        <div className="landing-brand" style={{ fontSize: 14 }}>
          <span className="landing-brand-mark" style={{ width: 26, height: 26, fontSize: 12 }}>P</span>
          Prestige Renewable Solutions
        </div>
        <span>© {new Date().getFullYear()} Prestige · Sydpro Electrical &amp; Solar Services</span>
      </footer>
    </div>
  )
}
