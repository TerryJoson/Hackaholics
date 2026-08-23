import React, { useState } from "react";
import "./App.css";
import ImageUpload from "./components/ImageUpload";

const API_BASE = "http://localhost:8000";

const STEPS = [
  "Upload",
  "Detect Anatomy",
  "Measure & Compare",
  "Implant Match",
  "What-If",
  "AI Copilot",
  "Report",
];

const IMPLANT_SIZES = [1, 2, 3, 4, 5, 6];

export default function App() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [age, setAge] = useState(62);
  const [sex, setSex] = useState("Male");
  const [loading, setLoading] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [plateauWidth, setPlateauWidth] = useState(66);
  const [matchResult, setMatchResult] = useState(null);
  const [whatIfSize, setWhatIfSize] = useState(null);
  const [whatIfResult, setWhatIfResult] = useState(null);

  const [chatLog, setChatLog] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  function onFileSelected(f) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function runAnalysis() {
    if (!file) {
      setStep(1);
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("age", age);
    form.append("sex", sex);
    const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
    const data = await res.json();
    setAnalysis(data);
    setLoading(false);
    setStep(1);
  }

  async function runImplantMatch() {
    const form = new FormData();
    form.append("plateau_width", plateauWidth);
    const res = await fetch(`${API_BASE}/api/implant-match`, { method: "POST", body: form });
    setMatchResult(await res.json());
  }

  async function runWhatIf(size) {
    setWhatIfSize(size);
    const form = new FormData();
    form.append("plateau_width", plateauWidth);
    form.append("size", size);
    const res = await fetch(`${API_BASE}/api/whatif`, { method: "POST", body: form });
    setWhatIfResult(await res.json());
  }

  async function askCopilot(q) {
    if (!q) return;
    setChatLog((log) => [...log, { role: "user", text: q }]);
    setAsking(true);
    setQuestion("");

    const context = `Patient: age ${age}, sex ${sex}.
Meniscus thickness (mm): anterior ${analysis?.measurements?.ant}, middle ${analysis?.measurements?.mid}, posterior ${analysis?.measurements?.post}.
Reference population mean/SD: anterior ${analysis?.reference?.ant?.mean}/${analysis?.reference?.ant?.sd}, middle ${analysis?.reference?.mid?.mean}/${analysis?.reference?.mid?.sd}, posterior ${analysis?.reference?.post?.mean}/${analysis?.reference?.post?.sd}.
Estimated tibial plateau width: ${plateauWidth} mm.
Recommended implant: size ${matchResult?.recommended?.size}, match score ${matchResult?.recommended?.score}%.`;

    const form = new FormData();
    form.append("question", q);
    form.append("context", context);
    const res = await fetch(`${API_BASE}/api/copilot`, { method: "POST", body: form });
    const data = await res.json();
    setChatLog((log) => [...log, { role: "ai", text: data.answer }]);
    setAsking(false);
  }

  function zScore(key) {
    if (!analysis) return 0;
    const m = analysis.measurements[key];
    const ref = analysis.reference[key];
    return (m - ref.mean) / ref.sd;
  }

  return (
    <div className="wrap">
      <header>
        <h1>Knee OA AI Assistant</h1>
        <div className="sub">Automated X-ray analysis &amp; implant-size planning</div>
      </header>

      <nav>
        {STEPS.map((s, i) => (
          <button key={s} className={i === step ? "active" : ""} onClick={() => setStep(i)}>
            {i + 1}. {s}
          </button>
        ))}
      </nav>

      <div className="panel">
        {step === 0 && (
          <>
            <h2>1 &middot; Upload Patient Data</h2>
            <div className="grid2">
              <ImageUpload preview={preview} onFileSelected={onFileSelected} />
              <div>
                <div className="field">
                  <label>Age</label>
                  <select value={age} onChange={(e) => setAge(+e.target.value)}>
                    {[45, 50, 55, 60, 62, 65, 70, 75].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Sex</label>
                  <select value={sex} onChange={(e) => setSex(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <button className="primary" onClick={runAnalysis} disabled={loading}>
                  {loading ? "Processing..." : "Process"}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>2 &middot; Automatic Anatomy Detection</h2>
            <p className="desc">
              Overlay comes from backend/mock_model.py — swap in the trained nnU-Net output there when it's ready; nothing else needs to change.
            </p>
            <div className="imgbox">
              {analysis ? (
                <img src={analysis.overlay_image} alt="segmented X-ray" />
              ) : (
                <span>Upload an image in Step 1 first</span>
              )}
            </div>
            <div className="legend">
              <span><i className="dot dot-femur" />Femur</span>
              <span><i className="dot dot-tibia" />Tibia</span>
              <span><i className="dot dot-meniscus" />Meniscus</span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>3 &middot; Measurement &amp; OA Comparison</h2>
            {!analysis ? (
              <p className="desc">Run Step 1 first to see measurements.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Patient (mm)</th>
                    <th>Reference mean</th>
                    <th>±1 SD</th>
                    <th>Read</th>
                  </tr>
                </thead>
                <tbody>
                  {["ant", "mid", "post"].map((k) => (
                    <tr key={k}>
                      <td>{k === "ant" ? "Anterior" : k === "mid" ? "Middle" : "Posterior"}</td>
                      <td>{analysis.measurements[k]}</td>
                      <td>{analysis.reference[k].mean}</td>
                      <td>{analysis.reference[k].sd}</td>
                      <td>
                        <span className={`badge ${Math.abs(zScore(k)) <= 2 ? "ok" : "warn"}`}>
                          {Math.abs(zScore(k)) <= 2 ? "within range" : "outside range"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2>4 &middot; Implant Matching</h2>
            <div className="field">
              <label>
                Estimated tibial plateau width — <span className="rangeval">{plateauWidth}</span> mm
              </label>
              <input
                type="range"
                min="55"
                max="75"
                step="0.5"
                value={plateauWidth}
                onChange={(e) => setPlateauWidth(+e.target.value)}
                onMouseUp={runImplantMatch}
                onTouchEnd={runImplantMatch}
              />
            </div>
            <button className="secondary" onClick={runImplantMatch}>
              Compute match
            </button>
            {matchResult && (
              <div className="scorecard">
                <div className="pct">
                  Size {matchResult.recommended.size} &middot; {matchResult.recommended.score}%
                </div>
                <div className="sizegrid">
                  {matchResult.all_scores.map((s) => (
                    <div
                      key={s.size}
                      className={`sizebtn ${s.size === matchResult.recommended.size ? "best" : ""}`}
                    >
                      Size {s.size}
                      <br />
                      <span>{s.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2>5 &middot; What-If Analysis</h2>
            <div className="sizegrid">
              {IMPLANT_SIZES.map((s) => (
                <div
                  key={s}
                  className={`sizebtn ${s === whatIfSize ? "selected" : ""}`}
                  onClick={() => runWhatIf(s)}
                >
                  Size {s}
                </div>
              ))}
            </div>
            {whatIfResult && (
              <div className="scorecard">
                <div className="pct">{whatIfResult.score}% match</div>
                <span className={`badge ${whatIfResult.overhang ? "warn" : "ok"}`}>
                  {whatIfResult.overhang ? "⚠ Potential overhang" : "Good geometric fit"}
                </span>
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <h2>6 &middot; AI Copilot</h2>
            <div className="quickq">
              <button onClick={() => askCopilot("Why did you recommend this implant size?")}>
                Why this size?
              </button>
              <button onClick={() => askCopilot("Is the patient's meniscus thickness healthy for their age?")}>
                Is this healthy?
              </button>
            </div>
            <div className="chatlog">
              {chatLog.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  {m.text}
                </div>
              ))}
              {asking && <div className="msg ai">Thinking...</div>}
            </div>
            <div className="chatinput">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askCopilot(question)}
                placeholder="Ask the copilot about this patient..."
              />
              <button className="primary" onClick={() => askCopilot(question)}>
                Ask
              </button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h2>7 &middot; Final Report</h2>
            <div className="reportgrid">
              <div className="card">
                <strong>Patient</strong>
                <br />
                Age {age} &middot; {sex}
              </div>
              {analysis && (
                <div className="card">
                  <strong>Meniscus thickness</strong>
                  <br />
                  A {analysis.measurements.ant} / M {analysis.measurements.mid} / P {analysis.measurements.post} mm
                </div>
              )}
              <div className="card">
                <strong>Plateau width</strong>
                <br />
                {plateauWidth} mm
              </div>
              {matchResult && (
                <div className="card">
                  <strong>Recommended implant</strong>
                  <br />
                  Size {matchResult.recommended.size} &middot; {matchResult.recommended.score}%
                </div>
              )}
            </div>
            <button className="primary" style={{ marginTop: 16 }} onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          </>
        )}
      </div>

      <div className="footernav">
        <button className="secondary" onClick={() => setStep(Math.max(0, step - 1))}>
          &larr; Back
        </button>
        <button className="primary" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}>
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
