// ============================================================
// WelcomeBanner - Shown on first visit (anonymous or signed-in)
// Informs user data is stored locally, cloud sync coming soon
// ============================================================

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bound_welcome_dismissed';
const ANON_KEY = 'bound_welcome_dismissed_anon';

function isDismissed(uid?: string): boolean {
  try {
    if (uid) {
      const val = localStorage.getItem(STORAGE_KEY);
      if (!val) return false;
      const parsed = JSON.parse(val) as string[];
      return parsed.includes(uid);
    }
    return localStorage.getItem(ANON_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(uid?: string): void {
  try {
    if (uid) {
      const val = localStorage.getItem(STORAGE_KEY);
      const list: string[] = val ? JSON.parse(val) : [];
      if (!list.includes(uid)) list.push(uid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } else {
      localStorage.setItem(ANON_KEY, '1');
    }
  } catch {
    if (uid) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([uid]));
    } else {
      localStorage.setItem(ANON_KEY, '1');
    }
  }
}

/** Check if browser has any pre-existing Bound data */
function hasExistingData(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bound_') && key !== STORAGE_KEY && key !== ANON_KEY) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

interface WelcomeBannerProps {
  uid?: string;
}

export default function WelcomeBanner({ uid }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState(0); // 0 = welcome, 1 = step-by-step

  useEffect(() => {
    if (!isDismissed(uid) && !hasExistingData()) {
      setVisible(true);
    }
  }, [uid]);

  const handleDismiss = () => {
    setClosing(true);
    setTimeout(() => {
      markDismissed(uid);
      setVisible(false);
    }, 300);
  };

  const handleNext = () => setStep(1);
  const handleBack = () => setStep(0);

  if (!visible) return null;

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: closing ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          ...styles.card,
          transform: closing ? 'scale(0.95) translateY(10px)' : 'scale(1) translateY(0)',
          opacity: closing ? 0 : 1,
          transition: 'all 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative gradient top bar */}
        <div style={styles.gradientBar} />

        {step === 0 ? (
          <>
            {/* Icon */}
            <div style={styles.iconWrapper}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#welcomeGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="welcomeGrad" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M2 10h20" />
                <circle cx="12" cy="15" r="1" />
              </svg>
            </div>

            {/* Heading */}
            <h2 style={styles.heading}>
              Bem-vindo ao <span style={styles.brand}>Bound</span>! 🎉
            </h2>

            {/* Body */}
            <p style={styles.body}>
              Seus dados ficam salvos <strong style={styles.highlight}>apenas neste dispositivo</strong>,
              no armazenamento local do navegador. Nada é enviado para servidores externos.
            </p>

            {/* Cloud teaser */}
            <div style={styles.cloudTeaser}>
              <div style={styles.cloudIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                </svg>
              </div>
              <p style={styles.cloudText}>
                <strong style={styles.cloudSoon}>Em breve:</strong> sincronização na nuvem para
                acessar suas informações de qualquer lugar.
              </p>
            </div>

            {/* Tips */}
            <div style={styles.tips}>
              <div style={styles.tipItem}>
                <span style={styles.tipIcon}>🔒</span>
                <span style={styles.tipText}>Privacidade total — seus dados não saem do navegador</span>
              </div>
              <div style={styles.tipItem}>
                <span style={styles.tipIcon}>💾</span>
                <span style={styles.tipText}>Use o menu para exportar um backup a qualquer momento</span>
              </div>
              <div style={styles.tipItem}>
                <span style={styles.tipIcon}>☁️</span>
                <span style={styles.tipText}>Cloud sync será opcional e criptografado</span>
              </div>
            </div>

            {/* CTA */}
            <button style={styles.cta} onClick={handleNext}>
              Como usar o Bound →
            </button>
            <button style={styles.skipBtn} onClick={handleDismiss}>
              Pular introdução
            </button>
          </>
        ) : (
          <>
            {/* Step-by-step onboarding */}
            <div style={styles.iconWrapper}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#welcomeGrad2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="welcomeGrad2" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>

            <h2 style={styles.heading}>Como usar o Bound</h2>
            <p style={styles.bodySmall}>Em apenas 3 passos você organiza todo o seu conhecimento:</p>

            {/* Steps */}
            <div style={styles.steps}>
              <div style={styles.stepRow}>
                <div style={styles.stepNumber}>
                  <span style={styles.stepNum}>1</span>
                </div>
                <div style={styles.stepContent}>
                  <h4 style={styles.stepTitle}>Crie uma Área</h4>
                  <p style={styles.stepDesc}>
                    Áreas são espaços para organizar seus conteúdos por tema, projeto ou assunto.
                    Comece criando a sua primeira área na tela inicial.
                  </p>
                </div>
              </div>

              <div style={styles.stepConnector} />

              <div style={styles.stepRow}>
                <div style={{ ...styles.stepNumber, background: 'linear-gradient(135deg, #818cf8, #a78bfa)' }}>
                  <span style={styles.stepNum}>2</span>
                </div>
                <div style={styles.stepContent}>
                  <h4 style={styles.stepTitle}>Adicione Conteúdos</h4>
                  <p style={styles.stepDesc}>
                    Dentro de cada área, crie conteúdos com um canvas visual para anotações,
                    desenhos e ideias. Cada conteúdo tem propriedades, emojis e um editor interativo.
                  </p>
                </div>
              </div>

              <div style={styles.stepConnector} />

              <div style={styles.stepRow}>
                <div style={{ ...styles.stepNumber, background: 'linear-gradient(135deg, #a78bfa, #ec4899)' }}>
                  <span style={styles.stepNum}>3</span>
                </div>
                <div style={styles.stepContent}>
                  <h4 style={styles.stepTitle}>Conecte tudo</h4>
                  <p style={styles.stepDesc}>
                    Link seus conteúdos uns aos outros e organize-os em hierarquias de até <strong style={styles.highlight}>8 níveis</strong>.
                    Visualize todas as conexões no grafo interativo.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={styles.navRow}>
              <button style={styles.backBtn} onClick={handleBack}>← Voltar</button>
              <button style={{ ...styles.cta, width: 'auto', flex: 1, margin: 0 }} onClick={handleDismiss}>
                Começar agora! 🚀
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  card: {
    position: 'relative',
    width: '460px',
    maxWidth: '100%',
    backgroundColor: '#1e293b',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.08)',
  },
  gradientBar: {
    height: '4px',
    background: 'linear-gradient(90deg, #38bdf8 0%, #a78bfa 50%, #ec4899 100%)',
  },
  iconWrapper: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '28px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f1f5f9',
    textAlign: 'center',
    margin: '16px 32px 0',
    lineHeight: '1.3',
  },
  brand: {
    background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  body: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center',
    margin: '12px 32px 0',
    lineHeight: '1.6',
  },
  highlight: {
    color: '#e2e8f0',
  },
  cloudTeaser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 28px 0',
    padding: '14px 16px',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    border: '1px solid rgba(56, 189, 248, 0.12)',
    borderRadius: '12px',
  },
  cloudIcon: {
    flexShrink: 0,
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: '10px',
  },
  cloudText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5',
  },
  cloudSoon: {
    color: '#38bdf8',
  },
  tips: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    margin: '20px 28px 0',
  },
  tipItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  tipIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  tipText: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  cta: {
    display: 'block',
    width: 'calc(100% - 56px)',
    margin: '24px 28px 0',
    padding: '14px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    color: '#0f172a',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  },
  skipBtn: {
    display: 'block',
    width: 'calc(100% - 56px)',
    margin: '8px 28px 28px',
    padding: '10px',
    background: 'transparent',
    color: '#64748b',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'color 0.15s ease',
  },
  bodySmall: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    margin: '8px 32px 0',
    lineHeight: '1.5',
  },
  steps: {
    margin: '20px 28px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  stepRow: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  stepNumber: {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f172a',
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 4px 0',
    lineHeight: '1.3',
  },
  stepDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5',
  },
  stepConnector: {
    width: '2px',
    height: '16px',
    background: 'linear-gradient(to bottom, rgba(56,189,248,0.4), rgba(167,139,250,0.4))',
    marginLeft: '17px',
  },
  navRow: {
    display: 'flex',
    gap: '10px',
    margin: '24px 28px 28px',
    alignItems: 'center',
  },
  backBtn: {
    padding: '14px 20px',
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
