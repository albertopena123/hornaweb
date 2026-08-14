import { useState, useEffect } from 'react'

const ScrollToTop = () => {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setActive(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = (e) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div
      className={`progress-wrap cursor-big ${active ? 'active-progress' : ''}`}
      onClick={handleClick}
      style={{
        opacity: active ? 1 : 0,
        visibility: active ? 'visible' : 'hidden',
        transform: active ? 'translateY(0)' : 'translateY(15px)',
        transition: 'all 200ms linear',
        cursor: 'pointer',
        zIndex: 99999,
      }}
    >
      <svg className="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
        <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
      </svg>
    </div>
  )
}

export default ScrollToTop
