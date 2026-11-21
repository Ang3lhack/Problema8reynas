import { useEffect, useState } from 'react'
import { BookOpen, Crown, Github, Moon, Monitor, Sun } from 'lucide-react'
import { useQuickSolve } from './engine/useQuickSolve'
import { Learning } from './pages/Learning'
import { SolutionExplorer } from './pages/SolutionExplorer'
import { Visualizer } from './pages/Visualizer'

const navigation = [
  { key: 'visualizador', title: 'Visualizador', Icon: Monitor },
  { key: 'aprender', title: 'Aprender', Icon: BookOpen },
  { key: 'soluciones', title: 'Soluciones', Icon: Crown },
] as const
type Page = typeof navigation[number]['key']
function getPage(): Page {
  return navigation.find(item => '#' + item.key === window.location.hash)?.key ?? 'visualizador'
}

function preference(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback }
  catch { return fallback }
}

export function App() {
  const [page, setPage] = useState<Page>(getPage)
  const [mode, setMode] = useState<'step' | 'quick' | 'lab'>('step')
  const [theme, setTheme] = useState(() => preference('8reinas-theme', 'dark'))
  const [reduced, setReduced] = useState(() => preference('8reinas-motion', 'auto'))
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const quick = useQuickSolve()
  const reduceMotion = reduced === 'reduce' || systemReduced

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = (event: MediaQueryListEvent) => setSystemReduced(event.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    const navigate = () => {
      setPage(getPage())
      if (navigation.some(item => '#' + item.key === window.location.hash)) window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.motion = reduced
    try {
      localStorage.setItem('8reinas-theme', theme)
      localStorage.setItem('8reinas-motion', reduced)
    } catch { /* Preferences still apply in memory. */ }
  }, [theme, reduced])

  return (
    <>
      <a className="skip-link" href="#contenido" onClick={event => {
        event.preventDefault()
        document.getElementById('contenido')?.focus()
      }}>Ir al contenido</a>
      <header className="site-header">
        <div className="header-inner">
          <a href="#visualizador" className="brand" aria-label="8 Reinas | AC-3 Visualizer">
            <img src={import.meta.env.BASE_URL + 'reina.svg'} alt="" width="38" height="38" />
            <span><strong>8 Reinas</strong><small>AC-3 VISUALIZER</small></span>
          </a>
          <nav className="site-nav" aria-label="Principal">
            {navigation.map(({ key, title, Icon }) =>
              <a key={key} href={'#' + key} aria-current={page === key ? 'page' : undefined}><Icon size={16} />{title}</a>,
            )}
          </nav>
          <div className="header-actions">
            <a className="header-icon github-link" href="https://github.com/Ang3lhack/Problema8reynas" aria-label="Repositorio GitHub" title="Repositorio GitHub"><Github size={19} /></a>
            <button type="button" className="header-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'} title={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}>
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" className="container" tabIndex={-1}>
        <div hidden={page !== 'visualizador'}><Visualizer active={page === 'visualizador'} quick={quick} mode={mode} setMode={setMode} reduced={reduceMotion} /></div>
        {page === 'aprender' && <Learning reduced={reduceMotion} openLab={() => { setMode('lab'); window.location.hash = 'visualizador' }} />}
        {page === 'soluciones' && <SolutionExplorer quick={quick} reduced={reduceMotion} />}
      </main>
      <footer className="site-footer">
        <div><span>8 Reinas <span className="muted">·</span> AC-3 Visualizer</span>
          <label className="checkbox"><input type="checkbox" checked={reduced === 'reduce'} onChange={event => setReduced(event.target.checked ? 'reduce' : 'auto')} /> Reducir movimiento</label>
        </div>
      </footer>
    </>
  )
}
