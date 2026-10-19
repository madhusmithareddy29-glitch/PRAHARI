import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./WelcomeExperience.css";

type WelcomeExperienceProps = {
  onEnter: () => void;
};

function IntroShield() {
  return <svg className="intro-crest" viewBox="0 0 72 82" fill="none" aria-hidden="true">
    <path d="M36 4 64 14v22c0 19-10.2 31.7-28 42C18.2 67.7 8 55 8 36V14L36 4Z" fill="url(#crest-fill)" stroke="url(#crest-stroke)" strokeWidth="1.5"/>
    <path d="M36 14 55 21v15c0 13.7-6.4 23.4-19 31-12.6-7.6-19-17.3-19-31V21l19-7Z" fill="rgba(4,13,25,.52)" stroke="rgba(123,206,255,.34)"/>
    <path d="m26 39 7 7 14-16" stroke="#d8fbff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="crest-fill" x1="13" y1="8" x2="59" y2="74" gradientUnits="userSpaceOnUse"><stop stopColor="#2479B5" stopOpacity=".56"/><stop offset="1" stopColor="#0C1A31" stopOpacity=".92"/></linearGradient>
      <linearGradient id="crest-stroke" x1="11" y1="11" x2="62" y2="72" gradientUnits="userSpaceOnUse"><stop stopColor="#A8F5FF"/><stop offset=".48" stopColor="#53B7FF"/><stop offset="1" stopColor="#527BFF"/></linearGradient>
    </defs>
  </svg>;
}

function SignalCore() {
  return <div className="signal-core-visual" role="img" aria-label="Animated PRAHARI secure startup sequence">
    <div className="signal-grid" aria-hidden="true" />
    <div className="signal-radar" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    <div className="signal-orbit signal-orbit--one" aria-hidden="true"><i/></div>
    <div className="signal-orbit signal-orbit--two" aria-hidden="true"><i/></div>
    <div className="signal-orbit signal-orbit--three" aria-hidden="true"><i/></div>
    <div className="signal-core-halo" aria-hidden="true" />
    <div className="signal-core-emblem"><IntroShield/></div>
    <div className="signal-readout signal-readout--left" aria-hidden="true"><span>SECURE BOOT</span><b>READY</b></div>
    <div className="signal-readout signal-readout--right" aria-hidden="true"><span>THREAT FIELD</span><b>ONLINE</b></div>
    <div className="signal-loading"><span className="signal-loading-label"><i/> INITIALIZING SECURE WORKSPACE</span><span className="signal-loading-track"><i/></span></div>
  </div>;
}

export default function WelcomeExperience({ onEnter }: WelcomeExperienceProps) {
  const [isEntering, setIsEntering] = useState(false);
  const enterTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (enterTimeoutRef.current !== null) window.clearTimeout(enterTimeoutRef.current);
  }, []);

  function beginEntry() {
    if (isEntering) return;
    setIsEntering(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    enterTimeoutRef.current = window.setTimeout(onEnter, reducedMotion ? 0 : 720);
  }

  return <main className={`welcome-experience${isEntering ? " is-entering" : ""}`}>
    <div className="welcome-stars" aria-hidden="true"/>
    <div className="welcome-ambient welcome-ambient--one" aria-hidden="true"/>
    <div className="welcome-ambient welcome-ambient--two" aria-hidden="true"/>
    <header className="intro-header">
      <a className="intro-brand" href="#welcome" aria-label="PRAHARI welcome">
        <span className="intro-brand-mark"><IntroShield/></span>
        <span><strong>PRAHARI</strong><small>THREAT INTELLIGENCE</small></span>
      </a>
      <div className="intro-header-status"><i/> LOCAL DEMO ENVIRONMENT</div>
      <button className="intro-skip" type="button" onClick={onEnter}>Skip intro <span aria-hidden="true">↗</span></button>
    </header>

    <section className="intro-content" id="welcome">
      <div className="intro-copy-block">
        <p className="intro-eyebrow"><span/> SECURITY, WITH FORESIGHT <span/></p>
        <h1 className="intro-wordmark" aria-label="PRAHARI">
          {[..."PRAHARI"].map((letter, index) => <span aria-hidden="true" key={`${letter}-${index}`} style={{ "--letter-index": index } as CSSProperties}>{letter}</span>)}
        </h1>
        <p className="intro-tagline">AI-DRIVEN THREAT INTELLIGENCE</p>
        <p className="intro-lede">See the signal. Understand what’s next.</p>
        <div className="intro-actions">
          <button className="intro-primary" type="button" onClick={beginEntry} disabled={isEntering} aria-busy={isEntering}>
            <span className="entry-button-label">{isEntering ? "Opening workspace" : "Enter workspace"}</span>
            <span className="entry-button-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        <div className="intro-capabilities" aria-label="Platform principles">
          <span><i className="capability-icon capability-icon--blue">01</i>Evidence-led</span>
          <span><i className="capability-icon capability-icon--cyan">02</i>Privacy-aware</span>
          <span><i className="capability-icon capability-icon--violet">03</i>Human-guided</span>
        </div>
      </div>
      <div className="intro-visual"><SignalCore/></div>
    </section>

    <footer className="intro-footer"><span><i/> PRAHARI ANALYST WORKSPACE</span><span>Forecasts are illustrative in this local prototype</span><span>01 <b/> 01</span></footer>
  </main>;
}
