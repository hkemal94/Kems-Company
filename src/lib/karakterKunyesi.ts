/**
 * Kişi maddesinin kısa künyesi (ad, yaş, rol, uyruk…). Tutarlılık denetimi
 * kullanır. 1 Ekim (K-3): Duzada.tsx'ten buraya taşındı; denetim yüzünden
 * bütün Düzada sayfası ve harita uygulama açılırken iniyordu.
 */
export function getCharacterKunye(activeEntity: any) {
  if (!activeEntity) {
    return {
      ad: '', yas: '', rol: '', uyruk: '', fizik: '', sac: '', gozler: '',
      kisilik: '', sevdikleri: '', sevmedikleri: '', hobiler: '', summaryText: ''
    };
  }

  // Inner clean helper for short fields (Ad, Yaş, Rol, Uyruk) to keep them clean and short
  const cleanShortField = (val: string, maxLen: number = 35): string => {
    if (!val) return '';
    const cleanVal = val.trim();
    
    // Check if it's "Belirtilmedi" or equivalent
    const l = cleanVal.toLowerCase();
    if (l === 'belirtilmedi' || l === 'bilinmiyor' || l === 'bilinmemektedir' || l === 'n/a' || l === 'açıklanmadı') {
      return '';
    }
    
    if (cleanVal.length <= maxLen && !cleanVal.includes('.') && !cleanVal.includes(';')) {
      return cleanVal;
    }
    
    // Split on common sentence boundaries
    const sentenceEnd = cleanVal.match(/[.!?]/);
    let firstSentence = cleanVal;
    if (sentenceEnd && sentenceEnd.index !== undefined) {
      firstSentence = cleanVal.substring(0, sentenceEnd.index).trim();
    }
    
    // Also split on common clause delimiters like comma, semicolon, "ve", "veya", "ile"
    const parts = firstSentence.split(/[,;|]|\s+(?:ve|veya|ile|ama)\s+/i);
    let candidate = parts[0].trim();
    
    if (candidate.length > maxLen) {
      const words = candidate.split(/\s+/);
      if (words.length > 3) {
        candidate = words.slice(0, 3).join(' ');
      } else {
        candidate = candidate.substring(0, maxLen);
      }
    }
    
    return candidate.replace(/[.,;:\-_]+$/, '').trim();
  };

  // Dedicated cleaning for Uyruk to guarantee it remains a short phrase/abbreviation
  const cleanUyruk = (val: string): string => {
    if (!val) return '';
    const cleanVal = val.trim();
    const lower = cleanVal.toLowerCase();

    if (lower.startsWith('t.c.') || lower.startsWith('t.c') || lower.startsWith('tc') || lower.includes('türk') || lower.includes('turkish')) {
      return 'T.C.';
    }
    
    const mappings = [
      { keys: ['alman', 'germany', 'german'], value: 'Alman' },
      { keys: ['hint', 'india'], value: 'Hint' },
      { keys: ['çin', 'china', 'chinese'], value: 'Çin' },
      { keys: ['tunus'], value: 'Tunuslu' },
      { keys: ['lübnan'], value: 'Lübnanlı' },
      { keys: ['türkmen'], value: 'Türkmen' },
      { keys: ['rus', 'russia'], value: 'Rus' },
      { keys: ['fas'], value: 'Faslı' },
      { keys: ['italy', 'italyan'], value: 'İtalyan' },
      { keys: ['mısır', 'egypt'], value: 'Mısırlı' },
      { keys: ['yunan'], value: 'Yunan' },
      { keys: ['fransız', 'french'], value: 'Fransız' },
      { keys: ['ingiliz', 'british', 'english'], value: 'İngiliz' },
      { keys: ['amerikan', 'american'], value: 'Amerikan' },
    ];

    for (const mapping of mappings) {
      for (const key of mapping.keys) {
        if (lower.includes(key)) {
          return mapping.value;
        }
      }
    }

    const firstWord = cleanVal.split(/\s+/)[0];
    const cleanedWord = firstWord.replace(/[.,;:]+$/, '').trim();
    if (cleanedWord.length > 0 && cleanedWord.length < 15) {
      return cleanedWord;
    }

    return cleanVal.slice(0, 15);
  };

  // Inner helper for descriptive fields (Fizik, Saç, Gözler, Kişilik, Sevdikleri, Sevmedikleri, Hobiler)
  // Ensure no field is a full paragraph
  const cleanDescriptiveField = (val: string): string => {
    if (!val) return '';
    const cleanVal = val.trim();
    
    const lower = cleanVal.toLowerCase();
    if (lower === 'belirtilmedi' || lower === 'bilinmiyor' || lower === 'bilinmemektedir' || lower === 'n/a' || lower === 'açıklanmadı') {
      return '';
    }
    
    if (cleanVal.length <= 100) {
      return cleanVal;
    }
    
    const sentenceEnd = cleanVal.match(/[.!?]/);
    if (sentenceEnd && sentenceEnd.index !== undefined && sentenceEnd.index > 10) {
      return cleanVal.substring(0, sentenceEnd.index + 1).trim();
    }
    
    return cleanVal.substring(0, 97).trim() + '...';
  };

  // Eski otel simülasyonunun kişi listesi silindi (29 Eylül); künye yalnız
  // kaydın kendisinden okunur.
  const imported: null | Record<string, any> = null as any;

  let ad = cleanShortField(activeEntity.title);
  let yas: string | number = '';
  let rol = '';
  let uyruk = '';
  let fizik = '';
  let sac = '';
  let gozler = '';
  let kisilik = '';
  let sevdikleri = '';
  let sevmedikleri = '';
  let hobiler = '';

  const notesStr = activeEntity.notes || '';
  const lines = notesStr.split('\n');
  
  // Try to parse Uyruk: T.C. or similar from notes
  const uyrukMatch = notesStr.match(/Uyruk:\s*([^,\n\r*]+)/i);
  if (uyrukMatch) {
    uyruk = cleanUyruk(uyrukMatch[1]);
  } else if (activeEntity.metadata?.profile?.nationality) {
    uyruk = cleanUyruk(activeEntity.metadata.profile.nationality);
  }

  // Try to parse Yaş from notes
  const yasMatch = notesStr.match(/Yaş:\s*(\d+)/i);
  if (yasMatch) {
    yas = parseInt(yasMatch[1]);
  } else if (activeEntity.metadata?.profile?.age) {
    const ageVal = activeEntity.metadata.profile.age;
    if (typeof ageVal === 'number') {
      yas = ageVal;
    } else {
      const match = String(ageVal).match(/(\d+)/);
      yas = match ? parseInt(match[1]) : cleanShortField(String(ageVal), 10);
    }
  }

  // Try to parse Rol / Meslek / Görev
  if (activeEntity.metadata?.profile?.profession) {
    rol = cleanShortField(activeEntity.metadata.profile.profession);
  } else if (activeEntity.metadata?.profile?.role_tag) {
    rol = cleanShortField(activeEntity.metadata.profile.role_tag);
  } else if (activeEntity.metadata?.profile?.role) {
    rol = cleanShortField(activeEntity.metadata.profile.role);
  }

  // Robust field matcher for bullet items
  const getFieldVal = (lbl: string) => {
    for (const line of lines) {
      const cl = line.trim();
      const lower = cl.toLowerCase();
      const index = lower.indexOf(lbl.toLowerCase() + ':');
      if (index === 0 || (index > 0 && ['*', '-', ' ', '•'].includes(cl[0]))) {
        return cl.substring(cl.indexOf(':') + 1).trim();
      }
    }
    return '';
  };

  const rolFromNotes = getFieldVal('rol') || getFieldVal('meslek') || getFieldVal('görev') || getFieldVal('iş');
  if (rolFromNotes) {
    rol = cleanShortField(rolFromNotes);
  }

  fizik = cleanDescriptiveField(getFieldVal('fizik'));
  sac = cleanDescriptiveField(getFieldVal('saç'));
  gozler = cleanDescriptiveField(getFieldVal('gözler'));
  kisilik = cleanDescriptiveField(getFieldVal('kişilik'));
  sevdikleri = cleanDescriptiveField(getFieldVal('sevdikleri'));
  sevmedikleri = cleanDescriptiveField(getFieldVal('sevmedikleri'));
  hobiler = cleanDescriptiveField(getFieldVal('hobiler'));

  // Override/enrich with imported data if available
  if (imported) {
    if (imported.yas) yas = imported.yas;
    if (imported.rol) rol = cleanShortField(imported.rol);
    if (imported.fizik) fizik = cleanDescriptiveField(imported.fizik);
    if (imported.sac) sac = cleanDescriptiveField(imported.sac);
    if (imported.gozler) gozler = cleanDescriptiveField(imported.gozler);
    if (imported.kisilik) kisilik = cleanDescriptiveField(imported.kisilik);
    if (imported.sevdikleri) sevdikleri = cleanDescriptiveField(imported.sevdikleri);
    if (imported.sevmedikleri) sevmedikleri = cleanDescriptiveField(imported.sevmedikleri);
    if (imported.hobiler) hobiler = cleanDescriptiveField(imported.hobiler);

    if (!uyruk) {
      uyruk = "T.C.";
    }
  }

  // Metadata fallbacks
  if (!fizik && activeEntity.metadata?.profile?.physics) fizik = cleanDescriptiveField(activeEntity.metadata.profile.physics);
  if (!sac && activeEntity.metadata?.profile?.hair) sac = cleanDescriptiveField(activeEntity.metadata.profile.hair);
  if (!gozler && activeEntity.metadata?.profile?.eyes) gozler = cleanDescriptiveField(activeEntity.metadata.profile.eyes);
  if (!kisilik && activeEntity.metadata?.profile?.personality) kisilik = cleanDescriptiveField(activeEntity.metadata.profile.personality);
  if (!sevdikleri && activeEntity.metadata?.profile?.likes) sevdikleri = cleanDescriptiveField(activeEntity.metadata.profile.likes);
  if (!sevmedikleri && activeEntity.metadata?.profile?.dislikes) sevmedikleri = cleanDescriptiveField(activeEntity.metadata.profile.dislikes);
  if (!hobiler && activeEntity.metadata?.profile?.hobbies) hobiler = cleanDescriptiveField(activeEntity.metadata.profile.hobbies);

  // Form Kısa Özet (1-2 sentences maximum, no field repetition!)
  let summaryLines: string[] = [];
  for (const line of lines) {
    const cl = line.trim();
    if (!cl) continue;
    // Skip bullet fields and headers
    if (cl.startsWith('*') || cl.startsWith('-')) continue;
    if (cl.toLowerCase().includes(activeEntity.title.toLowerCase()) && (cl.includes('—') || cl.includes('-') || cl.includes('('))) {
      continue;
    }
    if (cl.match(/Yaş:\s*\d+/i) && cl.match(/Uyruk:/i)) {
      continue;
    }
    if (cl === '---') continue;
    
    // Check if it is a field start line without * marker
    const lower = cl.toLowerCase();
    if (lower.startsWith('fizik:') || lower.startsWith('saç:') || lower.startsWith('gözler:') || lower.startsWith('kişilik:') || lower.startsWith('sevdikleri:') || lower.startsWith('sevmedikleri:') || lower.startsWith('hobiler:')) {
      continue;
    }

    summaryLines.push(cl);
  }

  let summaryText = summaryLines.join('\n').trim();

  if (imported && (!summaryText || summaryText.length < 10)) {
    if (imported.ayrinti && imported.ayrinti.length > 0) {
      summaryText = imported.ayrinti.slice(0, 2).join(' ');
    }
  }

  if (!summaryText) {
    if (rol) {
      summaryText = `${ad}, The Imperial Kemsköy bünyesinde ${rol.toLowerCase()} olarak görev almaktadır.`;
    } else {
      summaryText = `${ad}, Düzada sakinlerinden ve The Imperial Kemsköy misafirlerinden biridir.`;
    }
  }

  summaryText = summaryText.replace(/^\*\s*Ayrıntı:\s*/i, '').replace(/^Ayrıntı:\s*/i, '').trim();

  // Keep to 1-2 sentences maximum
  const sentences = summaryText.split(/(?<=[.!?])\s+/);
  if (sentences.length > 2) {
    summaryText = sentences.slice(0, 2).join(' ');
  }

  // Ensure "Belirtilmedi" / empty values are set to empty string
  const isValueValid = (val: any) => {
    if (val === undefined || val === null || val === '') return false;
    const l = String(val).trim().toLowerCase();
    return l !== 'belirtilmedi' && l !== 'bilinmiyor' && l !== 'bilinmemektedir' && l !== 'n/a' && l !== 'açıklanmadı';
  };

  return {
    ad: isValueValid(ad) ? ad : '',
    yas: isValueValid(yas) ? yas : '',
    rol: isValueValid(rol) ? rol : '',
    uyruk: isValueValid(uyruk) ? uyruk : '',
    fizik: isValueValid(fizik) ? fizik : '',
    sac: isValueValid(sac) ? sac : '',
    gozler: isValueValid(gozler) ? gozler : '',
    kisilik: isValueValid(kisilik) ? kisilik : '',
    sevdikleri: isValueValid(sevdikleri) ? sevdikleri : '',
    sevmedikleri: isValueValid(sevmedikleri) ? sevmedikleri : '',
    hobiler: isValueValid(hobiler) ? hobiler : '',
    summaryText
  };
}
