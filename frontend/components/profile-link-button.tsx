"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

interface Ad {
  id: string
  name: string
  ad_url: string
  ad_type: string
}

interface ProfileLinkButtonProps {
  url: string | null | undefined
  label: string
  variant: "download" | "watch" | "read"
  accentColor?: string
}

function AdModal({
  isOpen,
  onClose,
  targetUrl,
  variant,
  loadingAd,
  currentAd,
  onAdClick,
}: {
  isOpen: boolean
  onClose: () => void
  targetUrl: string
  variant: "download" | "watch" | "read"
  loadingAd: boolean
  currentAd: Ad | null
  onAdClick: () => void
}) {
  const [countdown, setCountdown] = useState(3)
  const [adClicked, setAdClicked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setCountdown(3)
      setAdClicked(false)
      setShowContent(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !adClicked || countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isOpen, adClicked, countdown])

  const handleAdClick = () => {
    onAdClick()
    setAdClicked(true)
  }

  const handleProceed = () => {
    setShowContent(true)
  }

  const canProceed = adClicked && countdown <= 0

  if (!isOpen || !mounted) return null

  if (showContent) {
    if (variant === "download") {
      const finalUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`
      const linkContent = (
        <div
          className="fixed inset-0 z-[99999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Lien déverrouillé</h2>
                <p className="text-slate-400 text-sm">Copiez le lien ci-dessous</p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2 font-medium">URL de téléchargement:</p>
              <p className="text-emerald-400 break-all font-mono text-sm">{finalUrl}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(finalUrl)
                  alert("Lien copié dans le presse-papier!")
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copier le lien
              </button>
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Ouvrir
              </a>
            </div>
          </div>
        </div>
      )
      return createPortal(linkContent, document.body)
    }

    const finalUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`

    const iframeContent = (
      <div
        className="fixed inset-0 z-[99999] bg-black flex flex-col"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }}
      >
        <div className="h-12 bg-slate-900 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${variant === "download" ? "bg-emerald-500" : variant === "watch" ? "bg-blue-500" : "bg-purple-500"}`}
            />
            <span className="text-white/70 text-sm truncate max-w-[200px] md:max-w-[400px]">{finalUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Ouvrir dans un nouvel onglet"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
              title="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <iframe
            src={finalUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
          />
        </div>
      </div>
    )

    return createPortal(iframeContent, document.body)
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="h-full w-full flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/30">
          {variant === "download" ? (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          ) : variant === "watch" ? (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
          {variant === "download" ? "Téléchargement prêt" : variant === "watch" ? "Vidéo prête" : "Lecture prête"}
        </h1>
        <p className="text-white/50 text-base mb-8 text-center">Une dernière étape pour accéder à votre contenu</p>

        <div className="flex items-center gap-2 mb-8">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${adClicked ? "bg-emerald-500 text-white" : "bg-violet-500 text-white ring-2 ring-violet-500/30"}`}
          >
            {adClicked ? "✓" : "1"}
          </div>
          <span className={`text-xs ${adClicked ? "text-emerald-400" : "text-white"}`}>Cliquer</span>

          <div className="w-6 h-px bg-white/20" />

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${adClicked && countdown <= 0 ? "bg-emerald-500 text-white" : adClicked ? "bg-violet-500 text-white ring-2 ring-violet-500/30" : "bg-white/10 text-white/40"}`}
          >
            {adClicked && countdown <= 0 ? "✓" : "2"}
          </div>
          <span
            className={`text-xs ${adClicked && countdown <= 0 ? "text-emerald-400" : adClicked ? "text-white" : "text-white/40"}`}
          >
            Patienter
          </span>

          <div className="w-6 h-px bg-white/20" />

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${canProceed ? "bg-emerald-500 text-white ring-2 ring-emerald-500/30" : "bg-white/10 text-white/40"}`}
          >
            3
          </div>
          <span className={`text-xs ${canProceed ? "text-emerald-400" : "text-white/40"}`}>Accéder</span>
        </div>

        {adClicked && countdown > 0 && (
          <div className="mb-8 text-center">
            <div className="text-6xl font-bold text-white mb-1">{countdown}</div>
            <div className="text-white/50 text-sm">
              seconde{countdown > 1 ? "s" : ""} restante{countdown > 1 ? "s" : ""}
            </div>
            <div className="mt-3 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="w-full max-w-xs">
          {!adClicked ? (
            <button
              onClick={handleAdClick}
              disabled={loadingAd}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-violet-500/25"
            >
              {loadingAd ? (
                "Chargement..."
              ) : (
                <>
                  Continuer
                  <span className="bg-red-500 text-[10px] px-1.5 py-0.5 rounded font-bold">PUB</span>
                </>
              )}
            </button>
          ) : canProceed ? (
            <button
              onClick={handleProceed}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              {variant === "download" ? "Voir le lien" : variant === "watch" ? "Regarder" : "Lire"}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3.5 rounded-xl bg-white/10 text-white/40 font-bold text-base cursor-not-allowed"
            >
              Patientez...
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-white/40 hover:text-white/60 text-xs transition-colors"
          >
            Annuler
          </button>
        </div>

        <p className="mt-8 text-white/20 text-[10px] text-center">
          Les publicités nous permettent de maintenir ce service gratuit
        </p>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export function ProfileLinkButton({
  url,
  label,
  variant,
  accentColor = "bg-emerald-500 hover:bg-emerald-600",
}: ProfileLinkButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [loadingAd, setLoadingAd] = useState(false)

  useEffect(() => {
    if (showModal && !currentAd && !loadingAd) {
      setLoadingAd(true)
      fetch("/api/ads")
        .then((res) => res.json())
        .then((data) => {
          if (data.ad) setCurrentAd(data.ad)
          setLoadingAd(false)
        })
        .catch(() => setLoadingAd(false))
    }
  }, [showModal, currentAd, loadingAd])

  const handleClick = () => {
    if (!url) return
    setCurrentAd(null)
    setShowModal(true)
  }

  const handleAdClick = async () => {
    if (currentAd) {
      try {
        await fetch("/api/ads/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adId: currentAd.id }),
        })
      } catch {}
      window.open(currentAd.ad_url, "_blank")
    } else {
      window.open("https://otieu.com/4/9248013", "_blank")
    }
  }

  const buttonColor =
    variant === "download"
      ? accentColor
      : variant === "watch"
        ? "bg-blue-500 hover:bg-blue-600"
        : "bg-purple-500 hover:bg-purple-600"

  if (!url) {
    return (
      <button
        disabled
        className="shrink-0 bg-gray-500 text-white/50 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        {label}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`shrink-0 ${buttonColor} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
      >
        {label}
      </button>

      <AdModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        targetUrl={url}
        variant={variant}
        loadingAd={loadingAd}
        currentAd={currentAd}
        onAdClick={handleAdClick}
      />
    </>
  )
}
