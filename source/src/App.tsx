import { useEffect, useMemo, useState } from "react";
import { PulseBackground } from "./components/ui/PulseBackground";
import { QuizScreen } from "./features/quiz/QuizScreen";
import { DreamBuilder } from "./screens/DreamBuilder";

type Screen = "home" | "log" | "board" | "pipeline" | "me" | "contacts" | "coach" | "quiz" | "dream";
type ContactType = "prospect" | "recruit" | "client";

type Session = {
  name: string;
  pin: string;
  level: string;
  agentCode: string;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  stage: string;
  score: number;
  lastContact: string;
  followUp: string;
};

type LogFields = {
  calls: number;
  texts: number;
  appts: number;
  done: number;
  recruits: number;
  fnas: number;
  personalPts: number;
  fieldTraining: number;
};

const logo = "/pulsenow-logo-transparent-cropped.png";
const sessionKey = "pulsenow_react_session";
const contactsKey = "pulsenow_react_contacts";
const logKey = "pulsenow_react_log";
const substepsKey = "pulsenow_react_substeps";

const defaultLog: LogFields = {
  calls: 0,
  texts: 0,
  appts: 0,
  done: 0,
  recruits: 0,
  fnas: 0,
  personalPts: 0,
  fieldTraining: 0
};

const seedContacts: Contact[] = [
  { id: "c1", name: "Jordan Miles", phone: "8015550144", type: "prospect", stage: "Uncontacted Team Prospects", score: 6, lastContact: "", followUp: "today" },
  { id: "c2", name: "Taylor Reed", phone: "8015550199", type: "recruit", stage: "Pre-Passing the Test", score: 6, lastContact: "", followUp: "" },
  { id: "c3", name: "Alex Carter", phone: "8015550121", type: "client", stage: "FNA", score: 5, lastContact: "2026-05-10", followUp: "overdue" }
];

const salesStages = [
  "Uncontacted Team Prospects",
  "Prospect Set With A 1st Presentation",
  "FNA",
  "Application Signed",
  "Needs In Business Processing",
  "Approved - Delivery Needed",
  "Commission Paid/Complete",
  "Completed and In Force",
  "No Response",
  "Do Not Call"
];

const recruitStages = [
  "Prospect",
  "Hesitant/Follow-Up",
  "Pre-Passing the Test",
  "Post Passing (Licensing)",
  "Company Set-Up",
  "Company Trainings",
  "License Coordinator Bonus Paid",
  "Became a Net License",
  "Suspect/No Response"
];

const recruitSubsteps: Record<string, string[]> = {
  "Pre-Passing the Test": ["Sign AMA", "Schedule test date", "Buy materials", "Give/show access to videos", "Complete study courses", "Send pre-test email/text"],
  "Post Passing (Licensing)": ["Send next steps email", "Celebration/Reward", "Apply to state with license on NIPR", "Verify state background check", "Schedule fingerprints", "Complete fingerprints", "Get approved license", "Explain 15 hours of trainings"],
  "Company Set-Up": ["Create password", "Company Launch", "Sign additional agreement", "MANAGER ACTION: Sign off on Agent Agreement", "Create company account", "Explain E&O and Platform Fee", "Set up Direct Deposit", "AML Course"],
  "Company Trainings": ["Nationwide Training", "Get appointed with Nationwide", "LTC Training", "490 State Annuity Course", "E&O Screenshot uploaded", "License Screenshot uploaded", "LICENSING COORDINATOR ACTION: Confirm completion"]
};

function loadJson<T>(key: string, fallback: T): T {
  const raw = sessionStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function calcPoints(log: LogFields) {
  return Math.floor((log.calls + log.texts) / 10) + log.recruits + log.fnas;
}

function tierFor(points: number) {
  if (points === 0) return "No Timer";
  if (points < 4) return "Some Timer";
  if (points < 11) return "Part Timer";
  if (points < 21) return "Full Timer";
  return "All-the-Timer";
}

function App() {
  const [session, setSession] = useState<Session | null>(() => loadJson<Session | null>(sessionKey, null));
  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [contacts, setContacts] = useState<Contact[]>(() => loadJson<Contact[]>(contactsKey, seedContacts));
  const [log, setLog] = useState<LogFields>(() => loadJson<LogFields>(logKey, defaultLog));
  const [pipelineType, setPipelineType] = useState<"sales" | "recruit">("sales");
  const [selectedRecruit, setSelectedRecruit] = useState<Contact | null>(null);
  const [substeps, setSubsteps] = useState<Record<string, boolean>>(() => loadJson<Record<string, boolean>>(substepsKey, {}));
  const [coach, setCoach] = useState<string[]>(["Ask me what to do next. I will use your log, Power List, and pipeline."]);

  const points = calcPoints(log);
  const tier = tierFor(points);
  const powerList = useMemo(() => {
    return contacts
      .filter((contact) => contact.phone)
      .slice()
      .sort((a, b) => {
        const aBoost = a.followUp === "overdue" || a.followUp === "today" ? 50 : 0;
        const bBoost = b.followUp === "overdue" || b.followUp === "today" ? 50 : 0;
        return b.score + bBoost - (a.score + aBoost);
      })
      .slice(0, 10);
  }, [contacts]);

  useEffect(() => {
    sessionStorage.setItem(contactsKey, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    sessionStorage.setItem(logKey, JSON.stringify(log));
  }, [log]);

  useEffect(() => {
    sessionStorage.setItem(substepsKey, JSON.stringify(substeps));
  }, [substeps]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  function login() {
    if (pin.trim().length !== 4) return;
    const next = { name: name.trim() || "Demo Agent", pin, level: "TA", agentCode: "DEMO" };
    sessionStorage.setItem(sessionKey, JSON.stringify(next));
    setSession(next);
  }

  function logout() {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
  }

  function updateLog(key: keyof LogFields, delta: number) {
    setLog((current) => {
      const value = Math.max(0, current[key] + delta);
      return Object.assign({}, current, { [key]: value });
    });
  }

  function moveContact(id: string, stage: string) {
    setContacts((current) => current.map((contact) => (contact.id === id ? Object.assign({}, contact, { stage }) : contact)));
  }

  function toggleSubstep(contact: Contact, index: number) {
    const key = contact.id + "::" + contact.stage + "::" + index;
    setSubsteps((current) => Object.assign({}, current, { [key]: current[key] !== true }));
  }

  function sendCoach(prompt: string) {
    const lower = prompt.toLowerCase();
    let reply = "Today you have " + points + " points and " + (log.calls + log.texts) + " contacts. Do one focused contact block, then work the top Power List names.";
    if (lower.indexOf("call") >= 0) reply = powerList.length ? "Call " + powerList.slice(0, 3).map((item) => item.name).join(", ") + " first. Log each outcome before moving on." : "Add contacts with phone numbers first, then the Power List can rank them.";
    if (lower.indexOf("all") >= 0 || lower.indexOf("timer") >= 0) reply = "You need " + Math.max(0, 21 - points) + " more points for All-the-Timer. The fastest path is contacts to the next 10, plus recruits and FNAs.";
    setCoach((current) => current.concat(["You: " + prompt, "Coach: " + reply]));
  }

  if (!session) {
    return (
      <PulseBackground route="ambient" className="app-shell">
        <main className="login-page">
          <section className="login-card pulse-glass-card">
            <img className="login-logo" src={logo} alt="Pulsenow" />
            <p className="eyebrow">Know who to call. Right now.</p>
            <h1>Welcome back</h1>
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sam Knickerbocker" />
            </label>
            <label>
              4-digit PIN
              <input value={pin} onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))} inputMode="numeric" placeholder="1234" />
            </label>
            <button className="primary" onClick={login}>Enter Pulsenow</button>
          </section>
        </main>
      </PulseBackground>
    );
  }

  return (
    <PulseBackground route={screen} className="app-shell">
      <header className="topbar">
        <button onClick={() => setDrawer(true)}>Menu</button>
        <img src={logo} alt="Pulsenow" />
        <button>Alerts</button>
      </header>

      {drawer ? (
        <aside className="drawer">
          <button className="drawer-bg" onClick={() => setDrawer(false)} />
          <nav className="drawer-panel">
            <img src={logo} alt="Pulsenow" />
            {(["contacts", "coach", "quiz", "dream"] as Screen[]).map((item) => (
              <button key={item} onClick={() => { setScreen(item); setDrawer(false); }}>{item}</button>
            ))}
            <button onClick={logout}>Sign out</button>
          </nav>
        </aside>
      ) : null}

      <main className="screen">
        {screen === "home" ? <Home session={session} log={log} points={points} tier={tier} powerList={powerList} setScreen={setScreen} /> : null}
        {screen === "log" ? <LogScreen log={log} points={points} tier={tier} updateLog={updateLog} /> : null}
        {screen === "board" ? <BoardScreen session={session} points={points} tier={tier} contacts={contacts} /> : null}
        {screen === "pipeline" ? (
          <PipelineScreen
            contacts={contacts}
            pipelineType={pipelineType}
            selectedRecruit={selectedRecruit}
            substeps={substeps}
            setPipelineType={setPipelineType}
            moveContact={moveContact}
            setSelectedRecruit={setSelectedRecruit}
            toggleSubstep={toggleSubstep}
          />
        ) : null}
        {screen === "me" ? <MeScreen session={session} log={log} points={points} tier={tier} /> : null}
        {screen === "contacts" ? <ContactsScreen contacts={contacts} setContacts={setContacts} /> : null}
        {screen === "coach" ? <CoachScreen messages={coach} sendCoach={sendCoach} /> : null}
        {screen === "quiz" ? <QuizScreen session={session} /> : null}
        {screen === "dream" ? <DreamBuilder session={session} /> : null}
      </main>

      <nav className="bottom-nav">
        {(["home", "log", "board", "pipeline", "me"] as Screen[]).map((item) => (
          <button className={screen === item ? "active" : ""} key={item} onClick={() => setScreen(item)}>{item}</button>
        ))}
      </nav>
    </PulseBackground>
  );
}

function Home(props: { session: Session; log: LogFields; points: number; tier: string; powerList: Contact[]; setScreen: (screen: Screen) => void }) {
  const contacts = props.log.calls + props.log.texts;
  return (
    <>
      <section className="hero-card">
        <div className="avatar">{props.session.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <p className="eyebrow">Fuel Your Legacy</p>
          <h2>{props.session.name}</h2>
          <p className="muted">{props.tier} · {contacts} contacts · {props.points} pts</p>
        </div>
      </section>
      <section className="card">
        <div className="section-head"><h2>This Week's Goals</h2><button>Edit</button></div>
        <Goal label="Contacts" value={contacts} target={120} />
        <Goal label="Appts Set" value={props.log.appts} target={12} />
        <Goal label="Points" value={props.points} target={21} />
      </section>
      <section className="card accent">
        <p className="eyebrow">Today's Challenge</p>
        <h2>{props.points < 21 ? "Push toward All-the-Timer" : "Protect your lead"}</h2>
        <p className="muted">{Math.max(0, 21 - props.points)} more points to hit the top weekly tier.</p>
        <button className="primary" onClick={() => props.setScreen("log")}>Log activity</button>
      </section>
      <section className="card">
        <div className="section-head"><h2>Personal Profile</h2><button onClick={() => props.setScreen("quiz")}>Open</button></div>
        <p className="muted">Complete Working Genius and Four Tendencies to unlock coaching that fits your style.</p>
      </section>
      <section className="card accent">
        <div className="section-head"><h2>Dream Life Builder</h2><button onClick={() => props.setScreen("dream")}>Open</button></div>
        <p className="muted">Turn typed text, audio, or a Wispr transcript into a printable Dream Life Map.</p>
      </section>
      <section className="card">
        <div className="section-head"><h2>Power List</h2><button onClick={() => props.setScreen("contacts")}>Open CRM</button></div>
        {props.powerList.slice(0, 3).map((contact, index) => <PowerRow contact={contact} rank={index + 1} key={contact.id} />)}
      </section>
    </>
  );
}

function Goal(props: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((props.value / props.target) * 100));
  return (
    <div className="goal">
      <div><strong>{props.label}</strong><span>{props.value} / {props.target}</span></div>
      <div className="bar"><span style={{ width: pct + "%" }} /></div>
    </div>
  );
}

function PowerRow(props: { contact: Contact; rank: number }) {
  return (
    <div className="list-row power-card">
      <b>{props.rank}</b>
      <div><strong>{props.contact.name}</strong><p>{props.contact.score}/7 qualifiers · {props.contact.stage}</p></div>
      <a href={"tel:" + props.contact.phone}>Call</a>
    </div>
  );
}

function LogScreen(props: { log: LogFields; points: number; tier: string; updateLog: (key: keyof LogFields, delta: number) => void }) {
  const fields: [keyof LogFields, string][] = [["calls", "Calls"], ["texts", "Texts"], ["appts", "1st Appts Set"], ["done", "1st Appts Done"], ["recruits", "New Partners"], ["fnas", "FNAs"], ["fieldTraining", "Field Training"], ["personalPts", "Personal Net Points"]];
  return (
    <>
      <section className="score-card"><h1>{props.points}</h1><p>{props.tier}</p></section>
      <section className="card">
        {fields.map((field) => (
          <div className="field-row" key={field[0]}>
            <div><strong>{field[1]}</strong><p>Tracked for goals and coaching</p></div>
            <div className="stepper"><button onClick={() => props.updateLog(field[0], -1)}>-</button><span>{props.log[field[0]]}</span><button onClick={() => props.updateLog(field[0], 1)}>+</button></div>
          </div>
        ))}
      </section>
    </>
  );
}

function BoardScreen(props: { session: Session; points: number; tier: string; contacts: Contact[] }) {
  const rows = [
    { name: "Sam Knickerbocker", pts: 28, tier: "All-the-Timer" },
    { name: props.session.name, pts: props.points, tier: props.tier },
    { name: "Kaden Murdock", pts: 19, tier: "Full Timer" },
    { name: "Mia Johnson", pts: 13, tier: "Full Timer" }
  ].sort((a, b) => b.pts - a.pts);
  return (
    <>
      <section className="card"><p className="eyebrow">Board</p><h2>Leaderboard</h2></section>
      {rows.map((row, index) => <div className="leader-row" key={row.name}><b>{index + 1}</b><div><strong>{row.name}</strong><p>{row.tier}</p></div><strong>{row.pts} pts</strong></div>)}
      <section className="card"><h2>48 Hour Contact Sprint</h2><p className="muted">{props.contacts.length} CRM contacts loaded</p></section>
    </>
  );
}

function PipelineScreen(props: {
  contacts: Contact[];
  pipelineType: "sales" | "recruit";
  selectedRecruit: Contact | null;
  substeps: Record<string, boolean>;
  setPipelineType: (type: "sales" | "recruit") => void;
  moveContact: (id: string, stage: string) => void;
  setSelectedRecruit: (contact: Contact) => void;
  toggleSubstep: (contact: Contact, index: number) => void;
}) {
  const stages = props.pipelineType === "recruit" ? recruitStages : salesStages;
  const cards = props.contacts.filter((contact) => props.pipelineType === "recruit" ? contact.type === "recruit" : contact.type !== "recruit");
  const selectedRecruit = props.selectedRecruit;
  const selectedSteps = selectedRecruit ? recruitSubsteps[selectedRecruit.stage] || [] : [];
  return (
    <>
      <section className="card">
        <p className="eyebrow">Pipeline</p>
        <h2>Kanban Board</h2>
        <div className="segmented"><button className={props.pipelineType === "sales" ? "active" : ""} onClick={() => props.setPipelineType("sales")}>Sales</button><button className={props.pipelineType === "recruit" ? "active" : ""} onClick={() => props.setPipelineType("recruit")}>Recruit</button></div>
      </section>
      <section className="kanban">
        {stages.map((stage) => (
          <article className="column" key={stage}>
            <h3>{stage}</h3>
            {cards.filter((contact) => contact.stage === stage || (stages.indexOf(contact.stage) < 0 && stages[0] === stage)).map((contact) => (
              <div className="mini-card" key={contact.id}>
                <strong>{contact.name}</strong>
                <p>{contact.score}/7 qualifiers</p>
                <select value={stages.indexOf(contact.stage) >= 0 ? contact.stage : stages[0]} onChange={(event) => props.moveContact(contact.id, event.target.value)}>
                  {stages.map((item) => <option key={item}>{item}</option>)}
                </select>
                {props.pipelineType === "recruit" ? <button onClick={() => props.setSelectedRecruit(contact)}>Checklist</button> : null}
              </div>
            ))}
          </article>
        ))}
      </section>
      {selectedRecruit ? <section className="card"><h2>{selectedRecruit.name}</h2>{selectedSteps.length ? selectedSteps.map((step, index) => {
        const key = selectedRecruit.id + "::" + selectedRecruit.stage + "::" + index;
        return <button className={"check-row " + (props.substeps[key] ? "done" : "")} key={step} onClick={() => props.toggleSubstep(selectedRecruit, index)}>{props.substeps[key] ? "Done" : "Open"} · {step}</button>;
      }) : <p className="muted">No checklist items for this stage.</p>}</section> : null}
    </>
  );
}

function MeScreen(props: { session: Session; log: LogFields; points: number; tier: string }) {
  return (
    <>
      <section className="hero-card"><div className="avatar">{props.session.name.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">Me</p><h2>{props.session.name}</h2><p className="muted">{props.session.level} · {props.session.agentCode}</p></div></section>
      <section className="card"><h2>Career Track</h2><Goal label="New Recruits" value={props.log.recruits} target={3} /><Goal label="Field Training" value={props.log.fieldTraining} target={3} /><Goal label="Personal Net Points" value={props.log.personalPts} target={20000} /></section>
      <section className="card"><h2>Stats This Week</h2><div className="stats"><b>{props.points} pts</b><b>{props.tier}</b><b>{props.log.calls + props.log.texts} contacts</b></div></section>
    </>
  );
}

function ContactsScreen(props: { contacts: Contact[]; setContacts: (contacts: Contact[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    if (!draft.trim()) return;
    const contact: Contact = { id: "c" + Date.now(), name: draft, phone: "", type: "prospect", stage: salesStages[0], score: 0, lastContact: "", followUp: "" };
    props.setContacts([contact].concat(props.contacts));
    setDraft("");
  }
  return (
    <>
      <section className="card"><p className="eyebrow">CRM</p><h2>Contacts</h2><div className="coach-input"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add contact" /><button onClick={add}>Add</button></div></section>
      {props.contacts.map((contact) => <div className="list-row" key={contact.id}><b>{contact.score}/7</b><div><strong>{contact.name}</strong><p>{contact.type} · {contact.stage}</p></div><a href={"tel:" + contact.phone}>Call</a></div>)}
    </>
  );
}

function CoachScreen(props: { messages: string[]; sendCoach: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  function send(text: string) {
    props.sendCoach(text);
    setPrompt("");
  }
  return (
    <>
      <section className="card"><p className="eyebrow">AI Coach</p><h2>Tactical Coaching</h2><div className="segmented"><button onClick={() => send("Who should I call today?")}>Who to call</button><button onClick={() => send("What do I need for All-the-Timer?")}>All-the-Timer</button></div></section>
      <section className="chat">{props.messages.map((message, index) => <div className="chat-bubble" key={index}>{message}</div>)}</section>
      <section className="card"><div className="coach-input"><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask for coaching..." /><button onClick={() => send(prompt)}>Send</button></div></section>
    </>
  );
}

export default App;
