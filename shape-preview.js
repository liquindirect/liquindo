/* Shared shape preview renderer: the admin library and Flag Maker use the same geometry. */
(function(){
  const safeLibraryPath = (value) {
    const path = String(value || '').trim();
    return path.length > 0 && path.length <= 5000 && /^M/i.test(path) &&
      /^[MmZzLlHhVvCcSsQqTtAa0-9.,+\-\s]+$/.test(path);
  };
  function canonicalSymbolBody(type,fill,stroke,background){
    const f=fill||'#b08a13',s=stroke||'#17213b',bg=background||'#ffffff';
    if(type==='anchor') return '<g fill="none" stroke="'+s+'" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="5.2" r="3.1"/><path d="M20 8.5V26M10.5 14.5H29.5M5.2 20.5C6.4 27.2 12 30 20 30S33.6 27.2 34.8 20.5L29.5 23.5M5.2 20.5L10.5 23.5"/><path d="M16.5 26.5L20 30L23.5 26.5"/></g>';
    if(type==='helmet') return '<g stroke="'+s+'" stroke-linejoin="round" stroke-linecap="round"><path d="M5 22.5V19.2C5 11.1 11.6 5 20 5S35 11.1 35 19.2V22.5Z" fill="'+f+'"/><path d="M3 22.5H37V26H3Z" fill="'+f+'"/><path d="M10 18.5C13 14.2 18 12.7 25 13.4L30 18.5" fill="none" stroke-width="1.6"/><path d="M20 5V10" fill="none" stroke-width="1.6"/></g>';
    if(type==='cogwheel'){
      const pts=[];const teeth=10;
      for(let i=0;i<teeth;i++){const a=-Math.PI/2+i*2*Math.PI/teeth;for(const [offset,r] of [[-.34,13],[.34,13],[.48,10.1],[.52,10.1]]){const angle=a+offset*2*Math.PI/teeth;pts.push((20+Math.cos(angle)*r).toFixed(2)+','+(16+Math.sin(angle)*r).toFixed(2));}}
      const outer=pts.map((p,i)=>(i?'L ':'M ')+p).join(' ')+' Z';
      return '<path d="'+outer+' M20 9.8A6.2 6.2 0 1 0 20 22.2A6.2 6.2 0 1 0 20 9.8Z" fill="'+f+'" fill-rule="evenodd" stroke="'+s+'" stroke-width="1.8" stroke-linejoin="round"/>';
    }
    return '';
  }
  function previewMarkup(type, pathOverride){
    const gold='#b08a13',navy='#17213b',white='#ffffff',stroke='stroke="'+navy+'" stroke-width="1.8" stroke-linejoin="round"';
    const paths={
      hstripe:'<rect x="3" y="11" width="34" height="10" rx="1" fill="'+gold+'" '+stroke+'/>',
      vstripe:'<rect x="14" y="2" width="12" height="28" rx="1" fill="'+gold+'" '+stroke+'/>',
      circle:'<circle cx="20" cy="16" r="12" fill="'+gold+'" '+stroke+'/>',
      star:'<polygon points="20,2 24,11 35,12 27,19 29,29 20,24 11,29 13,19 5,12 16,11" fill="'+gold+'" '+stroke+'/>',
      triangle:'<polygon points="20,3 36,29 4,29" fill="'+gold+'" '+stroke+'/>',
      cross:'<path d="M15 3h10v9h9v9h-9v9H15v-9H6v-9h9z" fill="'+gold+'" '+stroke+'/>',
      crescent:'<path d="M27 4A13 13 0 1 0 33 25A10 10 0 0 1 27 4Z" fill="'+gold+'" '+stroke+'/>',
      diamond:'<polygon points="20,2 36,16 20,30 4,16" fill="'+gold+'" '+stroke+'/>',
      'yin-yang':'<circle cx="20" cy="16" r="13" fill="'+white+'" '+stroke+'/><path d="M20 3A6.5 6.5 0 0 1 20 16A6.5 6.5 0 0 0 20 29A13 13 0 0 0 20 3Z" fill="'+navy+'"/><circle cx="20" cy="9.5" r="2" fill="'+white+'"/><circle cx="20" cy="22.5" r="2" fill="'+navy+'"/>',
      pentagon:'<polygon points="20,2 37,13 31,30 9,30 3,13" fill="'+gold+'" '+stroke+'/>',
      hexagon:'<polygon points="10,3 30,3 38,16 30,29 10,29 2,16" fill="'+gold+'" '+stroke+'/>',
      octagon:'<polygon points="12,2 28,2 37,11 37,21 28,30 12,30 3,21 3,11" fill="'+gold+'" '+stroke+'/>',
      'six-star':'<polygon points="20,2 24,11 35,5 29,16 38,20 29,24 35,29 24,23 20,31 16,23 5,29 11,20 2,16 11,12 5,5 16,11" fill="'+gold+'" '+stroke+'/>',
      'eight-star':'<polygon points="20,1 24,10 33,3 29,13 39,16 29,19 33,29 24,22 20,31 16,22 7,29 11,19 1,16 11,13 7,3 16,10" fill="'+gold+'" '+stroke+'/>',
      'four-star':'<polygon points="20,1 24,12 38,16 24,20 20,31 16,20 2,16 16,12" fill="'+gold+'" '+stroke+'/>',
      'twelve-star':'<polygon points="20,1 23,10 29,4 28,13 38,10 31,17 38,21 29,22 32,30 24,25 20,31 16,25 8,30 11,22 2,21 9,17 2,10 12,13 11,4 17,10" fill="'+gold+'" '+stroke+'/>',
      ring:'<circle cx="20" cy="16" r="12" fill="'+gold+'" '+stroke+'/><circle cx="20" cy="16" r="6" fill="'+white+'" '+stroke+'/>',
      ellipse:'<ellipse cx="20" cy="16" rx="16" ry="10" fill="'+gold+'" '+stroke+'/>',
      rectangle:'<rect x="3" y="5" width="34" height="22" rx="1" fill="'+gold+'" '+stroke+'/>',
      parallelogram:'<polygon points="11,4 38,4 29,28 2,28" fill="'+gold+'" '+stroke+'/>',
      trapezoid:'<polygon points="11,4 29,4 38,28 2,28" fill="'+gold+'" '+stroke+'/>',
      arrow:'<path d="M2 11h21V3l15 13-15 13v-8H2z" fill="'+gold+'" '+stroke+'/>',
      chevron:'<path d="M4 3h11l11 13-11 13H4l11-13z" fill="'+gold+'" '+stroke+'/>',
      shield:'<path d="M4 4h32v13Q32 27 20 31 8 27 4 17Z" fill="'+gold+'" '+stroke+'/>',
      heart:'<path d="M20 29 5 15Q1 7 9 4q7-2 11 6 4-8 11-6 8 3 4 11Z" fill="'+gold+'" '+stroke+'/>',
      sunburst:'<g fill="'+gold+'" '+stroke+'><circle cx="20" cy="16" r="7"/><path d="M18 1h4l1 8h-6zM18 23h4l1 8h-6zM4 14h8v4H4zM28 14h8v4h-8zM7 4l7 7-3 3-7-7zM29 20l7 7-3 3-7-7zM29 12l7-7 3 3-7 7zM7 28l7-7 3 3-7 7z"/></g>',
      wave:'<path d="M2 9Q10 1 20 9T38 9v14Q28 31 20 23T2 23Z" fill="'+gold+'" '+stroke+'/>',
      crown:'<path d="M3 9 12 17 20 4 28 17 37 9 33 28H7Z" fill="'+gold+'" '+stroke+'/>',
      torch:'<path d="M20 2Q31 10 20 16 9 10 20 2M14 16h12l-2 14h-8z" fill="'+gold+'" '+stroke+'/>',
      mountain:'<path d="m2 28 12-20 6 9 5-7 13 18Z" fill="'+gold+'" '+stroke+'/>',
      tree:'<path d="M20 2 8 16h7L5 24h11v6h8v-6h11l-10-8h7Z" fill="'+gold+'" '+stroke+'/>',
      bird:'<path d="M2 20Q10 4 20 16 30 4 38 20L25 17 20 25 15 17Z" fill="'+gold+'" '+stroke+'/>',
      globe:'<circle cx="20" cy="16" r="13" fill="none" '+stroke+'/><ellipse cx="20" cy="16" rx="6" ry="13" fill="none" '+stroke+'/><path d="M8 9h24M7 23h26" fill="none" '+stroke+'/>',
      fleur:'<path d="M20 3Q9 8 16 16L8 12Q3 20 17 22L14 29h12l-3-7Q37 20 32 12l-8 4Q31 8 20 3Z" fill="'+gold+'" '+stroke+'/>',
      anchor:canonicalSymbolBody('anchor',gold,navy,white),
      'iron-cross':'<path d="M15 2h10v9h9v10h-9v9H15v-9H6V11h9z" fill="'+gold+'" '+stroke+'/>',
      fasces:'<g '+stroke+' fill="'+gold+'"><path d="M11 3h18v27H11z"/><path d="M6 5 34 27M34 5 6 27" fill="none"/></g>',
      eagle:'<path d="M20 3 24 12 38 7 30 19 35 26 23 23 20 30 17 23 5 26 10 19 2 7 16 12Z" fill="'+gold+'" '+stroke+'/>',
      skull:'<circle cx="20" cy="11" r="8" fill="'+gold+'" '+stroke+'/><path d="M13 17v7h14v-7M16 24v5M20 24v5M24 24v5M5 25l10-5M35 25l-10-5" fill="none" '+stroke+'/>',
      fist:'<path d="M9 15V9q0-4 4-4t4 4V3q5-3 6 3v4q5-4 6 2v5l4 4-3 10H12L7 21Z" fill="'+gold+'" '+stroke+'/>',
      swords:'<path d="M6 3 26 23M34 3 14 23M22 19l8 8M18 19l-8 8" fill="none" '+stroke+' stroke-width="3"/><path d="m4 2 6 1-3 5zM36 2l-6 1 3 5z" fill="'+gold+'"/>',
      lightning:'<polygon points="23,1 8,18 18,18 14,31 32,12 22,12" fill="'+gold+'" '+stroke+'/>',
      'hammer-sickle':'<path d="M5 6h20v5H5zM13 11h5v17h-5zM25 4Q37 7 32 20L28 27 24 24 28 17Q32 10 25 9Z" fill="'+gold+'" '+stroke+'/>',
      swastika:'<path d="M14 4h7v10h10v7H21v10h-7V21H4v-7h10Z" fill="'+gold+'" '+stroke+'/>',
      'double-eagle':'<path d="M20 9 9 3 3 7 9 17 3 23 14 22 20 29 26 22 37 23 31 17 37 7 31 3Z" fill="'+gold+'" '+stroke+'/>',
      laurel:'<path d="M7 28Q1 15 10 4l5 7 5-8 5 8 5-7q9 11 3 24M7 28l26-23" fill="none" '+stroke+' stroke-width="2.5"/>',
      sceptre:'<circle cx="20" cy="6" r="4" fill="'+gold+'" '+stroke+'/><path d="M18 10h4v20h-4zM12 16h16" fill="'+gold+'" '+stroke+'/>',
      'crowned-shield':'<path d="M8 9 13 3 20 8 27 3 32 9M5 11h30v7Q31 27 20 31 9 27 5 18Z" fill="'+gold+'" '+stroke+'/>',
      rifles:'<path d="M5 5 31 27M35 5 9 27M8 6l-4 4M32 6l4 4" fill="none" '+stroke+' stroke-width="3"/>',
      cannons:'<circle cx="12" cy="23" r="5" fill="'+gold+'" '+stroke+'/><circle cx="28" cy="23" r="5" fill="'+gold+'" '+stroke+'/><path d="M5 10h19l6 6M35 10H16l-6 6" fill="none" '+stroke+' stroke-width="4"/>',
      helmet:canonicalSymbolBody('helmet',gold,navy,white),
      spears:'<path d="M5 29 30 4M35 29 10 4M26 4l4-3 3 4M7 4l3-3 4 4" fill="none" '+stroke+' stroke-width="2.5"/>',
      cogwheel:canonicalSymbolBody('cogwheel',gold,navy,white),
      'arrow-cross':'<path d="M17 2h6v10h10v6h-6l5 5-4 4-5-5v9h-6v-9l-5 5-4-4 5-5H7v-6h10Z" fill="'+gold+'" '+stroke+'/>',
      'black-sun':'<circle cx="20" cy="16" r="5" fill="'+gold+'" '+stroke+'/><g stroke="'+navy+'" stroke-width="3"><path d="M20 1v10M20 21v10M4 16h11M25 16h11M9 5l8 8M23 19l8 8M31 5l-8 8M17 19l-8 8"/></g>',
      wolfsangel:'<path d="M9 3h18v7H16v10h11v7H9v-7h7V10H9Z" fill="'+gold+'" '+stroke+'/>',
      totenkopf:'<circle cx="20" cy="10" r="8" fill="'+gold+'" '+stroke+'/><path d="M12 16h16v12H12zM16 23v5M24 23v5" fill="'+gold+'" '+stroke+'/>',
      'fasces-variant':'<path d="M13 3h14v27H13zM5 7l30 18M35 7 5 25" fill="'+gold+'" '+stroke+'/>',
      'interlocking-rings':'<circle cx="14" cy="16" r="9" fill="none" '+stroke+' stroke-width="3"/><circle cx="26" cy="16" r="9" fill="none" '+stroke+' stroke-width="3"/>',
      compass:'<polygon points="20,1 24,12 36,16 24,20 20,31 16,20 4,16 16,12" fill="'+gold+'" '+stroke+'/>',
      'ornamental-knot':'<path d="M5 16Q5 4 17 8L23 24Q35 28 35 16T23 8L17 24Q5 28 5 16Z" fill="none" '+stroke+' stroke-width="3"/>',
      rosette:'<g fill="'+gold+'" '+stroke+'><circle cx="20" cy="16" r="5"/><circle cx="20" cy="7" r="5"/><circle cx="29" cy="16" r="5"/><circle cx="20" cy="25" r="5"/><circle cx="11" cy="16" r="5"/></g>',
      armband:'<path d="M4 9h32v14H4z" fill="'+gold+'" '+stroke+'/><path d="M4 13h32M4 19h32" stroke="'+navy+'" stroke-width="2"/>',
      'party-badge':'<circle cx="20" cy="16" r="13" fill="'+gold+'" '+stroke+'/><circle cx="20" cy="16" r="8" fill="none" '+stroke+'/>',
      text:'<text x="20" y="24" text-anchor="middle" font-size="23" font-weight="bold" fill="'+navy+'">T</text>'
    };
    if(pathOverride && safeLibraryPath(pathOverride)) return '<svg viewBox="0 0 40 32" aria-hidden="true" focusable="false"><path d="'+pathOverride+'" fill="'+gold+'" stroke="'+navy+'" stroke-width="1.2" stroke-linejoin="round" fill-rule="evenodd"/></svg>';
    const configured = window.liquindoFlagmakerShapeConfig?.[type];
    if(configured?.path_d && safeLibraryPath(configured.path_d)) {
      return '<svg viewBox="0 0 40 32" aria-hidden="true" focusable="false"><path d="'+configured.path_d+'" fill="'+gold+'" stroke="'+navy+'" stroke-width="1.2" stroke-linejoin="round" fill-rule="evenodd"/></svg>';
    }
    let body=paths[type];
    if(!body){body='<text x="20" y="19" text-anchor="middle" font-size="7" fill="'+navy+'">'+String(type).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,12)+'</text>';}
    if(type==='ellipse'){} 
    return '<svg viewBox="0 0 40 32" aria-hidden="true" focusable="false">'+body+'</svg>';
  }
  window.liquindoShapePreviewMarkup = previewMarkup;
})();
