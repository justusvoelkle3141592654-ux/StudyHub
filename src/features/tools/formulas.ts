/**
 * Curated formula collection. Only well-established textbook formulas are
 * included; each entry names its symbols so the meaning is unambiguous.
 */
export interface Formula {
  id: string;
  category: FormulaCategory;
  name: { de: string; en: string };
  latex: string;
  /** Symbol legend, e.g. "F: Kraft (N)". */
  legend: { de: string; en: string };
  tags?: string[];
}

export type FormulaCategory = "mechanics" | "energy" | "electricity" | "waves" | "thermo" | "chemistry" | "algebra" | "geometry" | "trigonometry" | "calculus" | "statistics";

export const FORMULA_CATEGORIES: Array<{ id: FormulaCategory; de: string; en: string }> = [
  { id: "mechanics", de: "Mechanik", en: "Mechanics" },
  { id: "energy", de: "Energie und Arbeit", en: "Energy and work" },
  { id: "electricity", de: "Elektrizität", en: "Electricity" },
  { id: "waves", de: "Wellen und Optik", en: "Waves and optics" },
  { id: "thermo", de: "Wärmelehre", en: "Thermodynamics" },
  { id: "chemistry", de: "Chemie", en: "Chemistry" },
  { id: "algebra", de: "Algebra", en: "Algebra" },
  { id: "geometry", de: "Geometrie", en: "Geometry" },
  { id: "trigonometry", de: "Trigonometrie", en: "Trigonometry" },
  { id: "calculus", de: "Analysis", en: "Calculus" },
  { id: "statistics", de: "Statistik", en: "Statistics" },
];

export const FORMULAS: Formula[] = [
  // Mechanics
  { id: "velocity", category: "mechanics", name: { de: "Gleichförmige Bewegung", en: "Uniform motion" }, latex: "v = \\frac{s}{t}", legend: { de: "v: Geschwindigkeit, s: Weg, t: Zeit", en: "v: velocity, s: distance, t: time" } },
  { id: "accel", category: "mechanics", name: { de: "Beschleunigung", en: "Acceleration" }, latex: "a = \\frac{\\Delta v}{\\Delta t}", legend: { de: "a: Beschleunigung, Δv: Geschwindigkeitsänderung, Δt: Zeit", en: "a: acceleration, Δv: change in velocity, Δt: time" } },
  { id: "uniform-accel", category: "mechanics", name: { de: "Gleichmäßig beschleunigte Bewegung", en: "Uniformly accelerated motion" }, latex: "s = v_0 t + \\tfrac{1}{2} a t^2", legend: { de: "s: Weg, v₀: Anfangsgeschwindigkeit, a: Beschleunigung, t: Zeit", en: "s: distance, v₀: initial velocity, a: acceleration, t: time" } },
  { id: "newton2", category: "mechanics", name: { de: "Zweites Newtonsches Gesetz", en: "Newton's second law" }, latex: "F = m \\cdot a", legend: { de: "F: Kraft (N), m: Masse (kg), a: Beschleunigung (m/s²)", en: "F: force (N), m: mass (kg), a: acceleration (m/s²)" } },
  { id: "weight", category: "mechanics", name: { de: "Gewichtskraft", en: "Weight" }, latex: "F_G = m \\cdot g", legend: { de: "m: Masse, g ≈ 9,81 m/s²", en: "m: mass, g ≈ 9.81 m/s²" } },
  { id: "momentum", category: "mechanics", name: { de: "Impuls", en: "Momentum" }, latex: "p = m \\cdot v", legend: { de: "p: Impuls, m: Masse, v: Geschwindigkeit", en: "p: momentum, m: mass, v: velocity" } },
  { id: "friction", category: "mechanics", name: { de: "Reibungskraft", en: "Friction" }, latex: "F_R = \\mu \\cdot F_N", legend: { de: "μ: Reibungszahl, F_N: Normalkraft", en: "μ: coefficient of friction, F_N: normal force" } },
  { id: "hooke", category: "mechanics", name: { de: "Hookesches Gesetz", en: "Hooke's law" }, latex: "F = D \\cdot s", legend: { de: "D: Federkonstante, s: Auslenkung", en: "D: spring constant, s: displacement" } },
  { id: "centripetal", category: "mechanics", name: { de: "Zentripetalkraft", en: "Centripetal force" }, latex: "F_Z = \\frac{m v^2}{r}", legend: { de: "m: Masse, v: Bahngeschwindigkeit, r: Radius", en: "m: mass, v: speed, r: radius" } },
  { id: "gravitation", category: "mechanics", name: { de: "Gravitationsgesetz", en: "Law of gravitation" }, latex: "F = G \\frac{m_1 m_2}{r^2}", legend: { de: "G ≈ 6,674·10⁻¹¹ N·m²/kg², r: Abstand der Massen", en: "G ≈ 6.674·10⁻¹¹ N·m²/kg², r: distance between masses" } },
  { id: "pressure", category: "mechanics", name: { de: "Druck", en: "Pressure" }, latex: "p = \\frac{F}{A}", legend: { de: "p: Druck (Pa), F: Kraft, A: Fläche", en: "p: pressure (Pa), F: force, A: area" } },
  { id: "density", category: "mechanics", name: { de: "Dichte", en: "Density" }, latex: "\\rho = \\frac{m}{V}", legend: { de: "ρ: Dichte, m: Masse, V: Volumen", en: "ρ: density, m: mass, V: volume" } },
  // Energy
  { id: "work", category: "energy", name: { de: "Arbeit", en: "Work" }, latex: "W = F \\cdot s", legend: { de: "W: Arbeit (J), F: Kraft in Wegrichtung, s: Weg", en: "W: work (J), F: force along the path, s: distance" } },
  { id: "kinetic", category: "energy", name: { de: "Kinetische Energie", en: "Kinetic energy" }, latex: "E_{kin} = \\tfrac{1}{2} m v^2", legend: { de: "m: Masse, v: Geschwindigkeit", en: "m: mass, v: velocity" } },
  { id: "potential", category: "energy", name: { de: "Lageenergie", en: "Gravitational potential energy" }, latex: "E_{pot} = m \\cdot g \\cdot h", legend: { de: "m: Masse, g: Fallbeschleunigung, h: Höhe", en: "m: mass, g: gravitational acceleration, h: height" } },
  { id: "spring-energy", category: "energy", name: { de: "Spannenergie", en: "Elastic potential energy" }, latex: "E_{Sp} = \\tfrac{1}{2} D s^2", legend: { de: "D: Federkonstante, s: Auslenkung", en: "D: spring constant, s: displacement" } },
  { id: "power", category: "energy", name: { de: "Leistung", en: "Power" }, latex: "P = \\frac{W}{t}", legend: { de: "P: Leistung (W), W: Arbeit, t: Zeit", en: "P: power (W), W: work, t: time" } },
  { id: "efficiency", category: "energy", name: { de: "Wirkungsgrad", en: "Efficiency" }, latex: "\\eta = \\frac{P_{ab}}{P_{zu}}", legend: { de: "P_ab: abgegebene Leistung, P_zu: zugeführte Leistung", en: "P_ab: output power, P_zu: input power" } },
  { id: "mass-energy", category: "energy", name: { de: "Masse-Energie-Äquivalenz", en: "Mass–energy equivalence" }, latex: "E = m c^2", legend: { de: "c ≈ 299 792 458 m/s", en: "c ≈ 299,792,458 m/s" } },
  // Electricity
  { id: "ohm", category: "electricity", name: { de: "Ohmsches Gesetz", en: "Ohm's law" }, latex: "U = R \\cdot I", legend: { de: "U: Spannung (V), R: Widerstand (Ω), I: Stromstärke (A)", en: "U: voltage (V), R: resistance (Ω), I: current (A)" } },
  { id: "el-power", category: "electricity", name: { de: "Elektrische Leistung", en: "Electric power" }, latex: "P = U \\cdot I", legend: { de: "P: Leistung (W), U: Spannung, I: Stromstärke", en: "P: power (W), U: voltage, I: current" } },
  { id: "el-energy", category: "electricity", name: { de: "Elektrische Energie", en: "Electric energy" }, latex: "E = U \\cdot I \\cdot t", legend: { de: "t: Zeit", en: "t: time" } },
  { id: "charge", category: "electricity", name: { de: "Ladung", en: "Charge" }, latex: "Q = I \\cdot t", legend: { de: "Q: Ladung (C), I: Stromstärke, t: Zeit", en: "Q: charge (C), I: current, t: time" } },
  { id: "series-r", category: "electricity", name: { de: "Reihenschaltung von Widerständen", en: "Resistors in series" }, latex: "R_{ges} = R_1 + R_2 + \\dots", legend: { de: "R_ges: Gesamtwiderstand", en: "R_ges: total resistance" } },
  { id: "parallel-r", category: "electricity", name: { de: "Parallelschaltung von Widerständen", en: "Resistors in parallel" }, latex: "\\frac{1}{R_{ges}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\dots", legend: { de: "R_ges: Gesamtwiderstand", en: "R_ges: total resistance" } },
  { id: "resistivity", category: "electricity", name: { de: "Widerstand eines Leiters", en: "Resistance of a wire" }, latex: "R = \\rho \\frac{l}{A}", legend: { de: "ρ: spezifischer Widerstand, l: Länge, A: Querschnitt", en: "ρ: resistivity, l: length, A: cross-section" } },
  { id: "capacitor", category: "electricity", name: { de: "Kondensator", en: "Capacitor" }, latex: "Q = C \\cdot U", legend: { de: "C: Kapazität (F)", en: "C: capacitance (F)" } },
  { id: "coulomb", category: "electricity", name: { de: "Coulombsches Gesetz", en: "Coulomb's law" }, latex: "F = \\frac{1}{4 \\pi \\varepsilon_0} \\cdot \\frac{q_1 q_2}{r^2}", legend: { de: "ε₀ ≈ 8,854·10⁻¹² F/m, r: Abstand", en: "ε₀ ≈ 8.854·10⁻¹² F/m, r: distance" } },
  // Waves & optics
  { id: "wave", category: "waves", name: { de: "Wellengleichung", en: "Wave equation" }, latex: "c = \\lambda \\cdot f", legend: { de: "c: Ausbreitungsgeschwindigkeit, λ: Wellenlänge, f: Frequenz", en: "c: wave speed, λ: wavelength, f: frequency" } },
  { id: "period", category: "waves", name: { de: "Periodendauer und Frequenz", en: "Period and frequency" }, latex: "f = \\frac{1}{T}", legend: { de: "f: Frequenz (Hz), T: Periodendauer (s)", en: "f: frequency (Hz), T: period (s)" } },
  { id: "pendulum", category: "waves", name: { de: "Fadenpendel", en: "Simple pendulum" }, latex: "T = 2\\pi \\sqrt{\\frac{l}{g}}", legend: { de: "T: Periodendauer, l: Pendellänge, g: Fallbeschleunigung", en: "T: period, l: length, g: gravitational acceleration" } },
  { id: "snell", category: "waves", name: { de: "Brechungsgesetz (Snellius)", en: "Snell's law" }, latex: "n_1 \\sin\\alpha = n_2 \\sin\\beta", legend: { de: "n: Brechzahl, α, β: Winkel zum Lot", en: "n: refractive index, α, β: angles to the normal" } },
  { id: "lens", category: "waves", name: { de: "Linsengleichung", en: "Thin lens equation" }, latex: "\\frac{1}{f} = \\frac{1}{g} + \\frac{1}{b}", legend: { de: "f: Brennweite, g: Gegenstandsweite, b: Bildweite", en: "f: focal length, g: object distance, b: image distance" } },
  { id: "photon", category: "waves", name: { de: "Photonenenergie", en: "Photon energy" }, latex: "E = h \\cdot f", legend: { de: "h ≈ 6,626·10⁻³⁴ J·s, f: Frequenz", en: "h ≈ 6.626·10⁻³⁴ J·s, f: frequency" } },
  // Thermodynamics
  { id: "heat", category: "thermo", name: { de: "Wärmemenge", en: "Heat" }, latex: "Q = c \\cdot m \\cdot \\Delta T", legend: { de: "c: spezifische Wärmekapazität, m: Masse, ΔT: Temperaturänderung", en: "c: specific heat capacity, m: mass, ΔT: temperature change" } },
  { id: "ideal-gas", category: "thermo", name: { de: "Ideale Gasgleichung", en: "Ideal gas law" }, latex: "p V = n R T", legend: { de: "R ≈ 8,314 J/(mol·K), n: Stoffmenge, T: Temperatur (K)", en: "R ≈ 8.314 J/(mol·K), n: amount of substance, T: temperature (K)" } },
  { id: "celsius-kelvin", category: "thermo", name: { de: "Celsius und Kelvin", en: "Celsius and Kelvin" }, latex: "T\\,[\\mathrm{K}] = \\vartheta\\,[^\\circ\\mathrm{C}] + 273{,}15", legend: { de: "T: absolute Temperatur, ϑ: Temperatur in °C", en: "T: absolute temperature, ϑ: temperature in °C" } },
  { id: "thermal-expansion", category: "thermo", name: { de: "Längenausdehnung", en: "Linear thermal expansion" }, latex: "\\Delta l = \\alpha \\cdot l_0 \\cdot \\Delta T", legend: { de: "α: Längenausdehnungskoeffizient, l₀: Ausgangslänge", en: "α: coefficient of linear expansion, l₀: initial length" } },
  // Chemistry
  { id: "moles", category: "chemistry", name: { de: "Stoffmenge", en: "Amount of substance" }, latex: "n = \\frac{m}{M}", legend: { de: "n: Stoffmenge (mol), m: Masse (g), M: molare Masse (g/mol)", en: "n: amount (mol), m: mass (g), M: molar mass (g/mol)" } },
  { id: "molar-volume", category: "chemistry", name: { de: "Molares Volumen (Normbedingungen)", en: "Molar volume (STP)" }, latex: "V = n \\cdot V_m,\\quad V_m \\approx 22{,}4\\,\\mathrm{L/mol}", legend: { de: "bei 0 °C und 1,013 bar", en: "at 0 °C and 1.013 bar" } },
  { id: "concentration", category: "chemistry", name: { de: "Stoffmengenkonzentration", en: "Molar concentration" }, latex: "c = \\frac{n}{V}", legend: { de: "c: Konzentration (mol/L), V: Volumen", en: "c: concentration (mol/L), V: volume" } },
  { id: "ph", category: "chemistry", name: { de: "pH-Wert", en: "pH" }, latex: "\\mathrm{pH} = -\\log_{10} c(\\mathrm{H_3O^+})", legend: { de: "c in mol/L", en: "c in mol/L" } },
  { id: "avogadro", category: "chemistry", name: { de: "Teilchenzahl", en: "Number of particles" }, latex: "N = n \\cdot N_A,\\quad N_A \\approx 6{,}022 \\cdot 10^{23}\\,\\mathrm{mol^{-1}}", legend: { de: "N_A: Avogadro-Konstante", en: "N_A: Avogadro constant" } },
  // Algebra
  { id: "quadratic", category: "algebra", name: { de: "Quadratische Gleichung (Mitternachtsformel)", en: "Quadratic formula" }, latex: "x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", legend: { de: "für ax² + bx + c = 0", en: "for ax² + bx + c = 0" } },
  { id: "pq", category: "algebra", name: { de: "p-q-Formel", en: "p-q formula" }, latex: "x_{1,2} = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^2 - q}", legend: { de: "für x² + px + q = 0", en: "for x² + px + q = 0" } },
  { id: "binomial1", category: "algebra", name: { de: "Binomische Formeln", en: "Binomial identities" }, latex: "(a \\pm b)^2 = a^2 \\pm 2ab + b^2,\\quad (a+b)(a-b) = a^2 - b^2", legend: { de: "", en: "" } },
  { id: "power-rules", category: "algebra", name: { de: "Potenzgesetze", en: "Exponent rules" }, latex: "a^m \\cdot a^n = a^{m+n},\\quad (a^m)^n = a^{mn},\\quad a^{-n} = \\frac{1}{a^n}", legend: { de: "", en: "" } },
  { id: "log-rules", category: "algebra", name: { de: "Logarithmengesetze", en: "Logarithm rules" }, latex: "\\log(ab) = \\log a + \\log b,\\quad \\log(a^n) = n \\log a", legend: { de: "", en: "" } },
  { id: "compound", category: "algebra", name: { de: "Zinseszins", en: "Compound interest" }, latex: "K_n = K_0 \\left(1 + \\frac{p}{100}\\right)^n", legend: { de: "K₀: Anfangskapital, p: Zinssatz in %, n: Jahre", en: "K₀: principal, p: interest rate in %, n: years" } },
  // Geometry
  { id: "pythagoras", category: "geometry", name: { de: "Satz des Pythagoras", en: "Pythagorean theorem" }, latex: "a^2 + b^2 = c^2", legend: { de: "c: Hypotenuse im rechtwinkligen Dreieck", en: "c: hypotenuse of a right triangle" } },
  { id: "circle", category: "geometry", name: { de: "Kreis", en: "Circle" }, latex: "U = 2\\pi r,\\quad A = \\pi r^2", legend: { de: "U: Umfang, A: Fläche, r: Radius", en: "U: circumference, A: area, r: radius" } },
  { id: "triangle-area", category: "geometry", name: { de: "Dreiecksfläche", en: "Triangle area" }, latex: "A = \\tfrac{1}{2} g \\cdot h", legend: { de: "g: Grundseite, h: Höhe", en: "g: base, h: height" } },
  { id: "trapezoid", category: "geometry", name: { de: "Trapez", en: "Trapezoid" }, latex: "A = \\frac{a + c}{2} \\cdot h", legend: { de: "a, c: parallele Seiten, h: Höhe", en: "a, c: parallel sides, h: height" } },
  { id: "sphere", category: "geometry", name: { de: "Kugel", en: "Sphere" }, latex: "V = \\tfrac{4}{3}\\pi r^3,\\quad O = 4\\pi r^2", legend: { de: "V: Volumen, O: Oberfläche", en: "V: volume, O: surface area" } },
  { id: "cylinder", category: "geometry", name: { de: "Zylinder", en: "Cylinder" }, latex: "V = \\pi r^2 h,\\quad O = 2\\pi r (r + h)", legend: { de: "", en: "" } },
  { id: "cone", category: "geometry", name: { de: "Kegel", en: "Cone" }, latex: "V = \\tfrac{1}{3}\\pi r^2 h", legend: { de: "", en: "" } },
  { id: "distance", category: "geometry", name: { de: "Abstand zweier Punkte", en: "Distance between two points" }, latex: "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}", legend: { de: "", en: "" } },
  // Trigonometry
  { id: "trig-def", category: "trigonometry", name: { de: "Sinus, Kosinus, Tangens", en: "Sine, cosine, tangent" }, latex: "\\sin\\alpha = \\frac{\\text{Gegenkathete}}{\\text{Hypotenuse}},\\ \\cos\\alpha = \\frac{\\text{Ankathete}}{\\text{Hypotenuse}},\\ \\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha}", legend: { de: "im rechtwinkligen Dreieck", en: "in a right triangle" } },
  { id: "trig-identity", category: "trigonometry", name: { de: "Trigonometrischer Pythagoras", en: "Pythagorean identity" }, latex: "\\sin^2\\alpha + \\cos^2\\alpha = 1", legend: { de: "", en: "" } },
  { id: "sine-rule", category: "trigonometry", name: { de: "Sinussatz", en: "Law of sines" }, latex: "\\frac{a}{\\sin\\alpha} = \\frac{b}{\\sin\\beta} = \\frac{c}{\\sin\\gamma}", legend: { de: "", en: "" } },
  { id: "cosine-rule", category: "trigonometry", name: { de: "Kosinussatz", en: "Law of cosines" }, latex: "c^2 = a^2 + b^2 - 2ab\\cos\\gamma", legend: { de: "", en: "" } },
  // Calculus
  { id: "power-rule", category: "calculus", name: { de: "Potenzregel", en: "Power rule" }, latex: "\\frac{d}{dx} x^n = n x^{n-1}", legend: { de: "", en: "" } },
  { id: "product-rule", category: "calculus", name: { de: "Produktregel", en: "Product rule" }, latex: "(uv)' = u'v + uv'", legend: { de: "", en: "" } },
  { id: "quotient-rule", category: "calculus", name: { de: "Quotientenregel", en: "Quotient rule" }, latex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}", legend: { de: "", en: "" } },
  { id: "chain-rule", category: "calculus", name: { de: "Kettenregel", en: "Chain rule" }, latex: "(f(g(x)))' = f'(g(x)) \\cdot g'(x)", legend: { de: "", en: "" } },
  { id: "integral-power", category: "calculus", name: { de: "Stammfunktion der Potenz", en: "Antiderivative of a power" }, latex: "\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)", legend: { de: "", en: "" } },
  { id: "ftc", category: "calculus", name: { de: "Hauptsatz der Differential- und Integralrechnung", en: "Fundamental theorem of calculus" }, latex: "\\int_a^b f(x)\\,dx = F(b) - F(a)", legend: { de: "F: Stammfunktion von f", en: "F: antiderivative of f" } },
  // Statistics
  { id: "mean", category: "statistics", name: { de: "Arithmetisches Mittel", en: "Arithmetic mean" }, latex: "\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i", legend: { de: "", en: "" } },
  { id: "variance", category: "statistics", name: { de: "Varianz und Standardabweichung", en: "Variance and standard deviation" }, latex: "\\sigma^2 = \\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\bar{x})^2,\\quad \\sigma = \\sqrt{\\sigma^2}", legend: { de: "", en: "" } },
  { id: "binomial-coeff", category: "statistics", name: { de: "Binomialkoeffizient", en: "Binomial coefficient" }, latex: "\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}", legend: { de: "", en: "" } },
  { id: "binomial-dist", category: "statistics", name: { de: "Binomialverteilung", en: "Binomial distribution" }, latex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}", legend: { de: "n: Versuche, p: Trefferwahrscheinlichkeit", en: "n: trials, p: success probability" } },
  { id: "bayes", category: "statistics", name: { de: "Satz von Bayes", en: "Bayes' theorem" }, latex: "P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}", legend: { de: "", en: "" } },
];

export function searchFormulas(query: string, category: FormulaCategory | "all", lang: "de" | "en"): Formula[] {
  const q = query.trim().toLowerCase();
  return FORMULAS.filter((f) => (category === "all" || f.category === category) && (!q || f.name[lang].toLowerCase().includes(q) || f.name[lang === "de" ? "en" : "de"].toLowerCase().includes(q) || f.legend[lang].toLowerCase().includes(q) || f.latex.toLowerCase().includes(q)));
}
