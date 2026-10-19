import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import TelemetryUpload, { type AnalysisResult, type UploadResult } from "./TelemetryUpload";
import WelcomeExperience from "./WelcomeExperience";
import "./Dashboard.css";

type Theme = "dark" | "light";
type ChatMessage = { role: "assistant" | "user"; text: string };
type NavItem = { id: string; label: string; icon: string };

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "telemetry-import", label: "Telemetry", icon: "pulse" },
  { id: "forecasts", label: "Forecasts", icon: "trend" },
  { id: "investigation", label: "Investigations", icon: "search" },
  { id: "privacy", label: "Privacy & learning", icon: "nodes" },
];

const initialMessages: ChatMessage[] = [
  { role: "assistant", text: "Hi, I’m the PRAHARI security guide. I can explain common security concepts and help you understand this demo dashboard. I don’t have access to a live model or your telemetry." },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "grid": return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case "pulse": return <svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>;
    case "trend": return <svg {...common}><path d="m3 17 6-6 4 3 8-9"/><path d="M15 5h6v6"/></svg>;
    case "search": return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5M8 10.8h5.6"/></svg>;
    case "nodes": return <svg {...common}><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m7 7 4 9m6-9-4 9M7 6h10"/></svg>;
    case "sun": return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>;
    case "moon": return <svg {...common}><path d="M20.8 13A8.7 8.7 0 0 1 11 3.2 8.8 8.8 0 1 0 20.8 13Z"/></svg>;
    case "bell": return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4"/></svg>;
    case "shield": return <svg {...common}><path d="m12 2 8 3v6c0 5.2-3.4 8.8-8 11-4.6-2.2-8-5.8-8-11V5l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
    case "send": return <svg {...common}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
    case "close": return <svg {...common}><path d="m18 6-12 12M6 6l12 12"/></svg>;
    case "upload": return <svg {...common}><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z" transform="translate(-1 -1) scale(1.08)"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function NetworkGraph() {
  const links = [[52, 54, 169, 35], [52, 54, 137, 131], [169, 35, 269, 76], [169, 35, 137, 131], [269, 76, 351, 42], [269, 76, 347, 145], [137, 131, 230, 171], [230, 171, 347, 145], [347, 145, 423, 93], [351, 42, 423, 93], [137, 131, 72, 179]];
  const nodes = [{x:52,y:54,label:"edge-01",kind:"normal"},{x:169,y:35,label:"gateway",kind:"normal"},{x:269,y:76,label:"auth-svc",kind:"watch"},{x:351,y:42,label:"api-east",kind:"normal"},{x:137,y:131,label:"workstation",kind:"alert"},{x:230,y:171,label:"db-core",kind:"normal"},{x:347,y:145,label:"dns-02",kind:"normal"},{x:423,y:93,label:"edge-03",kind:"normal"},{x:72,y:179,label:"sensor-7",kind:"normal"}];
  return <svg className="network-graph" viewBox="0 0 475 210" role="img" aria-label="Illustrative network connection graph">
    <defs><pattern id="graphDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".16"/></pattern></defs>
    <rect width="475" height="210" fill="url(#graphDots)"/>
    {links.map(([x1,y1,x2,y2], index) => <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} className={index === 4 || index === 6 ? "graph-link graph-link--active" : "graph-link"}/>)}
    {nodes.map((node) => <g key={node.label} className={`graph-node graph-node--${node.kind}`} transform={`translate(${node.x} ${node.y})`}><circle className="graph-node-halo" r={node.kind === "alert" ? 15 : 12}/><circle className="graph-node-core" r={node.kind === "alert" ? 6 : 4.5}/><title>{node.label} · illustrative topology</title></g>)}
  </svg>;
}

function ActivityChart() {
  const bars = [22, 30, 25, 44, 34, 50, 39, 30, 43, 57, 39, 46, 34, 62, 42, 50, 36, 68, 46, 56, 43, 74, 52, 63, 48, 80, 60, 68, 54, 90, 63, 72, 58, 84, 62, 76, 56, 92, 68, 78, 59, 72, 52, 82, 62, 72, 50, 65];
  return <div className="activity-chart" aria-label="Illustrative network activity spark chart"><div className="chart-grid"><i/><i/><i/><i/></div><div className="chart-bars">{bars.map((height, index) => <span key={index} style={{ "--bar-height": `${height}%`, "--bar-delay": `${index * 12}ms` } as CSSProperties}/>)}</div></div>;
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

export default function Dashboard() {
  const [showIntro, setShowIntro] = useState(() => {
    try { return window.localStorage.getItem("prahari-welcome-dismissed-v1") !== "true"; }
    catch { return false; }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    try { return window.localStorage.getItem("prahari-theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const [activeNav, setActiveNav] = useState("overview");
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [visibleWidgets, setVisibleWidgets] = useState({ activity: true, network: true, forecast: true });
  const [forecastOpen, setForecastOpen] = useState(false);

  function enterWorkspace() {
    try { window.localStorage.setItem("prahari-welcome-dismissed-v1", "true"); } catch { /* Storage may be blocked. */ }
    setShowIntro(false);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("prahari-theme", theme); } catch { /* Storage may be blocked. */ }
  }, [theme]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setActiveNav(entry.target.id || "overview");
      });
    }, { rootMargin: "-25% 0px -60% 0px" });
    document.querySelectorAll("[data-nav-section]").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const statItems = useMemo(() => [
    { label: "Records analyzed", value: formatNumber(analysis?.records_analyzed ?? upload?.rows), note: analysis ? "Parsed from uploaded CSV" : "Awaiting authorized telemetry", icon: "pulse", tone: "cyan" },
    { label: "Unique source hosts", value: formatNumber(analysis?.unique_sources), note: analysis ? "Observed in this dataset" : "Available after analysis", icon: "nodes", tone: "blue" },
    { label: "Destination hosts", value: formatNumber(analysis?.unique_destinations), note: analysis ? "Observed in this dataset" : "Available after analysis", icon: "grid", tone: "violet" },
    { label: "Bytes observed", value: formatNumber(analysis?.total_bytes), note: analysis ? "Sum of reported byte field" : "Available after analysis", icon: "trend", tone: "amber" },
  ], [analysis, upload]);

  function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) return;
    const lower = prompt.toLowerCase();
    let answer = "This assistant is a local demo guide and is not connected to a live AI model. I can still explain dashboard concepts: telemetry is uploaded data, forecasts need a validated model, and confidence should be interpreted with its evidence.";
    if (lower.includes("confidence") || lower.includes("forecast")) answer = "A confidence score is meaningful only when calibrated against validated data. This prototype does not produce live attack predictions; the forecast card is explicitly labeled as an illustrative scenario.";
    else if (lower.includes("federat") || lower.includes("privacy") || lower.includes("data")) answer = "Federated learning keeps raw records on participating clients while sharing model updates. This demo does not train a federated model; telemetry CSVs are sent to the configured local API for parsing.";
    else if (lower.includes("alert") || lower.includes("investig")) answer = "Start an investigation by checking the source, destination, timestamp, protocol, and related records. Correlate independent evidence before treating an event as a confirmed incident.";
    setMessages((current) => [...current, { role: "user", text: prompt }, { role: "assistant", text: answer }]);
    setChatInput("");
  }

  if (showIntro) return <WelcomeExperience onEnter={enterWorkspace} />;

  return <div className="pra-hari" data-theme={theme}>
    <aside className="side-rail">
      <a className="brand-lockup" href="#overview" aria-label="PRAHARI home"><span className="brand-symbol"><Icon name="shield" size={22}/></span><span><strong>PRAHARI</strong><small>THREAT INTELLIGENCE</small></span></a>
      <div className="workspace-wrap"><button className="workspace-switch" type="button" aria-expanded={showWorkspaceMenu} onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}><span className="workspace-avatar">N</span><span><b>Northstar SOC</b><small>Workspace</small></span><span className="chevron">⌄</span></button>{showWorkspaceMenu && <div className="rail-popover workspace-menu"><strong>Current workspace</strong><span className="workspace-option"><i/> Northstar SOC <small>Local demo</small></span><p>Workspace switching is not connected in this prototype.</p></div>}</div>
      <p className="rail-label">WORKSPACE</p>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map((item) => <a key={item.id} href={`#${item.id}`} className={activeNav === item.id ? "active" : ""} onClick={() => setActiveNav(item.id)}><Icon name={item.icon}/><span>{item.label}</span>{item.id === "investigation" && <i className="nav-count">3</i>}</a>)}</nav>
      <div className="rail-spacer"/>
      <div className="privacy-mini"><span className="privacy-mini-icon"><Icon name="shield" size={16}/></span><div><b>Privacy-first</b><small>Local workspace</small></div><span className="online-dot"/></div>
      <div className="profile-wrap"><button className="profile-button" type="button" aria-expanded={showProfileMenu} onClick={() => setShowProfileMenu(!showProfileMenu)}><span className="profile-avatar">AM</span><span><b>Alex Morgan</b><small>Security analyst</small></span><span className="profile-more">···</span></button>{showProfileMenu && <div className="rail-popover profile-menu"><strong>Alex Morgan</strong><span>Security analyst · Local demo</span><button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} size={15}/> Switch to {theme === "dark" ? "light" : "dark"} mode</button><p>Account settings are not connected in this prototype.</p></div>}</div>
    </aside>

    <main className="dashboard-main" id="overview">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <b>Overview</b></div><div className="topbar-controls"><span className="environment-pill"><i/> LOCAL DEMO</span><button className="intro-replay-button" type="button" onClick={() => setShowIntro(true)}>Welcome intro</button><div className="notification-wrap"><button className="icon-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications(!showNotifications)}><Icon name="bell"/><i className="notification-dot"/></button>{showNotifications && <div className="notification-menu"><div className="notification-heading"><strong>Notifications</strong><span>Demo</span></div><div className="notification-item"><i className="severity-medium"/><span><b>Telemetry workspace ready</b><small>Import a CSV to see dataset statistics.</small></span></div><div className="notification-item"><i className="severity-low"/><span><b>Forecast model not connected</b><small>Illustrative scenarios are not predictions.</small></span></div><button type="button" className="notification-action" onClick={() => { setShowNotifications(false); document.getElementById("telemetry-import")?.scrollIntoView({ behavior: "smooth" }); }}>Go to telemetry import <Icon name="arrow" size={14}/></button></div>}</div><button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"} size={16}/><span>{theme === "dark" ? "Light" : "Dark"}</span></button><div className="customize-wrap"><button className="button-secondary" type="button" onClick={() => setShowCustomize(!showCustomize)}><Icon name="settings" size={15}/> Customize</button>{showCustomize && <div className="customize-menu"><strong>Dashboard widgets</strong>{Object.entries(visibleWidgets).map(([key, enabled]) => <label key={key}><input type="checkbox" checked={enabled} onChange={() => setVisibleWidgets((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))}/><span>{key[0].toUpperCase() + key.slice(1)}</span></label>)}</div>}</div></div></header>

      <section className="page-heading" data-nav-section><div><p className="overline">MONDAY, OCTOBER 19, 2026 <span>·</span> SECURITY OPERATIONS</p><h1>Good morning, Alex <span className="wave">✳</span></h1><p className="page-subtitle">Here’s your network security posture at a glance.</p></div><button className="button-primary" onClick={() => document.getElementById("telemetry-import")?.scrollIntoView({ behavior: "smooth" })}><Icon name="upload" size={16}/> Import telemetry</button></section>

      <section className="status-banner" aria-label="System status"><div className="status-banner-icon"><Icon name="shield" size={20}/></div><div className="status-copy"><b>Workspace ready for telemetry</b><span>Upload a network dataset to populate evidence-based analytics. Forecasts below are illustrative until a validated model is connected.</span></div><span className="status-chip"><i/> API integration available</span></section>

      <section className="stat-grid" aria-label="Telemetry metrics">{statItems.map((item) => <article className={`stat-card stat-${item.tone}`} key={item.label}><div className="stat-card-top"><span>{item.label}</span><i><Icon name={item.icon} size={17}/></i></div><strong>{item.value}</strong><small>{item.note}</small></article>)}</section>

      {analysis?.risk_assessment && <section className={`surface risk-assessment risk-${analysis.risk_assessment.level}`} aria-labelledby="risk-assessment-title">
        <div className="section-header"><div><p className="section-kicker">UPLOADED DATA · FIXED-RULE TRIAGE</p><h2 id="risk-assessment-title">Risk indicators</h2></div><span className="risk-level-badge">{analysis.risk_assessment.level.replaceAll("_", " ")}</span></div>
        <div className="risk-score-row"><div className="risk-score"><strong>{analysis.risk_assessment.score ?? "—"}</strong><span>{analysis.risk_assessment.score === null ? "NO SCORE" : "TRIAGE / 100"}</span></div><div className="risk-summary"><b>{analysis.risk_assessment.score === null ? "Insufficient supported telemetry" : `Triage score ${analysis.risk_assessment.score} / 100`}</b><p>{analysis.risk_assessment.score === null ? "Add recognized network fields such as source/destination IP, authentication outcome, destination port, or byte count." : `${analysis.risk_assessment.indicators.length} evidence indicator(s) found in ${analysis.records_analyzed.toLocaleString()} records.`}</p><div className="risk-coverage"><span>Signal coverage</span><b>{analysis.risk_assessment.signal_coverage_percent}%</b><i><span style={{ width: `${analysis.risk_assessment.signal_coverage_percent}%` }}/></i></div></div></div>
        <div className="risk-evidence-list">{analysis.risk_assessment.indicators.length ? analysis.risk_assessment.indicators.map((indicator) => <article className="risk-evidence" key={indicator.key}><span className={`risk-severity risk-severity--${indicator.severity}`}/><div><div className="risk-evidence-heading"><b>{indicator.title}</b><span>+{indicator.score_contribution} points</span></div><p>{indicator.evidence}</p>{indicator.affected_hosts.length > 0 && <small>Affected source(s): {indicator.affected_hosts.join(", ")}</small>}</div></article>) : <p className="risk-no-evidence">No configured indicators matched this file. This does not establish that the network is safe.</p>}</div>
        {analysis.risk_assessment.top_hosts.length > 0 && <div className="risk-hosts"><b>Sources appearing in indicators</b>{analysis.risk_assessment.top_hosts.map((host) => <span key={host.host}>{host.host}<small>{host.indicator_points} pts</small></span>)}</div>}
        <p className="risk-disclaimer">{analysis.risk_assessment.disclaimer}</p>
      </section>}

      <div className="dashboard-grid">
        <section className="surface activity-panel" id="activity" hidden={!visibleWidgets.activity}><div className="section-header"><div><p className="section-kicker">NETWORK OVERVIEW</p><h2>Traffic activity</h2></div><button className="text-button" onClick={() => document.getElementById("telemetry")?.scrollIntoView({ behavior: "smooth" })}>View telemetry <Icon name="arrow" size={15}/></button></div><div className="activity-summary"><div><strong>{analysis ? formatNumber(analysis.records_analyzed) : "—"}</strong><span>events in dataset</span></div><div className="chart-legend"><i/> Uploaded records <span className="chart-period">CSV session</span></div></div><ActivityChart/><div className="chart-axis"><span>Earlier records</span><span>Sequence is illustrative</span><span>Latest records</span></div><p className="chart-disclaimer">This graphic is a decorative preview, not a live time-series chart.</p></section>

        <section className="surface forecast-panel" id="forecasts" data-nav-section hidden={!visibleWidgets.forecast}><div className="section-header"><div><p className="section-kicker">MODEL WORKSPACE</p><h2>Threat outlook</h2></div><span className="demo-label">DEMO SCENARIO</span></div><div className="forecast-empty"><div className="forecast-ring"><span>—</span><small>NO MODEL</small></div><div><b>Forecasting is not connected</b><p>Connect a validated model to generate calibrated risk estimates from telemetry.</p></div></div><div className="scenario-row"><span className="scenario-mark">!</span><div><b>Credential misuse pattern</b><small>Illustrative scenario · not a prediction</small></div><span className="risk-tag">Example</span></div><button className="forecast-detail-button" onClick={() => setForecastOpen(!forecastOpen)} aria-expanded={forecastOpen}>{forecastOpen ? "Hide" : "View"} explanation <span>{forecastOpen ? "−" : "+"}</span></button>{forecastOpen && <div className="forecast-explanation"><b>Evidence trace</b><p>No telemetry evidence is attached to this example. Confidence is intentionally not displayed; a production forecast requires model validation, calibration, and record-level evidence.</p></div>}</section>

        <section className="surface graph-panel" id="telemetry" data-nav-section hidden={!visibleWidgets.network}><div className="section-header"><div><p className="section-kicker">ASSET RELATIONSHIPS</p><h2>Network map</h2></div><span className="map-legend"><i/> Nodes illustrative</span></div><div className="graph-wrap"><NetworkGraph/></div><div className="graph-footer"><span><i className="legend-normal"/>Asset</span><span><i className="legend-watch"/>Needs review</span><button className="text-button" onClick={() => document.getElementById("telemetry-import")?.scrollIntoView({ behavior: "smooth" })}>Load dataset <Icon name="arrow" size={14}/></button></div></section>

        <section className="surface alert-panel" id="investigation" data-nav-section><div className="section-header"><div><p className="section-kicker">REVIEW QUEUE</p><h2>Investigations</h2></div><span className="count-badge">3 open</span></div><div className="alert-list">{[{ title: "Unusual authentication volume", severity: "high", detail: "An example pattern where authentication events rise above the local baseline. Review timestamps, source hosts, and account context before drawing conclusions." }, { title: "Unexpected outbound service", severity: "medium", detail: "An example outbound-traffic review item. Validate the destination, service owner, and change history using authorized telemetry." }, { title: "New device on subnet", severity: "low", detail: "An example asset-inventory review item. Confirm the device identity and whether its presence is expected." }].map((alert) => <div className="alert-entry" key={alert.title}><button className="alert-row" type="button" aria-expanded={selectedAlert === alert.title} onClick={() => setSelectedAlert(selectedAlert === alert.title ? null : alert.title)}><span className={`alert-severity severity-${alert.severity}`}/><span className="alert-row-copy"><b>{alert.title}</b><small>Example alert · evidence required</small></span><span className="alert-time">{selectedAlert === alert.title ? "Close" : "Review"}</span></button>{selectedAlert === alert.title && <p className="alert-detail">{alert.detail}<br/><strong>Demo only:</strong> no underlying alert record is attached.</p>}</div>)}</div><button className="full-width-link" onClick={() => setShowChat(true)}>Ask the security guide <Icon name="arrow" size={15}/></button></section>

        <section className="surface privacy-panel" id="privacy" data-nav-section><div className="section-header"><div><p className="section-kicker">DATA GOVERNANCE</p><h2>Privacy & learning</h2></div><span className="privacy-status"><i/> Local demo</span></div><div className="privacy-illustration"><span><Icon name="shield" size={25}/></span><div className="privacy-orbit orbit-one"/><div className="privacy-orbit orbit-two"/></div><div className="privacy-copy"><b>Federated learning: planned</b><p>No federated training runs in this prototype. CSV data is sent to the configured local API for parsing; no training or model updates occur.</p></div><div className="privacy-foot"><span>Raw data stays local to this prototype</span><button type="button" onClick={() => setShowPrivacyDetails(!showPrivacyDetails)} aria-expanded={showPrivacyDetails}>Learn about data handling <Icon name="arrow" size={13}/></button></div>{showPrivacyDetails && <p className="privacy-detail">When you upload a CSV, the browser sends it to the local PRAHARI API for parsing and basic statistics. This prototype does not persist uploaded datasets or train a model. Only upload data you are authorized to process.</p>}</section>
      </div>

      <section className="surface telemetry-import-panel" id="telemetry-import" data-nav-section><div className="section-header"><div><p className="section-kicker">DATA SOURCE</p><h2>Import network telemetry</h2></div><span className="local-badge"><Icon name="shield" size={14}/> CSV · max 10 MB</span></div><p className="import-description">Select an authorized CSV file. The local API parses a preview and calculates basic statistics. Avoid uploading sensitive production data.</p><TelemetryUpload onUpload={setUpload} onAnalysis={setAnalysis}/></section>

      <footer className="dashboard-footer"><span><Icon name="shield" size={14}/> PRAHARI <i/> SECURITY ANALYTICS PROTOTYPE</span><span>Examples are illustrative. No live attack predictions are generated.</span></footer>
    </main>

    <button className="chat-launcher" type="button" onClick={() => setShowChat(!showChat)} aria-label={showChat ? "Close security guide" : "Open security guide"}><span className="chat-launcher-icon"><span>✦</span></span><span className="chat-launcher-copy"><b>Security guide</b><small>Local demo assistant</small></span><Icon name={showChat ? "close" : "arrow"} size={16}/></button>
    {showChat && <aside className="chat-panel" aria-label="PRAHARI security guide"><header><span className="chat-avatar">✦</span><div><b>PRAHARI guide</b><small><i/> Demo mode · no AI connection</small></div><button aria-label="Close chat" onClick={() => setShowChat(false)}><Icon name="close" size={17}/></button></header><div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={`chat-message chat-${message.role}`}>{message.text}</div>)}</div><div className="suggested-prompts"><button onClick={() => setChatInput("How should I interpret forecast confidence?")}>Explain forecast confidence</button><button onClick={() => setChatInput("How does federated learning protect data?")}>Explain federated learning</button></div><form className="chat-form" onSubmit={sendChat}><input aria-label="Ask a security question" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask a security question…"/><button type="submit" aria-label="Send question" disabled={!chatInput.trim()}><Icon name="send" size={16}/></button></form><p className="chat-note">Demo guidance only. Verify recommendations with your security team.</p></aside>}
  </div>;
}
