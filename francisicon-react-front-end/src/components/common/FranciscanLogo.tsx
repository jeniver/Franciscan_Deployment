// PDF Assets and Constants for Agreement Template

// SVG logo representing the Franciscan religious scene (St. Francis receiving the stigmata)
const franciscanLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" fill="none">
  <!-- Background frame -->
  <rect x="2" y="2" width="116" height="96" fill="white" stroke="#1a1a1a" stroke-width="2"/>
  
  <!-- Inner decorative border -->
  <rect x="6" y="6" width="108" height="88" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  
  <!-- Radiating glory/halo lines from top center -->
  <g stroke="#1a1a1a" stroke-width="1">
    <line x1="60" y1="10" x2="60" y2="25"/>
    <line x1="45" y1="12" x2="50" y2="26"/>
    <line x1="75" y1="12" x2="70" y2="26"/>
    <line x1="35" y1="18" x2="42" y2="30"/>
    <line x1="85" y1="18" x2="78" y2="30"/>
    <line x1="28" y1="28" x2="38" y2="36"/>
    <line x1="92" y1="28" x2="82" y2="36"/>
  </g>
  
  <!-- Central standing figure (Christ/Seraph) -->
  <g fill="#1a1a1a">
    <!-- Head with halo -->
    <circle cx="60" cy="32" r="6" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>
    <circle cx="60" cy="32" r="4" fill="#1a1a1a"/>
    
    <!-- Body/robe -->
    <path d="M54 38 L52 70 L60 72 L68 70 L66 38 Z" fill="#1a1a1a"/>
    
    <!-- Arms extended -->
    <path d="M54 42 L35 48 L36 52 L54 48 Z" fill="#1a1a1a"/>
    <path d="M66 42 L85 48 L84 52 L66 48 Z" fill="#1a1a1a"/>
    
    <!-- Wings/seraph indication -->
    <path d="M48 35 Q40 30 38 38 Q42 42 48 40 Z" fill="#1a1a1a"/>
    <path d="M72 35 Q80 30 82 38 Q78 42 72 40 Z" fill="#1a1a1a"/>
  </g>
  
  <!-- Kneeling figure (St. Francis) on left -->
  <g fill="#1a1a1a">
    <!-- Head -->
    <circle cx="30" cy="58" r="5"/>
    
    <!-- Kneeling body/robe -->
    <path d="M25 63 L22 82 L38 82 L35 63 Z"/>
    
    <!-- Arms raised toward central figure -->
    <path d="M35 65 L48 55 L50 58 L36 70 Z"/>
  </g>
  
  <!-- Ground/rocky terrain -->
  <g fill="#1a1a1a">
    <path d="M10 85 Q20 80 30 85 Q45 78 60 85 Q75 80 90 85 Q100 82 110 85 L110 92 L10 92 Z"/>
  </g>
  
  <!-- Cross on right side (Tau cross reference) -->
  <g stroke="#1a1a1a" stroke-width="2" fill="none">
    <line x1="95" y1="55" x2="95" y2="78"/>
    <line x1="88" y1="58" x2="102" y2="58"/>
  </g>
  
  <!-- Stigmata rays connecting figures -->
  <g stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,2">
    <line x1="52" y1="45" x2="35" y2="60"/>
    <line x1="54" y1="50" x2="36" y2="65"/>
  </g>
</svg>`

// Convert SVG to base64 data URI
const svgBase64 = btoa(franciscanLogoSvg)

export const PDF_ASSETS = {
  // Franciscan logo - St. Francis receiving the stigmata
  headerImageBase64: 'data:image/svg+xml;base64,' + svgBase64,
  // Also export the raw SVG for direct use
  headerImageSvg: franciscanLogoSvg,
  // URL version for fallback
  headerImageUrl:
    'https://cdn.magicpatterns.com/uploads/oMqoCwd9jWJzRMtMmfzGYG/image.png',
}

export const AGREEMENT_DEFAULTS = {
  orderName: 'The Order of Friars Minor (Singapore) Limited',
  orderAddress: '5 Bukit Batok East Ave 2, Singapore 659918',
  orderRegNo: '201016323M',
  orderTel: '6560-6361',
  orderHP: '9774-7053',
  orderEmail: 'franciscan.columbarium@gmail.com',
  friarManager: 'FrGerard Victor',
  friarTitle: 'Friar - Manager',
}
