// NuitFX : l'atmosphère de nuit de Haunt Me a Treat (Rive GPU Canvas, WGSL).
//
// Un seul shader, deux couches (uniforme `mode`) :
//   mode 0 = DERRIÈRE les personnages et le drap : halo de la lampe de porche (qui grésille
//            quand tu fais peur), rayon de lune avec poussière, aura du fantôme.
//   mode 1 = DEVANT : brume au sol qui s'écarte autour du drap et s'agite avec faceScary,
//            plus un léger vignettage.
//   horror (0 → 1) : la lampe vire au rouge et meurt, une flaque de sang s'étale sous le drap,
//            du sang coule du haut de l'écran, un vignettage rouge bat comme un cœur.
//
// Triangle plein écran, sans vertex buffer (même méthode que l'exemple officiel Rive).
// Sortie en alpha prémultiplié, sur un canvas vidé en transparent.

struct Uniforms {
    time: f32,        // secondes
    mode: f32,        // 0 = derrière, 1 = devant
    lamp: f32,        // 0 → 1 : intensité de la lampe (0 dans la rue)
    scary: f32,       // faceScary, 0 → 1
    ghost: vec2<f32>, // position du drap en UV (0,0 = haut gauche)
    lampPos: vec2<f32>,
    aspect: f32,      // largeur / hauteur
    flipY: f32,       // 1 si l'image sort à l'envers dans Rive
    horror: f32,      // 0 → 1 : la révélation (sang, gouttes, lampe rouge, battement de cœur)
    pad1: f32,
}

@group(0) @binding(0)
var<uniform> u: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    let p = pos[vertexIndex];
    var out: VertexOutput;
    out.position = vec4<f32>(p, 0.0, 1.0);
    // UV avec y vers le bas, comme les coordonnées de l'artboard
    out.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
    return out;
}

// ---------- bruit ----------

fn hash21(p: vec2<f32>) -> f32 {
    var q = fract(p * vec2<f32>(123.34, 456.21));
    q = q + dot(q, q + 45.32);
    return fract(q.x * q.y);
}

fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let w = f * f * (3.0 - 2.0 * f);
    let a = hash21(i);
    let b = hash21(i + vec2<f32>(1.0, 0.0));
    let c = hash21(i + vec2<f32>(0.0, 1.0));
    let d = hash21(i + vec2<f32>(1.0, 1.0));
    return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

fn fbm(p0: vec2<f32>) -> f32 {
    var p = p0;
    var v = 0.0;
    var a = 0.5;
    for (var i = 0; i < 5; i = i + 1) {
        v = v + a * vnoise(p);
        p = p * 2.03 + vec2<f32>(17.1, 9.2);
        a = a * 0.5;
    }
    return v;
}

// poussières rondes et douces (une par cellule, pas toutes allumées)
fn motes(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let c = vec2<f32>(hash21(i + vec2<f32>(3.1, 1.3)), hash21(i + vec2<f32>(7.7, 5.9))) * 0.6 + vec2<f32>(0.2);
    let d = length(f - c);
    return smoothstep(0.09, 0.0, d) * step(0.72, hash21(i));
}

// premultiplied "over" : a par-dessus b
fn over(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
    return a + b * (1.0 - a.a);
}

// ---------- couche derrière ----------

fn backLayer(uv: vec2<f32>) -> vec4<f32> {
    let t = u.time;
    let k = vec2<f32>(u.aspect, 1.0);

    // Lampe de porche : grésillement doux, et coupures franches quand le joueur fait peur.
    let buzz = 0.93 + 0.07 * vnoise(vec2<f32>(t * 3.0, 1.7));
    let cut = step(0.62, vnoise(vec2<f32>(t * 22.0, 4.2))) * smoothstep(0.35, 0.9, max(u.scary, u.horror));
    let flicker = buzz * (1.0 - 0.85 * cut);
    let dl = length((uv - u.lampPos) * k);
    let halo = (exp(-dl * dl * 30.0) * 0.55 + exp(-dl * 6.0) * 0.16) * u.lamp * flicker;
    let lampCol = mix(vec3<f32>(1.0, 0.70, 0.38), vec3<f32>(0.95, 0.10, 0.06), u.horror);
    // À la révélation, toutes les lumières de la rue s'éteignent : seule reste la lampe, rouge
    let dark = 0.62 * u.horror;
    var col = over(vec4<f32>(lampCol * halo, halo), vec4<f32>(0.0, 0.0, 0.0, dark));

    // Rayon de lune venant du haut à gauche, avec poussière qui flotte.
    let dir = normalize(vec2<f32>(0.42, 1.0));
    let rel = (uv - vec2<f32>(0.10, -0.05)) * k;
    let across = rel.x * dir.y - rel.y * dir.x;
    let along = dot(rel, dir);
    let beam = smoothstep(0.22, 0.0, abs(across)) * smoothstep(1.3, 0.1, along);
    let dust = motes(rel * 26.0 + vec2<f32>(t * 0.35, -t * 0.55)) * (0.6 + 0.4 * sin(t * 1.3 + along * 9.0));
    let moonA = beam * (0.10 + 0.35 * dust);
    let moonCol = vec3<f32>(0.66, 0.72, 1.0);
    col = over(vec4<f32>(moonCol * moonA, moonA), col);

    // Aura du fantôme : lavande au repos, vert spectral quand il fait peur.
    let dg = length((uv - u.ghost) * k);
    let pulse = 0.85 + 0.15 * sin(t * 2.2);
    let auraA = exp(-dg * dg * 12.0) * (0.14 + 0.12 * u.scary) * pulse;
    let auraCol = mix(mix(vec3<f32>(0.72, 0.66, 1.0), vec3<f32>(0.55, 1.0, 0.72), u.scary), vec3<f32>(0.6, 0.02, 0.04), u.horror);
    col = over(vec4<f32>(auraCol * auraA, auraA), col);

    return col;
}

// ---------- couche devant ----------

fn frontLayer(uv: vec2<f32>) -> vec4<f32> {
    let t = u.time;
    let k = vec2<f32>(u.aspect, 1.0);

    // Brume au sol : plus dense en bas, dérive lente, s'agite quand le joueur fait peur.
    let band = smoothstep(0.66, 1.0, uv.y);
    let swirl = u.scary * 0.35 * vec2<f32>(sin(t * 1.7 + uv.y * 9.0), cos(t * 1.3 + uv.x * 7.0));
    let q = vec2<f32>(uv.x * u.aspect * 2.2 + t * (0.05 + 0.12 * u.scary), uv.y * 5.0 - t * 0.03) + swirl;
    let n = fbm(q + vec2<f32>(fbm(q * 0.7 + t * 0.02), 0.0));
    var dens = band * smoothstep(0.32, 0.8, n) * (0.55 + 0.3 * u.scary);

    // La brume s'écarte autour du bas du drap (il flotte dedans).
    let hem = u.ghost + vec2<f32>(0.0, 0.16);
    let dh = length((uv - hem) * k);
    dens = dens * mix(0.35, 1.0, smoothstep(0.04, 0.22, dh));

    // Teinte : lavande froide, réchauffée sous la lampe.
    let warm = u.lamp * exp(-pow((uv.x - u.lampPos.x) * u.aspect, 2.0) * 6.0) * 0.5;
    let mistCol = mix(mix(vec3<f32>(0.70, 0.68, 0.92), vec3<f32>(1.0, 0.78, 0.55), warm), vec3<f32>(0.45, 0.06, 0.08), u.horror * 0.7);
    let mist = vec4<f32>(mistCol * dens, dens);

    // Vignettage léger (noir), sous la brume.
    let vd = length((uv - vec2<f32>(0.5, 0.5)) * vec2<f32>(1.1, 1.35));
    let vig = smoothstep(0.55, 1.05, vd) * 0.5;

    var c = vec4<f32>(0.0, 0.0, 0.0, vig);
    let h = u.horror;
    if (h > 0.001) {
        // Vignettage rouge qui bat comme un cœur (double battement, ~70 bpm)
        let ph = fract(t * 1.15);
        let beat = exp(-pow((ph - 0.05) * 22.0, 2.0)) + 0.7 * exp(-pow((ph - 0.25) * 22.0, 2.0));
        let redA = smoothstep(0.30, 1.0, vd) * h * (0.45 + 0.4 * beat);
        c = over(vec4<f32>(vec3<f32>(0.30, 0.0, 0.01) * redA, redA), c);

        // Flaque de sang qui s'étale sous le drap, bord irrégulier, reflet brillant
        let pc = hem + vec2<f32>(0.0, 0.03);
        let pr = (uv - pc) * vec2<f32>(u.aspect, 3.2);
        let edge = (vnoise(uv * vec2<f32>(38.0, 38.0)) - 0.5) * 0.07 + (vnoise(uv * 9.0) - 0.5) * 0.08;
        let rp = 0.02 + 0.30 * smoothstep(0.0, 0.8, h);
        let pd = length(pr) + edge;
        let poolA = smoothstep(rp, rp - 0.015, pd) * smoothstep(0.0, 0.15, h) * 0.95;
        let sheen = smoothstep(0.03, 0.0, length(pr - vec2<f32>(-rp * 0.35, -rp * 0.25))) * 0.5;
        let poolCol = vec3<f32>(0.30, 0.0, 0.02) + vec3<f32>(0.5, 0.25, 0.25) * sheen;
        let pool = vec4<f32>(poolCol * poolA, poolA);

        // Sang qui coule du haut de l'écran : des filets de largeurs et vitesses différentes
        let cols = 40.0;
        let ci = floor(uv.x * cols);
        let r1 = hash21(vec2<f32>(ci, 3.7));
        let r2 = hash21(vec2<f32>(ci, 9.1));
        let r3 = hash21(vec2<f32>(ci, 1.3));
        let xc = (ci + 0.3 + 0.4 * r2) / cols + sin(uv.y * 30.0 + ci) * 0.0012;
        let len = h * (0.15 + 0.75 * r3) * step(0.55, r1);
        let w = (0.0028 + 0.0050 * r2) * mix(1.6, 0.7, clamp(uv.y / max(len, 0.001), 0.0, 1.0));
        let dx = abs(uv.x - xc) * u.aspect;
        let body = smoothstep(w, w * 0.5, dx) * step(uv.y, len);
        let bulb = smoothstep(w * 2.2, w * 1.6, length(vec2<f32>(dx, (uv.y - len) * 1.0)));
        let dripA = max(body, bulb * step(0.001, len)) * 0.95;
        let dripCol = vec3<f32>(0.42, 0.0, 0.03) + vec3<f32>(0.25, 0.1, 0.1) * smoothstep(w * 0.6, 0.0, abs(dx - w * 0.3));
        let drip = vec4<f32>(dripCol * dripA, dripA);

        c = over(drip, over(mist, over(pool, c)));
        return c;
    }
    return over(mist, c);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var uv = in.uv;
    if (u.flipY > 0.5) {
        uv.y = 1.0 - uv.y;
    }
    var c: vec4<f32>;
    if (u.mode < 0.5) {
        c = backLayer(uv);
    } else {
        c = frontLayer(uv);
    }
    return clamp(c, vec4<f32>(0.0), vec4<f32>(1.0));
}
