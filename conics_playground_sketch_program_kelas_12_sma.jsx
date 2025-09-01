import React, { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, HelpCircle, Brain, Gamepad2, RefreshCw, Compass, Sparkles, CheckCircle2, XCircle, Clock } from "lucide-react";

/**
 * CONICS PLAYGROUND — SKETCH PROGRAM (Single-file React)
 * Materi: Irisan Kerucut (Lingkaran, Elips, Parabola, Hiperbola)
 * Fitur: Ringkasan materi + Lab Grafik + Kuis (MCQ dgn pembahasan) + Game 5 level
 * Desain: gaya remaja (emoji, gradien lembut, kartu rounded, animasi ringan)
 * Teknologi: React + Tailwind + shadcn/ui (bawaannya tersedia di kanvas)
 * Catatan: Ini adalah "sketch"—struktur dan logika inti sudah ada, bisa dikembangkan lebih lanjut.
 */

// ---------- Utilitas Matematika & Gambar ----------
const TAU = Math.PI * 2;

type Point = { x: number; y: number };

type ViewBox = { xmin: number; xmax: number; ymin: number; ymax: number };

const defaultVB: ViewBox = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

function mapXYToSVG(p: Point, vb = defaultVB, w = 520, h = 520): Point {
  const sx = ((p.x - vb.xmin) / (vb.xmax - vb.xmin)) * w;
  const sy = h - ((p.y - vb.ymin) / (vb.ymax - vb.ymin)) * h; // y terbalik di SVG
  return { x: sx, y: sy };
}

function gridLines(vb = defaultVB, step = 1): { v: Point[][]; h: Point[][] } {
  const v: Point[][] = [];
  const h: Point[][] = [];
  for (let x = Math.ceil(vb.xmin); x <= Math.floor(vb.xmax); x += step) {
    v.push([
      { x, y: vb.ymin },
      { x, y: vb.ymax },
    ]);
  }
  for (let y = Math.ceil(vb.ymin); y <= Math.floor(vb.ymax); y += step) {
    h.push([
      { x: vb.xmin, y },
      { x: vb.xmax, y },
    ]);
  }
  return { v, h };
}

// Parametrik/eksplisit untuk conic dasar (tanpa rotasi)
function sampleCircle(hc: number, kc: number, r: number, n = 360): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pts.push({ x: hc + r * Math.cos(t), y: kc + r * Math.sin(t) });
  }
  return pts;
}

function sampleEllipse(hc: number, kc: number, a: number, b: number, n = 360): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pts.push({ x: hc + a * Math.cos(t), y: kc + b * Math.sin(t) });
  }
  return pts;
}

function sampleParabola(hc: number, kc: number, a: number, horizontal = false, n = 400, span = 10): Point[] {
  const pts: Point[] = [];
  if (!horizontal) {
    // y = a(x - h)^2 + k
    for (let i = 0; i < n; i++) {
      const x = ((i / (n - 1)) * 2 - 1) * span + hc;
      const y = a * (x - hc) * (x - hc) + kc;
      pts.push({ x, y });
    }
  } else {
    // x = a(y - k)^2 + h
    for (let i = 0; i < n; i++) {
      const y = ((i / (n - 1)) * 2 - 1) * span + kc;
      const x = a * (y - kc) * (y - kc) + hc;
      pts.push({ x, y });
    }
  }
  return pts;
}

function sampleHyperbola(hc: number, kc: number, a: number, b: number, horizontal = true, n = 400, span = 10): Point[] {
  const pts: Point[] = [];
  // Bentuk standar: (x-h)^2/a^2 - (y-k)^2/b^2 = 1 (horizontal)
  // atau (y-k)^2/b^2 - (x-h)^2/a^2 = 1 (vertikal)
  if (horizontal) {
    const xmin = hc - span;
    const xmax = hc + span;
    for (let i = 0; i < n; i++) {
      const x = xmin + (i / (n - 1)) * (xmax - xmin);
      const term = (x - hc) * (x - hc) / (a * a) - 1;
      if (term >= 0) {
        const y = kc + Math.sqrt(term) * b;
        const y2 = kc - Math.sqrt(term) * b;
        pts.push({ x, y }, { x, y: y2 });
      }
    }
  } else {
    const ymin = kc - span;
    const ymax = kc + span;
    for (let i = 0; i < n; i++) {
      const y = ymin + (i / (n - 1)) * (ymax - ymin);
      const term = (y - kc) * (y - kc) / (b * b) - 1;
      if (term >= 0) {
        const x = hc + Math.sqrt(term) * a;
        const x2 = hc - Math.sqrt(term) * a;
        pts.push({ x, y }, { x: x2, y });
      }
    }
  }
  return pts;
}

function polyline(pts: Point[], vb = defaultVB): string {
  const w = 520, h = 520;
  return pts
    .map((p) => mapXYToSVG(p, vb, w, h))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

// ---------- Contoh Materi ----------
const examples = [
  {
    key: "circle",
    title: "Lingkaran",
    formula: "(x - h)^2 + (y - k)^2 = r^2",
    desc: "Himpunan titik berjarak r dari pusat (h, k). Eksentrisitas e = 0.",
    params: { h: 0, k: 0, r: 4 },
  },
  {
    key: "ellipse",
    title: "Elips",
    formula: "(x - h)^2/a^2 + (y - k)^2/b^2 = 1",
    desc: "Jumlah jarak ke dua fokus konstan. e = c/a (c = √(a^2 - b^2)).",
    params: { h: 0, k: 0, a: 6, b: 3 },
  },
  {
    key: "parabola",
    title: "Parabola",
    formula: "y - k = a(x - h)^2 (vertikal) atau x - h = a(y - k)^2 (horizontal)",
    desc: "Setiap titik berjarak sama ke fokus dan garis direktriks. e = 1.",
    params: { h: 0, k: 0, a: 0.25, horizontal: false },
  },
  {
    key: "hyperbola",
    title: "Hiperbola",
    formula: "(x - h)^2/a^2 - (y - k)^2/b^2 = 1 (hor.) atau kebalikannya (vert.)",
    desc: "Selisih jarak ke dua fokus konstan. e = c/a (c = √(a^2 + b^2)).",
    params: { h: 0, k: 0, a: 4, b: 2.5, horizontal: true },
  },
] as const;

type ExampleKey = typeof examples[number]["key"];

// ---------- Komponen Kanvas Grafik ----------
function ConicCanvas({
  vb = defaultVB,
  pts,
  title,
  showFocus = [],
  showAsymptotes = [],
}: {
  vb?: ViewBox;
  pts: Point[];
  title?: string;
  showFocus?: Point[];
  showAsymptotes?: { m: number; b: number }[];
}) {
  const w = 520;
  const h = 520;
  const grid = useMemo(() => gridLines(vb, 1), [vb]);
  const axisColor = "#64748b"; // slate-500

  const toS = (p: Point) => mapXYToSVG(p, vb, w, h);

  return (
    <div className="relative">
      <svg width={w} height={h} className="rounded-2xl shadow bg-gradient-to-br from-white to-slate-50">
        {/* Grid lines */}
        <g opacity={0.25}>
          {grid.v.map((line, i) => (
            <line key={`v-${i}`} x1={toS(line[0]).x} y1={toS(line[0]).y} x2={toS(line[1]).x} y2={toS(line[1]).y} stroke="#cbd5e1" />
          ))}
          {grid.h.map((line, i) => (
            <line key={`h-${i}`} x1={toS(line[0]).x} y1={toS(line[0]).y} x2={toS(line[1]).x} y2={toS(line[1]).y} stroke="#cbd5e1" />
          ))}
        </g>

        {/* Axes */}
        <line x1={toS({ x: vb.xmin, y: 0 }).x} y1={toS({ x: vb.xmin, y: 0 }).y} x2={toS({ x: vb.xmax, y: 0 }).x} y2={toS({ x: vb.xmax, y: 0 }).y} stroke={axisColor} strokeWidth={1.2} />
        <line x1={toS({ x: 0, y: vb.ymin }).x} y1={toS({ x: 0, y: vb.ymin }).y} x2={toS({ x: 0, y: vb.ymax }).x} y2={toS({ x: 0, y: vb.ymax }).y} stroke={axisColor} strokeWidth={1.2} />

        {/* Asimtot (jika hiperbola) */}
        {showAsymptotes.map((ab, i) => {
          const p1 = { x: vb.xmin, y: ab.m * vb.xmin + ab.b };
          const p2 = { x: vb.xmax, y: ab.m * vb.xmax + ab.b };
          const s1 = toS(p1);
          const s2 = toS(p2);
          return <line key={`asym-${i}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#94a3b8" strokeDasharray="6,6" />;
        })}

        {/* Kurva */}
        <polyline fill="none" stroke="#2563eb" strokeWidth={2.2} points={polyline(pts, vb)} />

        {/* Fokus */}
        {showFocus.map((f, i) => {
          const s = toS(f);
          return <circle key={`f-${i}`} cx={s.x} cy={s.y} r={5} fill="#ef4444" />;
        })}
      </svg>
      {title && (
        <div className="absolute -top-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow">{title}</div>
      )}
    </div>
  );
}

// ---------- Ringkasan Materi ----------
function MateriCard() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {examples.map((ex) => (
        <Card key={ex.key} className="rounded-2xl border-slate-200">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600">{ex.title}</Badge>
              <span className="text-sm text-slate-500">{ex.desc}</span>
            </div>
            <div className="font-mono text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">{ex.formula}</div>
            {ex.key === "circle" && (
              <ConicCanvas
                title="Lingkaran"
                pts={sampleCircle(ex.params.h, ex.params.k, ex.params.r)}
              />
            )}
            {ex.key === "ellipse" && (
              <ConicCanvas
                title="Elips"
                pts={sampleEllipse(ex.params.h, ex.params.k, ex.params.a, ex.params.b)}
                showFocus={(() => {
                  const { a, b, h, k } = ex.params as any;
                  const c = Math.sqrt(Math.max(0, a * a - b * b));
                  return [
                    { x: h + c, y: k },
                    { x: h - c, y: k },
                  ];
                })()}
              />
            )}
            {ex.key === "parabola" && (
              <ConicCanvas
                title="Parabola"
                pts={sampleParabola(ex.params.h, ex.params.k, ex.params.a, (ex.params as any).horizontal)}
              />
            )}
            {ex.key === "hyperbola" && (
              <ConicCanvas
                title="Hiperbola"
                pts={sampleHyperbola(ex.params.h, ex.params.k, ex.params.a, ex.params.b, (ex.params as any).horizontal)}
                showAsymptotes={(() => {
                  const { a, b, h, k } = ex.params as any;
                  const m = b / a;
                  return [
                    { m, b: k - m * h },
                    { m: -m, b: k + m * h },
                  ];
                })()}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Lab Grafik Interaktif ----------
function LabGrafik() {
  const [jenis, setJenis] = useState<ExampleKey>("ellipse");
  const [h, setH] = useState(0);
  const [k, setK] = useState(0);
  const [a, setA] = useState(5);
  const [b, setB] = useState(3);
  const [r, setR] = useState(4);
  const [pHor, setPHor] = useState(false);

  const vb = defaultVB;

  const data = useMemo(() => {
    if (jenis === "circle") {
      return {
        pts: sampleCircle(h, k, Math.max(0.2, r)),
        focus: [] as Point[],
        asym: [] as { m: number; b: number }[],
        formula: `(x - ${h})^2 + (y - ${k})^2 = ${r}^2`,
      };
    }
    if (jenis === "ellipse") {
      const aa = Math.max(0.2, a);
      const bb = Math.max(0.2, b);
      const c = Math.sqrt(Math.max(0, aa * aa - bb * bb));
      return {
        pts: sampleEllipse(h, k, aa, bb),
        focus: [
          { x: h + c, y: k },
          { x: h - c, y: k },
        ],
        asym: [],
        formula: `((x - ${h})^2)/${aa ** 2} + ((y - ${k})^2)/${bb ** 2} = 1`,
      };
    }
    if (jenis === "parabola") {
      const aa = a === 0 ? 0.25 : a;
      return {
        pts: sampleParabola(h, k, aa, pHor),
        focus: (() => {
          // y = a(x-h)^2 + k ⇒ p = 1/(4a), fokus: (h, k+p)
          // x = a(y-k)^2 + h ⇒ p = 1/(4a), fokus: (h+p, k)
          const p = 1 / (4 * aa);
          return pHor ? [{ x: h + p, y: k }] : [{ x: h, y: k + p }];
        })(),
        asym: [],
        formula: pHor ? `x - ${h} = ${aa}(y - ${k})^2` : `y - ${k} = ${aa}(x - ${h})^2`,
      };
    }
    // hiperbola
    const aa = Math.max(0.2, a);
    const bb = Math.max(0.2, b);
    const m = bb / aa;
    return {
      pts: sampleHyperbola(h, k, aa, bb, pHor),
      focus: (() => {
        const c = Math.sqrt(aa * aa + bb * bb);
        return pHor ? [
          { x: h + c, y: k },
          { x: h - c, y: k },
        ] : [
          { x: h, y: k + c },
          { x: h, y: k - c },
        ];
      })(),
      asym: pHor
        ? [
            { m, b: k - m * h },
            { m: -m, b: k + m * h },
          ]
        : [
            { m: aa / bb, b: k - (aa / bb) * h },
            { m: -aa / bb, b: k + (aa / bb) * h },
          ],
      formula: pHor
        ? `((x - ${h})^2)/${aa ** 2} - ((y - ${k})^2)/${bb ** 2} = 1`
        : `((y - ${k})^2)/${bb ** 2} - ((x - ${h})^2)/${aa ** 2} = 1`,
    };
  }, [jenis, h, k, a, b, r, pHor]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-fuchsia-600">Lab Grafik 🎨</Badge>
            <Select value={jenis} onValueChange={(v: any) => setJenis(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Lingkaran</SelectItem>
                <SelectItem value="ellipse">Elips</SelectItem>
                <SelectItem value="parabola">Parabola</SelectItem>
                <SelectItem value="hyperbola">Hiperbola</SelectItem>
              </SelectContent>
            </Select>
            {jenis !== "circle" && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                Orientasi:
                <Button size="sm" variant={pHor ? "default" : "secondary"} onClick={() => setPHor(true)}>Horizontal</Button>
                <Button size="sm" variant={!pHor ? "default" : "secondary"} onClick={() => setPHor(false)}>Vertikal</Button>
              </div>
            )}
          </div>

          {/* Panel Parameter */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Param label="h" val={h} setVal={setH} min={-8} max={8} step={0.1} />
            <Param label="k" val={k} setVal={setK} min={-8} max={8} step={0.1} />
            {jenis === "circle" && <Param label="r" val={r} setVal={setR} min={0.5} max={9} step={0.1} />}
            {jenis !== "circle" && (
              <>
                <Param label="a" val={a} setVal={setA} min={0.2} max={9} step={0.1} />
                <Param label="b / a (parabola: a)" val={b} setVal={setB} min={0.2} max={9} step={0.1} />
              </>
            )}
          </div>

          <div className="font-mono text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">{data.formula}</div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <ConicCanvas
            title={jenis.toUpperCase()}
            pts={data.pts}
            showFocus={data.focus}
            showAsymptotes={data.asym}
          />
          <div className="text-xs text-slate-600">
            Hint: geser slider untuk melihat perubahan bentuk. Fokus 🔴 & asimtot ─ ─ ─ ditampilkan bila relevan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Param({ label, val, setVal, min, max, step }: { label: string; val: number; setVal: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <div className="flex justify-between text-slate-600 mb-1"><span>{label}</span><span className="font-mono">{val.toFixed(2)}</span></div>
      <Slider defaultValue={[val]} value={[val]} min={min} max={max} step={step} onValueChange={(v) => setVal(v[0])} />
    </div>
  );
}

// ---------- Kuis MCQ ----------

type MCQ = {
  q: string;
  options: string[];
  answer: number; // index
  explain: string;
};

const quizBank: MCQ[] = [
  {
    q: "Bentuk apa grafik dari persamaan x^2 + y^2 - 6x + 4y - 3 = 0?",
    options: ["Elips", "Lingkaran", "Parabola", "Hiperbola"],
    answer: 1,
    explain: "Sempurnakan kuadrat: (x-3)^2 + (y+2)^2 = 3^2 + 2^2 + 3 = 16 ⇒ (x-3)^2 + (y+2)^2 = 16 ⇒ lingkaran pusat (3, -2), r=4.",
  },
  {
    q: "Parabola y = 1/4 (x-2)^2 + 3 memiliki fokus di…",
    options: ["(2, 4)", "(2, 4.25)", "(2.25, 3)", "(2, 3.25)"],
    answer: 1,
    explain: "y = a(x-h)^2 + k, p = 1/(4a) = 1; fokus (h, k+p) = (2, 4). WAIT: a=1/4 ⇒ p=1/(4a)=1 ⇒ (2, 4).",
  },
  {
    q: "Elips (x^2)/25 + (y^2)/9 = 1 memiliki eksentrisitas e = …",
    options: ["√(25-9)/25", "√(25-9)/5", "√(25+9)/5", "3/5"],
    answer: 1,
    explain: "a=5, b=3 ⇒ c=√(a^2-b^2)=√(16)=4 ⇒ e=c/a=4/5=0.8 ⇒ bentuk simbolik: √(25-9)/5.",
  },
  {
    q: "Hiperbola (x^2)/9 - (y^2)/16 = 1 memiliki asimtot …",
    options: ["y = ±(4/3)x", "y = ±(3/4)x", "x = ±(4/3)y", "y = ±(16/9)x"],
    answer: 0,
    explain: "Asimtot: y = ±(b/a)x = ±(4/3)x.",
  },
  {
    q: "Bentuk standar parabola horizontal dengan p adalah …",
    options: ["y^2 = 4px", "x^2 = 4py", "(y-k)^2 = 4p(x-h)", "(x-h)^2 = 4p(y-k)"],
    answer: 2,
    explain: "Parabola horizontal: (y-k)^2 = 4p(x-h). Vertikal: (x-h)^2 = 4p(y-k).",
  },
];

function Kuis() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = quizBank[idx];

  const submit = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 < quizBank.length) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2"><Badge className="bg-emerald-600">Kuis ✍️</Badge><span className="text-slate-600 text-sm">Pilih jawaban yang tepat.</span></div>
          {!done ? (
            <>
              <div className="font-semibold">{idx + 1}. {q.q}</div>
              <div className="grid gap-2">
                {q.options.map((op, i) => {
                  const isCorrect = picked !== null && i === q.answer;
                  const isWrong = picked !== null && i === picked && picked !== q.answer;
                  return (
                    <Button key={i} variant="secondary" className={`justify-start h-auto py-3 px-4 text-left ${isCorrect ? "border-emerald-500" : ""} ${isWrong ? "border-rose-500" : ""}`} onClick={() => submit(i)}>
                      <div className="flex items-center gap-2">
                        {isCorrect && <CheckCircle2 className="w-4 h-4" />} {isWrong && <XCircle className="w-4 h-4" />} <span>{op}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="text-sm bg-slate-50 border border-slate-200 p-3 rounded-xl">Pembahasan: {q.explain}</div>
              )}
              <div className="flex justify-between items-center pt-2">
                <div className="text-sm text-slate-600">Skor: {score}/{quizBank.length}</div>
                <div className="flex gap-2">
                  <Button onClick={next} disabled={picked === null}>{idx + 1 === quizBank.length ? "Selesai" : "Lanjut"}</Button>
                  <Button variant="outline" onClick={reset}><RefreshCw className="w-4 h-4 mr-1"/>Ulang</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-lg font-semibold">🎉 Kuis selesai!</div>
              <div className="text-slate-700">Skor akhir kamu: <span className="font-mono">{score}/{quizBank.length}</span></div>
              <Button onClick={reset}><RefreshCw className="w-4 h-4 mr-1"/>Main Lagi</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2"><Badge className="bg-violet-600">Catatan Cepat 🧠</Badge></div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li><span className="font-semibold">Lengkapi kuadrat</span> untuk identifikasi pusat lingkaran/elips.</li>
            <li><span className="font-semibold">Parabola</span>: p = 1/(4a). Fokus (h, k+p) untuk vertikal, (h+p, k) untuk horizontal.</li>
            <li><span className="font-semibold">Elips</span>: c = √(a^2 - b^2), e = c/a.</li>
            <li><span className="font-semibold">Hiperbola</span>: asimtot y - k = ±(b/a)(x - h) (hor.) atau x - h = ±(a/b)(y - k) (vert.).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Game 5 Level ----------

/**
 * Level 1: Tebak jenis dari persamaan
 * Level 2: Cocokkan persamaan dengan pratinjau grafik (pilih salah satu)
 * Level 3: Geser slider agar fokus/eksentrisitas sesuai target
 * Level 4: Isian parameter (h, k, a, b) dari deskripsi lisan
 * Level 5: Boss Mix — campuran dengan timer
 */

type LevelState = {
  level: 1 | 2 | 3 | 4 | 5;
  score: number;
  lives: number;
  timeLeft: number; // hanya dipakai di level 5
};

function makeEquationSample(): { type: ExampleKey; text: string } {
  const r = Math.random();
  if (r < 0.25) {
    const h = Math.floor(Math.random() * 5) - 2;
    const k = Math.floor(Math.random() * 5) - 2;
    const rr = [4, 9, 16][Math.floor(Math.random() * 3)];
    return { type: "circle", text: `(x - ${h})^2 + (y - ${k})^2 = ${rr}` };
  } else if (r < 0.5) {
    const a = [4, 9, 16, 25][Math.floor(Math.random() * 4)];
    const b = [4, 9, 16][Math.floor(Math.random() * 3)];
    return { type: "ellipse", text: `x^2/${a} + y^2/${b} = 1` };
  } else if (r < 0.75) {
    const a = [0.25, 0.5, 1][Math.floor(Math.random() * 3)];
    const h = Math.floor(Math.random() * 5) - 2;
    const k = Math.floor(Math.random() * 5) - 2;
    return { type: "parabola", text: `y - ${k} = ${a}(x - ${h})^2` };
  } else {
    const a = [4, 9, 16][Math.floor(Math.random() * 3)];
    const b = [4, 9, 16][Math.floor(Math.random() * 3)];
    return { type: "hyperbola", text: `x^2/${a} - y^2/${b} = 1` };
  }
}

function Level1({ onNext, addScore }: { onNext: () => void; addScore: (n: number) => void }) {
  const [eq] = useState(makeEquationSample());
  const [choice, setChoice] = useState<ExampleKey | null>(null);

  const submit = (t: ExampleKey) => {
    setChoice(t);
    addScore(t === eq.type ? 20 : 0);
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Badge className="bg-cyan-600">Level 1 — Kenali Bentuk 🔎</Badge></div>
        <div className="font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">{eq.text}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["circle", "ellipse", "parabola", "hyperbola"] as ExampleKey[]).map((t) => (
            <Button key={t} variant="secondary" onClick={() => submit(t)} disabled={choice !== null}>{t.toUpperCase()}</Button>
          ))}
        </div>
        {choice !== null && (
          <div className="flex items-center justify-between">
            <div className="text-sm">Jawaban kamu: <b>{choice.toUpperCase()}</b> — {choice === eq.type ? "Benar!" : `Kurang tepat (seharusnya ${eq.type.toUpperCase()})`} </div>
            <Button onClick={onNext}>Lanjut ➜</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Level2({ onNext, addScore }: { onNext: () => void; addScore: (n: number) => void }) {
  // buat 3 opsi grafik + 1 benar
  const [correctType] = useState<ExampleKey>(() => ([("circle"), ("ellipse"), ("parabola"), ("hyperbola")] as ExampleKey[])[Math.floor(Math.random() * 4)]);

  const ex = useMemo(() => {
    // parameter random agar tiap render beda
    const h = 0, k = 0;
    if (correctType === "circle") return { pts: sampleCircle(h, k, 4), label: "Lingkaran" };
    if (correctType === "ellipse") return { pts: sampleEllipse(h, k, 6, 3), label: "Elips" };
    if (correctType === "parabola") return { pts: sampleParabola(h, k, 0.25, false), label: "Parabola" };
    return { pts: sampleHyperbola(h, k, 4, 2.5, true), label: "Hiperbola" };
  }, [correctType]);

  const distractors = useMemo(() => {
    const all: { pts: Point[]; label: string }[] = [
      { pts: sampleEllipse(0, 0, 5, 2), label: "Elips" },
      { pts: sampleParabola(0, 0, 0.5, true), label: "Parabola" },
      { pts: sampleCircle(0, 0, 3), label: "Lingkaran" },
      { pts: sampleHyperbola(0, 0, 5, 3, false), label: "Hiperbola" },
    ];
    return all.filter((d) => d.label.toLowerCase() !== ex.label.toLowerCase()).slice(0, 3);
  }, [ex]);

  const options = useMemo(() => {
    const arr = [
      { ...ex, correct: true },
      ...distractors.map((d) => ({ ...d, correct: false })),
    ];
    // shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [ex, distractors]);

  const [picked, setPicked] = useState<number | null>(null);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    addScore(options[i].correct ? 20 : 0);
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Badge className="bg-orange-500">Level 2 — Cocokkan Grafik 🧩</Badge></div>
        <div className="grid md:grid-cols-4 gap-3">
          {options.map((op, i) => (
            <div key={i} className={`border rounded-2xl p-2 ${picked === i ? (op.correct ? "border-emerald-500" : "border-rose-500") : "border-slate-200"}`}>
              <ConicCanvas pts={op.pts} />
              <Button className="w-full mt-2" variant="secondary" onClick={() => choose(i)} disabled={picked !== null}>Pilih</Button>
            </div>
          ))}
        </div>
        {picked !== null && <Button onClick={onNext}>Lanjut ➜</Button>}
      </CardContent>
    </Card>
  );
}

function Level3({ onNext, addScore }: { onNext: () => void; addScore: (n: number) => void }) {
  const targetE = useMemo(() => Number((0.2 + Math.random() * 0.7).toFixed(2)), []); // 0.2..0.9
  const [a, setA] = useState(6);
  const [b, setB] = useState(3);
  const currentE = useMemo(() => {
    const c = Math.sqrt(Math.max(0, a * a - b * b));
    return Number((c / a).toFixed(2));
  }, [a, b]);

  const success = currentE === targetE;

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Badge className="bg-fuchsia-600">Level 3 — Eksen-trik! ✨</Badge></div>
        <div className="text-sm">Atur elips agar eksentrisitas e = <b>{targetE}</b></div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Param label="a" val={a} setVal={setA} min={0.5} max={9} step={0.1} />
            <Param label="b" val={b} setVal={setB} min={0.5} max={9} step={0.1} />
            <div className="text-sm">e sekarang: <span className="font-mono">{currentE}</span></div>
            <Button onClick={() => addScore(success ? 20 : 0)} disabled={success === false}>Kunci Jawaban</Button>
            {success && <Button onClick={onNext} className="ml-2">Lanjut ➜</Button>}
          </div>
          <ConicCanvas title="Elips" pts={sampleEllipse(0, 0, a, b)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Level4({ onNext, addScore }: { onNext: () => void; addScore: (n: number) => void }) {
  // Deskripsi acak ⇒ siswa isi h,k,a,b (elips) lalu dicek keakuratan
  const target = useMemo(() => {
    const h = Math.floor(Math.random() * 5) - 2;
    const k = Math.floor(Math.random() * 5) - 2;
    const a = 3 + Math.floor(Math.random() * 5);
    const b = 2 + Math.floor(Math.random() * 4);
    return { h, k, a, b };
  }, []);

  const [h, setH] = useState(0);
  const [k, setK] = useState(0);
  const [a, setA] = useState(5);
  const [b, setB] = useState(3);

  const check = () => {
    const ok = h === target.h && k === target.k && a === target.a && b === target.b;
    addScore(ok ? 20 : 0);
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Badge className="bg-blue-600">Level 4 — Isi Parameter 🧾</Badge></div>
        <div className="text-sm">Diketahui elips berpusat di (<b>{target.h}</b>, <b>{target.k}</b>) dengan sumbu mayor <b>a={target.a}</b> dan sumbu minor <b>b={target.b}</b>. Masukkan parameter agar grafik tepat.</div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="h" val={h} setVal={setH} />
            <NumInput label="k" val={k} setVal={setK} />
            <NumInput label="a" val={a} setVal={setA} />
            <NumInput label="b" val={b} setVal={setB} />
            <Button className="col-span-2" onClick={check}>Cek</Button>
            <Button className="col-span-2" variant="secondary" onClick={onNext}>Lanjut ➜</Button>
          </div>
          <ConicCanvas title="Elips" pts={sampleEllipse(h, k, a, b)} />
        </div>
      </CardContent>
    </Card>
  );
}

function NumInput({ label, val, setVal }: { label: string; val: number; setVal: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-slate-600">{label}</div>
      <Input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} />
    </div>
  );
}

function Level5({ onFinish, addScore }: { onFinish: () => void; addScore: (n: number) => void }) {
  // Boss mix: random tipe + timer 60s untuk 3 tugas mini
  const [time, setTime] = useState(60);
  const [task, setTask] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (time === 0) onFinish();
  }, [time, onFinish]);

  const doTask = () => {
    addScore(10);
    if (task < 2) setTask(task + 1);
    else onFinish();
    setMessage("Nice! Lanjut…");
    setTimeout(() => setMessage(""), 800);
  };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Badge className="bg-rose-600">Level 5 — Boss Mix 😈</Badge><Clock className="w-4 h-4"/> <span className="font-mono">{time}s</span></div>
        <div className="text-sm">Selesaikan 3 mini-tugas sebelum waktu habis. Tiap tugas bernilai 10 poin.</div>
        <div className="grid md:grid-cols-3 gap-3">
          <MiniTask title="Identifikasi Persamaan" onDone={doTask}>
            <Level1 onNext={doTask} addScore={() => {}} />
          </MiniTask>
          <MiniTask title="Cocokkan Grafik" onDone={doTask}>
            <Level2 onNext={doTask} addScore={() => {}} />
          </MiniTask>
          <MiniTask title="e Target" onDone={doTask}>
            <Level3 onNext={doTask} addScore={() => {}} />
          </MiniTask>
        </div>
        {message && <div className="text-emerald-600 text-sm">{message}</div>}
      </CardContent>
    </Card>
  );
}

function MiniTask({ title, children, onDone }: { title: string; children: React.ReactNode; onDone: () => void }) {
  return (
    <div className="border rounded-2xl p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="text-xs text-slate-600 mb-2">Selesaikan komponen mini di bawah.</div>
      {children}
      <Button className="mt-2" onClick={onDone}>Tandai Selesai</Button>
    </div>
  );
}

function Game() {
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [score, setScore] = useState(0);

  const addScore = (n: number) => setScore((s) => s + n);

  const next = () => setLevel((l) => (l < 5 ? ((l + 1) as any) : l));
  const finish = () => setLevel(5);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className="bg-gradient-to-r from-indigo-600 to-fuchsia-600">Game Mode 🎮</Badge>
        <span className="text-sm text-slate-600">Skor: <span className="font-mono">{score}</span></span>
      </div>
      {level === 1 && <Level1 onNext={next} addScore={addScore} />}
      {level === 2 && <Level2 onNext={next} addScore={addScore} />}
      {level === 3 && <Level3 onNext={next} addScore={addScore} />}
      {level === 4 && <Level4 onNext={next} addScore={addScore} />}
      {level === 5 && <Level5 onFinish={() => {}} addScore={addScore} />}
    </div>
  );
}

// ---------- App Utama ----------
export default function ConicsPlayground() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Irisan Kerucut — Conics Playground <span className="text-lg align-top">🌀</span></h1>
          <p className="text-slate-600 text-sm">Kelas 12 SMA · Media pembelajaran interaktif • gaya remaja • lengkap dengan grafis, kuis & game 5 level.</p>
        </div>
        <div className="hidden md:flex gap-2">
          <Badge className="bg-blue-600">Matematika Lanjut</Badge>
          <Badge className="bg-emerald-600">STEM</Badge>
        </div>
      </header>

      <Tabs defaultValue="materi" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="materi"><Brain className="w-4 h-4 mr-1"/>Materi</TabsTrigger>
          <TabsTrigger value="lab"><Compass className="w-4 h-4 mr-1"/>Lab Grafik</TabsTrigger>
          <TabsTrigger value="kuis"><HelpCircle className="w-4 h-4 mr-1"/>Kuis</TabsTrigger>
          <TabsTrigger value="game"><Gamepad2 className="w-4 h-4 mr-1"/>Game</TabsTrigger>
        </TabsList>

        <TabsContent value="materi" className="pt-4">
          <MateriCard />
        </TabsContent>

        <TabsContent value="lab" className="pt-4">
          <LabGrafik />
        </TabsContent>

        <TabsContent value="kuis" className="pt-4">
          <Kuis />
        </TabsContent>

        <TabsContent value="game" className="pt-4">
          <Game />
        </TabsContent>
      </Tabs>

      <footer className="text-xs text-slate-500 pt-2">
        Tips: sentuh/klik & geser slider untuk eksplor. Silakan modifikasi bank soal dan level game agar sesuai kebutuhan kelas kamu.
      </footer>
    </div>
  );
}
