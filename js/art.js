/* =========================================================
   ANAS — مولّد الرسوم الإجرائية للعيّنات

   كل عيّنة تُرسم برمجياً كـ SVG بدل استخدام صور جاهزة.
   الفائدة: حجم شبه معدوم، وضوح مثالي عند أي تكبير، وتحكّم
   كامل في الألوان والحركة. مولّد الأرقام العشوائية مبذور
   (seeded) فيخرج الشكل نفسه في كل مرة.
   ========================================================= */

/** مولّد عشوائي مبذور — نتيجة ثابتة لنفس البذرة */
function rng(seed){
  let state = seed >>> 0;
  return () => {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n) => Math.round(n * 100) / 100;

/** تعريفات التدرّجات والمرشّحات المشتركة */
function defs(id, [light, dark]){
  return `
    <defs>
      <radialGradient id="g-${id}" cx="36%" cy="30%" r="78%">
        <stop offset="0%"  stop-color="${light}" stop-opacity=".95"/>
        <stop offset="55%" stop-color="${light}" stop-opacity=".55"/>
        <stop offset="100%" stop-color="${dark}"  stop-opacity=".92"/>
      </radialGradient>
      <linearGradient id="l-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="${light}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
      <filter id="glow-${id}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="soft-${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.1"/>
      </filter>
    </defs>`;
}

/** حبيبات داخلية تعطي إحساس البنية الحيّة */
function granules(random, count, cx, cy, rx, ry, color){
  let out = '';
  for (let i = 0; i < count; i++){
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    const x = cx + Math.cos(angle) * rx * radius * .78;
    const y = cy + Math.sin(angle) * ry * radius * .78;
    const r = 1.2 + random() * 2.8;
    out += `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${color}" opacity="${round(.14 + random() * .3)}"/>`;
  }
  return out;
}

/* =========================================================
   الأشكال
   ========================================================= */

const shapes = {

  /* عصية — بكتيريا مستطيلة بأسواط */
  bacillus(id, p, random){
    const flagella = p.flagella ?? 0;
    let tails = '';
    for (let i = 0; i < flagella; i++){
      const y = 70 + (i / Math.max(1, flagella - 1)) * 60;
      const wave = 10 + random() * 8;
      tails += `<path d="M58 ${round(y)} C 40 ${round(y - wave)}, 28 ${round(y + wave)}, 10 ${round(y - wave * .5)}"
        stroke="url(#l-${id})" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>`;
    }
    return `
      ${tails}
      <rect x="58" y="62" width="108" height="76" rx="38" fill="url(#g-${id})" filter="url(#glow-${id})"/>
      <rect x="58" y="62" width="108" height="76" rx="38" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".55"/>
      ${granules(random, 14, 112, 100, 46, 30, p.palette[0])}
      <ellipse cx="92" cy="84" rx="17" ry="10" fill="#fff" opacity=".16" transform="rotate(-18 92 84)"/>`;
  },

  /* عنقود — مكوّرات متجمّعة */
  cluster(id, p, random){
    const count = p.count ?? 9;
    let out = '';
    const placed = [];
    for (let i = 0; i < count; i++){
      let x, y, r, tries = 0;
      do {
        const angle = random() * Math.PI * 2;
        const dist = random() * 44;
        x = 100 + Math.cos(angle) * dist;
        y = 100 + Math.sin(angle) * dist;
        r = 15 + random() * 7;
        tries++;
      } while (tries < 24 && placed.some((c) => Math.hypot(c.x - x, c.y - y) < (c.r + r) * .78));
      placed.push({ x, y, r });
      out += `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="url(#g-${id})" opacity=".94"/>
              <circle cx="${round(x - r * .3)}" cy="${round(y - r * .32)}" r="${round(r * .3)}" fill="#fff" opacity=".2"/>`;
    }
    return `<g filter="url(#glow-${id})">${out}</g>`;
  },

  /* فاصلة — ضمة منحنية بسوط */
  comma(id, p, random){
    return `
      <path d="M42 128 C 40 92, 74 56, 118 60 C 150 63, 164 86, 158 104"
        stroke="url(#l-${id})" stroke-width="30" fill="none" stroke-linecap="round" filter="url(#glow-${id})" opacity=".95"/>
      <path d="M42 128 C 40 92, 74 56, 118 60 C 150 63, 164 86, 158 104"
        stroke="${p.palette[0]}" stroke-width="31" fill="none" stroke-linecap="round" opacity=".2"/>
      <path d="M158 104 C 172 122, 150 138, 166 156 C 176 168, 166 178, 176 186"
        stroke="${p.palette[0]}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".65"/>
      ${granules(random, 10, 100, 96, 44, 26, p.palette[0])}`;
  },

  /* خيط — سلسلة خلايا متصلة */
  filament(id, p, random){
    const count = p.count ?? 7;
    let out = '';
    for (let i = 0; i < count; i++){
      const t = i / (count - 1);
      const x = 26 + t * 148;
      const y = 100 + Math.sin(t * Math.PI * 1.8) * 26;
      out += `<circle cx="${round(x)}" cy="${round(y)}" r="17" fill="url(#g-${id})" opacity=".95"/>
              <circle cx="${round(x)}" cy="${round(y)}" r="17" fill="none" stroke="${p.palette[0]}" stroke-width="1.2" opacity=".5"/>
              ${granules(random, 3, x, y, 11, 11, p.palette[0])}`;
    }
    return `<g filter="url(#glow-${id})">${out}</g>`;
  },

  /* فيروس بأشواك — إنفلونزا / كورونا / HIV */
  spiked(id, p, random){
    const spikes = p.spikes ?? 22;
    let out = '';
    for (let i = 0; i < spikes; i++){
      const angle = (i / spikes) * Math.PI * 2 + random() * .08;
      const inner = 52, outer = inner + 17 + random() * 7;
      const x1 = 100 + Math.cos(angle) * inner, y1 = 100 + Math.sin(angle) * inner;
      const x2 = 100 + Math.cos(angle) * outer, y2 = 100 + Math.sin(angle) * outer;
      out += `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}"
                stroke="${p.palette[0]}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
              <circle cx="${round(x2)}" cy="${round(y2)}" r="4.4" fill="${p.palette[0]}" opacity=".95"/>`;
    }
    return `
      <g filter="url(#glow-${id})">${out}</g>
      <circle cx="100" cy="100" r="53" fill="url(#g-${id})" filter="url(#glow-${id})"/>
      <circle cx="100" cy="100" r="53" fill="none" stroke="${p.palette[0]}" stroke-width="1.6" opacity=".6"/>
      ${granules(random, 16, 100, 100, 42, 42, p.palette[0])}
      <ellipse cx="82" cy="80" rx="16" ry="11" fill="#fff" opacity=".15" transform="rotate(-28 82 80)"/>`;
  },

  /* عاثية — رأس سداسي وذيل وأرجل */
  phage(id, p){
    return `
      <g filter="url(#glow-${id})">
        <path d="M100 26 L136 47 L136 89 L100 110 L64 89 L64 47 Z" fill="url(#g-${id})"/>
        <path d="M100 26 L136 47 L136 89 L100 110 L64 89 L64 47 Z" fill="none" stroke="${p.palette[0]}" stroke-width="1.8" opacity=".7"/>
        <path d="M100 26 L136 47 L100 68 L64 47 Z" fill="#fff" opacity=".12"/>
        <rect x="90" y="110" width="20" height="42" rx="4" fill="url(#l-${id})" opacity=".85"/>
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="88" y="${114 + i * 8}" width="24" height="2.6" rx="1.3" fill="${p.palette[0]}" opacity=".55"/>`).join('')}
        <rect x="80" y="150" width="40" height="7" rx="3.5" fill="url(#l-${id})"/>
        <path d="M84 157 C 70 166, 62 176, 58 186"  stroke="${p.palette[0]}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M93 157 C 86 170, 82 180, 80 190"  stroke="${p.palette[0]}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M107 157 C 114 170, 118 180, 120 190" stroke="${p.palette[0]}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M116 157 C 130 166, 138 176, 142 186" stroke="${p.palette[0]}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>
      </g>`;
  },

  /* قرص مقعّر الوجهين — كرية الدم الحمراء */
  biconcave(id, p, random){
    return `
      <g filter="url(#glow-${id})">
        <ellipse cx="100" cy="100" rx="68" ry="56" fill="url(#g-${id})"/>
        <ellipse cx="100" cy="100" rx="68" ry="56" fill="none" stroke="${p.palette[0]}" stroke-width="1.6" opacity=".5"/>
        <ellipse cx="100" cy="100" rx="34" ry="27" fill="${p.palette[1]}" opacity=".55" filter="url(#soft-${id})"/>
        <ellipse cx="100" cy="100" rx="25" ry="19" fill="${p.palette[1]}" opacity=".4"/>
        <ellipse cx="76" cy="76" rx="20" ry="12" fill="#fff" opacity=".22" transform="rotate(-24 76 76)"/>
        ${granules(random, 8, 100, 100, 56, 44, '#fff')}
      </g>`;
  },

  /* نواة مفصّصة — خلية دم بيضاء */
  lobed(id, p, random){
    const lobes = p.lobes ?? 4;
    let nucleus = '';
    for (let i = 0; i < lobes; i++){
      const angle = (i / lobes) * Math.PI * 2 + .5;
      const x = 100 + Math.cos(angle) * 20;
      const y = 100 + Math.sin(angle) * 17;
      nucleus += `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(15 + random() * 4)}" ry="${round(12 + random() * 4)}"
                    fill="${p.palette[1]}" opacity=".78" transform="rotate(${round(random() * 90)} ${round(x)} ${round(y)})"/>`;
    }
    return `
      <g filter="url(#glow-${id})">
        <circle cx="100" cy="100" r="66" fill="url(#g-${id})"/>
        <circle cx="100" cy="100" r="66" fill="none" stroke="${p.palette[0]}" stroke-width="1.6" opacity=".55"/>
        ${granules(random, 30, 100, 100, 56, 56, p.palette[0])}
        <g filter="url(#soft-${id})">${nucleus}</g>
        <ellipse cx="74" cy="72" rx="17" ry="11" fill="#fff" opacity=".18" transform="rotate(-28 74 72)"/>
      </g>`;
  },

  /* خلية عصبية — جسم وتشجّرات ومحور */
  neuron(id, p, random){
    const branches = p.branches ?? 7;
    let dendrites = '';
    for (let i = 0; i < branches; i++){
      const angle = (i / branches) * Math.PI * 2 - .4;
      if (Math.abs(angle - 0) < .35) continue;       // نترك مكاناً للمحور
      const len = 44 + random() * 28;
      const x1 = 78 + Math.cos(angle) * 22, y1 = 100 + Math.sin(angle) * 22;
      const x2 = 78 + Math.cos(angle) * len, y2 = 100 + Math.sin(angle) * len;
      const mx = (x1 + x2) / 2 + (random() - .5) * 16;
      const my = (y1 + y2) / 2 + (random() - .5) * 16;
      dendrites += `<path d="M${round(x1)} ${round(y1)} Q ${round(mx)} ${round(my)}, ${round(x2)} ${round(y2)}"
        stroke="url(#l-${id})" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>`;
      // تفرّع صغير في الطرف
      const tipAngle = angle + (random() - .5);
      dendrites += `<path d="M${round(x2)} ${round(y2)} l ${round(Math.cos(tipAngle) * 13)} ${round(Math.sin(tipAngle) * 13)}"
        stroke="${p.palette[0]}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>`;
    }
    return `
      <g filter="url(#glow-${id})">
        ${dendrites}
        <path d="M100 100 C 130 96, 150 104, 174 100" stroke="url(#l-${id})" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${[0,1,2,3].map((i) => `<ellipse cx="${118 + i * 15}" cy="100" rx="7" ry="5.5" fill="${p.palette[0]}" opacity=".35"/>`).join('')}
        <path d="M174 100 l 9 -7 M174 100 l 9 7 M174 100 l 11 0" stroke="${p.palette[0]}" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
        <circle cx="78" cy="100" r="25" fill="url(#g-${id})"/>
        <circle cx="78" cy="100" r="25" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".6"/>
        <circle cx="78" cy="100" r="10" fill="${p.palette[1]}" opacity=".7"/>
        <circle cx="72" cy="93" r="6" fill="#fff" opacity=".2"/>
      </g>`;
  },

  /* خلية نباتية — جدار وفجوة وبلاستيدات */
  plantcell(id, p, random){
    const count = p.chloroplasts ?? 9;
    let chloroplasts = '';
    for (let i = 0; i < count; i++){
      const angle = (i / count) * Math.PI * 2 + random() * .4;
      const x = 100 + Math.cos(angle) * (52 + random() * 10);
      const y = 100 + Math.sin(angle) * (46 + random() * 8);
      chloroplasts += `<ellipse cx="${round(x)}" cy="${round(y)}" rx="11" ry="7" fill="${p.palette[0]}"
        opacity=".85" transform="rotate(${round(random() * 180)} ${round(x)} ${round(y)})"/>`;
    }
    return `
      <g filter="url(#glow-${id})">
        <rect x="24" y="32" width="152" height="136" rx="20" fill="${p.palette[1]}" opacity=".28"/>
        <rect x="30" y="38" width="140" height="124" rx="16" fill="url(#g-${id})" opacity=".55"/>
        <rect x="24" y="32" width="152" height="136" rx="20" fill="none" stroke="${p.palette[0]}" stroke-width="3" opacity=".8"/>
        <rect x="30" y="38" width="140" height="124" rx="16" fill="none" stroke="${p.palette[0]}" stroke-width="1.2" opacity=".45"/>
        <ellipse cx="100" cy="104" rx="48" ry="40" fill="${p.palette[0]}" opacity=".18"/>
        <ellipse cx="100" cy="104" rx="48" ry="40" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".4"/>
        ${chloroplasts}
        <circle cx="62" cy="66" r="13" fill="${p.palette[1]}" opacity=".75"/>
        <circle cx="62" cy="66" r="5" fill="${p.palette[0]}" opacity=".8"/>
      </g>`;
  },

  /* أميبا — شكل متغيّر بأقدام كاذبة */
  amoeba(id, p, random){
    const points = 14;
    let d = '';
    for (let i = 0; i <= points; i++){
      const angle = (i / points) * Math.PI * 2;
      const radius = 54 + Math.sin(angle * 3 + 1) * 16 + (random() - .5) * 10;
      const x = 100 + Math.cos(angle) * radius;
      const y = 100 + Math.sin(angle) * radius * .92;
      d += (i === 0 ? 'M' : 'L') + round(x) + ' ' + round(y) + ' ';
    }
    return `
      <g filter="url(#glow-${id})">
        <path d="${d}Z" fill="url(#g-${id})" opacity=".92" stroke="${p.palette[0]}" stroke-width="1.6" stroke-linejoin="round"/>
        ${granules(random, 22, 100, 100, 44, 40, p.palette[0])}
        <circle cx="88" cy="94" r="16" fill="${p.palette[1]}" opacity=".65"/>
        <circle cx="88" cy="94" r="16" fill="none" stroke="${p.palette[0]}" stroke-width="1.2" opacity=".6"/>
        <circle cx="128" cy="118" r="9" fill="none" stroke="${p.palette[0]}" stroke-width="1.6" opacity=".5"/>
        <circle cx="70" cy="126" r="6" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".45"/>
      </g>`;
  },

  /* براميسيوم — شكل النعل بأهداب */
  paramecium(id, p, random){
    const body = 'M46 104 C 46 72, 78 52, 116 54 C 152 56, 170 78, 166 100 C 162 126, 128 148, 92 146 C 62 144, 46 128, 46 104 Z';
    let cilia = '';
    for (let i = 0; i < 44; i++){
      const t = i / 44;
      const angle = t * Math.PI * 2;
      const rx = 60, ry = 47;
      const x = 106 + Math.cos(angle) * rx;
      const y = 100 + Math.sin(angle) * ry;
      const nx = Math.cos(angle), ny = Math.sin(angle);
      const len = 9 + random() * 5;
      cilia += `<line x1="${round(x)}" y1="${round(y)}" x2="${round(x + nx * len)}" y2="${round(y + ny * len)}"
        stroke="${p.palette[0]}" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>`;
    }
    return `
      <g filter="url(#glow-${id})">
        ${cilia}
        <path d="${body}" fill="url(#g-${id})" stroke="${p.palette[0]}" stroke-width="1.6" opacity=".95"/>
        ${granules(random, 18, 106, 100, 48, 36, p.palette[0])}
        <ellipse cx="112" cy="98" rx="17" ry="13" fill="${p.palette[1]}" opacity=".7"/>
        <ellipse cx="132" cy="112" rx="7" ry="6" fill="${p.palette[1]}" opacity=".65"/>
        <path d="M70 96 L 96 104 L 70 114" fill="none" stroke="${p.palette[1]}" stroke-width="2" opacity=".6" stroke-linejoin="round"/>
        <circle cx="76" cy="82" r="7" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".5"/>
        <circle cx="142" cy="128" r="7" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".5"/>
      </g>`;
  },

  /* يوغلينا — مغزلية بسوط وبقعة عينية */
  euglena(id, p, random){
    let chloroplasts = '';
    for (let i = 0; i < 11; i++){
      const t = i / 10;
      const x = 62 + t * 92;
      const y = 100 + Math.sin(t * Math.PI) * (i % 2 ? 15 : -15);
      chloroplasts += `<ellipse cx="${round(x)}" cy="${round(y)}" rx="9" ry="6" fill="${p.palette[0]}"
        opacity=".8" transform="rotate(${round(random() * 60 - 30)} ${round(x)} ${round(y)})"/>`;
    }
    return `
      <g filter="url(#glow-${id})">
        <path d="M52 100 C 60 62, 110 54, 150 76 C 172 88, 172 112, 150 124 C 110 146, 60 138, 52 100 Z"
          fill="url(#g-${id})" stroke="${p.palette[0]}" stroke-width="1.6"/>
        ${chloroplasts}
        <circle cx="72" cy="90" r="6.5" fill="#ff5252" opacity=".9"/>
        <circle cx="72" cy="90" r="6.5" fill="none" stroke="#ff8a80" stroke-width="1" opacity=".8"/>
        <ellipse cx="120" cy="104" rx="14" ry="11" fill="${p.palette[1]}" opacity=".6"/>
        <path d="M52 100 C 34 92, 26 108, 14 98 C 6 92, 2 104, -2 98"
          stroke="${p.palette[0]}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".75"/>
      </g>`;
  },

  /* دياتوم — صدفة سيليكا هندسية */
  diatom(id, p, random){
    const sides = p.sides ?? 8;
    const radius = 66;
    const point = (i, r) => {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      return `${round(100 + Math.cos(angle) * r)} ${round(100 + Math.sin(angle) * r)}`;
    };
    const poly = (r) => Array.from({ length: sides }, (_, i) => point(i, r)).join(' L ');

    let ribs = '';
    for (let i = 0; i < sides; i++){
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      ribs += `<line x1="${round(100 + Math.cos(angle) * 16)}" y1="${round(100 + Math.sin(angle) * 16)}"
                     x2="${round(100 + Math.cos(angle) * 62)}" y2="${round(100 + Math.sin(angle) * 62)}"
                     stroke="${p.palette[0]}" stroke-width="1.5" opacity=".55"/>`;
    }
    let pores = '';
    for (let ring = 1; ring <= 3; ring++){
      const r = ring * 17;
      const count = ring * 7;
      for (let i = 0; i < count; i++){
        const angle = (i / count) * Math.PI * 2 + ring * .3;
        pores += `<circle cx="${round(100 + Math.cos(angle) * r)}" cy="${round(100 + Math.sin(angle) * r)}"
          r="${round(1.6 + random() * 1.4)}" fill="${p.palette[0]}" opacity=".6"/>`;
      }
    }
    return `
      <g filter="url(#glow-${id})">
        <path d="M ${poly(radius)} Z" fill="url(#g-${id})" stroke="${p.palette[0]}" stroke-width="2.2" opacity=".95"/>
        <path d="M ${poly(radius - 9)} Z" fill="none" stroke="${p.palette[0]}" stroke-width="1.1" opacity=".5"/>
        ${ribs}${pores}
        <circle cx="100" cy="100" r="13" fill="none" stroke="${p.palette[0]}" stroke-width="1.8" opacity=".7"/>
      </g>`;
  },

  /* خميرة — خلية أم وبرعم */
  budding(id, p, random){
    return `
      <g filter="url(#glow-${id})">
        <circle cx="88" cy="106" r="48" fill="url(#g-${id})"/>
        <circle cx="88" cy="106" r="48" fill="none" stroke="${p.palette[0]}" stroke-width="1.6" opacity=".6"/>
        <circle cx="146" cy="72" r="26" fill="url(#g-${id})" opacity=".95"/>
        <circle cx="146" cy="72" r="26" fill="none" stroke="${p.palette[0]}" stroke-width="1.4" opacity=".6"/>
        <circle cx="170" cy="50" r="12" fill="url(#g-${id})" opacity=".8"/>
        ${granules(random, 16, 88, 106, 38, 38, p.palette[0])}
        ${granules(random, 6, 146, 72, 18, 18, p.palette[0])}
        <circle cx="80" cy="98" r="15" fill="${p.palette[1]}" opacity=".6"/>
        <ellipse cx="70" cy="86" rx="14" ry="9" fill="#fff" opacity=".2" transform="rotate(-26 70 86)"/>
      </g>`;
  },

  /* فرشاة — حوامل جراثيم البنسيليوم */
  brush(id, p, random){
    let spores = '';
    const stalks = 4;
    for (let s = 0; s < stalks; s++){
      const baseX = 62 + s * 26;
      const topY = 78 - (s % 2) * 8;
      spores += `<path d="M${baseX} 176 L ${baseX} ${topY}" stroke="url(#l-${id})" stroke-width="4" stroke-linecap="round"/>`;
      for (let b = -1; b <= 1; b++){
        const bx = baseX + b * 12;
        spores += `<path d="M${baseX} ${topY} L ${bx} ${topY - 18}" stroke="${p.palette[0]}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`;
        for (let i = 0; i < 4; i++){
          spores += `<circle cx="${round(bx + (random() - .5) * 6)}" cy="${round(topY - 24 - i * 9)}"
            r="${round(4 + random() * 1.6)}" fill="${p.palette[0]}" opacity="${round(.55 + random() * .4)}"/>`;
        }
      }
    }
    return `<g filter="url(#glow-${id})">
      <path d="M34 176 L 176 176" stroke="${p.palette[1]}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      ${spores}</g>`;
  },

  /* حلقة — طور المتصوّرة داخل كرية الدم */
  ring(id, p, random){
    return `
      <g filter="url(#glow-${id})">
        <circle cx="100" cy="100" r="68" fill="${p.palette[1]}" opacity=".26"/>
        <circle cx="100" cy="100" r="68" fill="none" stroke="${p.palette[1]}" stroke-width="2" opacity=".5"/>
        ${granules(random, 14, 100, 100, 56, 56, p.palette[1])}
        <path d="M100 58 A 42 42 0 1 1 74 132" fill="none" stroke="url(#l-${id})" stroke-width="13" stroke-linecap="round"/>
        <circle cx="74" cy="132" r="13" fill="url(#g-${id})"/>
        <circle cx="74" cy="132" r="6" fill="${p.palette[1]}" opacity=".9"/>
        <ellipse cx="118" cy="70" rx="11" ry="7" fill="#fff" opacity=".18" transform="rotate(-30 118 70)"/>
      </g>`;
  },

  /* دبّ الماء — جسم مقسّم بثمانية أرجل */
  tardigrade(id, p, random){
    let legs = '';
    for (let i = 0; i < 4; i++){
      const x = 66 + i * 26;
      for (const dir of [1, -1]){
        const y = 100 + dir * 30;
        legs += `<path d="M${x} ${100 + dir * 18} C ${x - 4} ${y}, ${x - 8} ${y + dir * 8}, ${x - 12} ${y + dir * 14}"
          stroke="url(#l-${id})" stroke-width="8" fill="none" stroke-linecap="round" opacity=".9"/>
          <path d="M${x - 12} ${y + dir * 14} l -4 ${dir * 5} M${x - 12} ${y + dir * 14} l 2 ${dir * 6}"
          stroke="${p.palette[1]}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
      }
    }
    let segments = '';
    for (let i = 0; i < 4; i++){
      segments += `<line x1="${79 + i * 26}" y1="76" x2="${79 + i * 26}" y2="124"
        stroke="${p.palette[1]}" stroke-width="1.8" opacity=".45"/>`;
    }
    return `
      <g filter="url(#glow-${id})">
        ${legs}
        <rect x="54" y="70" width="112" height="60" rx="30" fill="url(#g-${id})" stroke="${p.palette[0]}" stroke-width="1.6"/>
        ${segments}
        ${granules(random, 12, 110, 100, 44, 20, p.palette[1])}
        <circle cx="166" cy="92" r="4.6" fill="${p.palette[1]}" opacity=".9"/>
        <circle cx="166" cy="108" r="4.6" fill="${p.palette[1]}" opacity=".9"/>
        <path d="M168 100 l 10 -5 M168 100 l 10 5" stroke="${p.palette[1]}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        <ellipse cx="86" cy="84" rx="18" ry="8" fill="#fff" opacity=".18" transform="rotate(-10 86 84)"/>
      </g>`;
  },
};

/* =========================================================
   الواجهة العامة
   ========================================================= */

/**
 * يبني SVG لعيّنة.
 * @param {object} art   وصف الرسم من ملف العيّنات
 * @param {object} opts  { size, className, animate }
 */
export function specimenSVG(art, { size = 200, className = '', animate = true } = {}){
  const spec = art ?? { type: 'cluster', palette: ['#64d9ff', '#0b3c63'], seed: 1 };
  const id = `${spec.type}-${spec.seed ?? 0}`;
  const random = rng((spec.seed ?? 1) * 2654435761);
  const draw = shapes[spec.type] ?? shapes.cluster;

  // xmlns ضروري: بدونه يعمل الرسم داخل HTML لكنه يفشل تماماً
  // حين يُحمَّل كصورة مستقلة عبر data: URL (كما في المجهر)
  return `<svg xmlns="http://www.w3.org/2000/svg" class="specimen-art ${className}"
    viewBox="0 0 200 200" width="${size}" height="${size}"
    role="img" aria-hidden="true" data-animate="${animate ? 'on' : 'off'}">
    ${defs(id, spec.palette)}
    <g class="specimen-art__body">${draw(id, spec, random)}</g>
  </svg>`;
}

/** لون التوهّج المناسب لعيّنة — يُستخدم في خلفيات البطاقات */
export const artGlow = (art) => art?.palette?.[0] ?? '#64d9ff';
