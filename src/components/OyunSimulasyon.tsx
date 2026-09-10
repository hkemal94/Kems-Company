import React, { useState, useEffect, useMemo } from 'react';
import { Item } from '../types';
import { 
  RotateCcw, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, XCircle, 
  Map, Settings, HelpCircle, FileText, Phone, Check, X, AlertTriangle, 
  Sparkles, ChevronRight, Volume2, VolumeX, Globe, Shield, Calendar, MapPin,
  Award, History, Eye, BookMarked, Lock, User, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Düzada Lore Secrets Album
const DUZADA_SECRETS = [
  "Duman'ın Tasması: Kedinin boynundaki gümüş tasmanın içinde 'Liman 54 Deposu - Şifre: 1954' yazmaktadır. Bu kasanın içinde adanın kamulaştırılmadan önceki tapu kayıtları saklıdır.",
  "Sari El-Hassan'ın Kimliği: Sari El-Hassan, adada aslında Kemskøy ailesinin 1954'te gömdüğü altın külçelerin yerini gösteren eski Osmanlı tapu haritasını aramaktadır.",
  "Oda 203 Klima Fısıltıları: Oda 203'ün klima borularından gelen sesler rüzgardan ibaret değil; fırtınalı gecelerde 'Kemskøy' adını tekrarlayan eski bir mors alfabesi yayını duyulmaktadır.",
  "Cemal Müdürü'nün Geçmişi: Cemal Salda, otel müdürü olmadan önce Ankara'da gizli servis arşiv görevlisiydi. Buraya adadaki yabancı istihbarat hareketlerini izlemek için yerleştirilmiştir.",
  "Lodos Fırtınası Şişesi: Lodos fırtınaları sırasında kıyıya vuran yeşil şişelerin içinde, 1954 yılında yarım kalmış 'Düzada Sürgünü' adlı yasaklı bir el yazmasının sayfaları rulo halinde çıkmaktadır.",
  "Erdal Sönmez'in Siyah Çantası: Erdal Sönmez'in odasında unuttuğu deri çantada, Düzada'nın altındaki antik tünel şebekesinin giriş noktalarını (biri otel mahzenine bağlanıyor) gösteren kroki bulunmaktadır.",
  "Reyhan'ın Gizli Günlüğü: Reyhan Üsküp'ün lobi koltuğunda düşürdüğü defterde: 'Otel avlusundaki mermer çeşmenin altında sarnıca inen gizli bir kapak var, her gece oradan fenerle birileri iniyor' yazıyor.",
  "Klaus Schmidt'in Çizimleri: Klaus Schmidt'in her akşam Peron Restaurant'ta çizdiği karakalem resimlerin arka yüzünde, oteldeki konukların Düzada'daki gizli tarikat hiyerarşisindeki rütbeleri çizilmiştir.",
  "Liman 54 Etkinliği Gerçeği: Liman 54 kapanış şenliği bir veda partisi değil; adadan kaçırılacak antik eserlerin fırtına örtüsü altında yabancı bir şilebe yüklenmesi operasyonunun paravanıdır.",
  "Nusret Demir'in Teybi: Güvenlik Müdürü Nusret Demir'in kulübesindeki eski kasetçalar, lobideki tüm telefon hatlarını ve oda içi konuşmaları yasadışı olarak kaydetmektedir.",
  "Düzada Sürgünü: 1954 yılında otelin açılış gecesinde ortadan kaybolan ilk müdürün, otel duvarlarının arkasındaki dar koridorlarda hala yaşadığı ve misafirleri izlediği söylenmektedir."
];

// Weekdays mapping
const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

// Date mapping helper based on Day index
function getDayDate(chapterIndex: number): string {
  const baseDay = 5; // Start with Oct 5 for calculation (Day 1 = Oct 6)
  const calculatedDay = baseDay + chapterIndex;
  return `${calculatedDay} Ekim 2003`;
}

function getDayName(chapterIndex: number): string {
  const index = (chapterIndex - 1) % 7;
  return WEEKDAYS[index];
}

function getDayWeather(chapterIndex: number): string {
  const weathers = [
    "Serin, bulutlu · Rüzgar hızı: 14 km/s",
    "Rüzgarlı, hafif yağmurlu · Nem oranı: %84",
    "Yoğun sisli, serin · Görüş mesafesi düşük",
    "Fırtınalı, lodoslu · Deniz dalgalı",
    "Lodos fırtınası, nemli · Vapur seferleri iptal",
    "Soğuk, yağışlı lobi fenerleri yanıyor",
    "Fırtına dindi, serin esinti",
    "Parçalı bulutlu, sakin lobi havası",
    "Serin sonbahar güneşi",
    "Sisli liman havası",
    "Kuvvetli poyraz, soğuk",
    "Yağışlı, rüzgarlı lobi pencereleri",
    "Hafif sisli, kapalı deniz manzarası",
    "Sezon kapanışı fırtınası"
  ];
  return weathers[(chapterIndex - 1) % weathers.length];
}

// Define interface for operations/Islem
export interface Islem {
  id: string;
  order: number;
  type: 'check-in' | 'walk-in' | 'escort' | 'check-out' | 'call' | 'post-it' | 'event';
  whoWhat: string;
  description: string;
  correctAction: string;
  linkedMechanicId?: string;
  linkedCharacterId?: string;
  linkedRoomId?: string;
  effect: string;
}

export interface RoomState {
  num: string;
  floor: number;
  type: string;
  status: 'boş' | 'dolu' | 'bakım';
  guestName?: string;
}

interface OyunSimulasyonProps {
  activeDay: Item | null;
  allPlaces: Item[];
  allCharacters: Item[];
  allMechanics: Item[];
  days?: Item[];
  onSelectItem?: (id: string | null) => void;
}

export default function OyunSimulasyon({
  activeDay,
  allPlaces,
  allCharacters,
  allMechanics,
  days = [],
  onSelectItem
}: OyunSimulasyonProps) {
  // --- STATE FOR MAIN HOME PAGES TABS ---
  // "vardiya" | "kroki" | "puanlar" | "sirlar"
  const [activeHomeTab, setActiveHomeTab] = useState<'vardiya' | 'kroki' | 'puanlar' | 'sirlar'>('vardiya');

  // --- STATE FOR PLAYING THE ACTIVE SHIFT ---
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isShiftStarted, setIsShiftStarted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);

  // Overlays / Summary States
  const [showDaySummary, setShowDaySummary] = useState<boolean>(false);
  const [showWeekSummary, setShowWeekSummary] = useState<boolean>(false);

  // Modals state
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [guideSlide, setGuideSlide] = useState<number>(0);

  // Settings State
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<'kolay' | 'normal' | 'zor'>('normal');

  // Interaction panel State
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isCorrectSelected, setIsCorrectSelected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealEffect, setRevealEffect] = useState<boolean>(false);
  const [activeDecisionTab, setActiveDecisionTab] = useState<'islemler' | 'telefon'>('islemler');
  const [dialStatus, setDialStatus] = useState<string | null>(null);

  const operations: Islem[] = activeDay?.metadata?.operations || [];
  const currentChapterIndex = activeDay?.metadata?.chapterIndex || 1;

  // --- LOCAL PERSISTENCE SYSTEM ---
  const [gameProgress, setGameProgress] = useState<{
    completedDays: Record<string, { score: number; errors: number; rank: string; date: string; title: string }>;
    unlockedSecrets: number[];
    cumulativeScore: number;
    cumulativeErrors: number;
    lastActiveDayId: string | null;
    lastActiveStep: number;
  }>(() => {
    const saved = localStorage.getItem('kemskoy_game_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            completedDays: parsed.completedDays || {},
            unlockedSecrets: parsed.unlockedSecrets || [],
            cumulativeScore: parsed.cumulativeScore || 0,
            cumulativeErrors: parsed.cumulativeErrors || 0,
            lastActiveDayId: parsed.lastActiveDayId || null,
            lastActiveStep: parsed.lastActiveStep || 0
          };
        }
      } catch (e) {
        console.error("Error reading saved progress", e);
      }
    }
    return {
      completedDays: {},
      unlockedSecrets: [],
      cumulativeScore: 0,
      cumulativeErrors: 0,
      lastActiveDayId: null,
      lastActiveStep: 0
    };
  });

  // Save progress automatically
  useEffect(() => {
    localStorage.setItem('kemskoy_game_progress', JSON.stringify(gameProgress));
  }, [gameProgress]);

  // Sync state on day change
  useEffect(() => {
    setCurrentStep(0);
    setIsShiftStarted(false);
    setSelectedChoiceId(null);
    setIsCorrectSelected(false);
    setErrorMessage(null);
    setRevealEffect(false);
    setScore(0);
    setErrors(0);
    setShowDaySummary(false);
    setActiveDecisionTab('islemler');
    setDialStatus(null);
  }, [activeDay]);

  // Reset states on step change
  useEffect(() => {
    setSelectedChoiceId(null);
    setIsCorrectSelected(false);
    setErrorMessage(null);
    setRevealEffect(false);
    setActiveDecisionTab('islemler');
    setDialStatus(null);
  }, [currentStep]);

  // Main active op
  const activeOp = operations[currentStep];

  // Derive Expected departures dynamically
  const expectedDepartures = useMemo(() => {
    const departures = operations
      .filter((op: any) => op.type === 'check-out')
      .map((op: any) => {
        const rMatch = op.description.match(/Oda\s*(\d{3})/i) || op.correctAction.match(/Oda\s*(\d{3})/i);
        const roomStr = rMatch ? `Oda ${rMatch[1]}` : "Oda 203";
        return { name: op.whoWhat, room: roomStr };
      });

    if (departures.length === 0) {
      return [
        { name: "M. Çeliker", room: "Oda 105" },
        { name: "H. Müller", room: "Oda 302" }
      ];
    }
    return departures;
  }, [operations]);

  // Multiple choice generation (Tactile reception decision cards)
  const choices = useMemo(() => {
    if (!activeOp) return [];
    
    const correctText = activeOp.correctAction;
    const distractor1 = `Giriş prosedürlerini boşver, kimlik istemeyi atla ve lobi güvenlik şefi Nusret Demir'e bildirmeden misafiri içeri al.`;
    
    const distractor2 = activeOp.linkedRoomId 
      ? `Misafiri fırtına veya tadilat nedeniyle bakıma alınmış arızalı odalardan birine (Oda 203 klima arızası veya Oda 304 boya tadilatı) yerleştir.`
      : `Otel kurallarını tamamen es geçerek, lobi kayıt defterini doldurmadan misafire doğrudan anahtarı teslim et.`;

    const list = [
      { id: 'correct', text: correctText, isCorrect: true },
      { id: 'dist1', text: distractor1, isCorrect: false },
      { id: 'dist2', text: distractor2, isCorrect: false }
    ];

    // Pseudo-random deterministic sorting based on description length
    const seed = (activeOp.description?.length || 0) % 3;
    if (seed === 1) {
      return [list[1], list[0], list[2]];
    } else if (seed === 2) {
      return [list[2], list[1], list[0]];
    }
    return list;
  }, [activeOp]);

  // Dynamic mapping of active guest details based on name
  const getGuestDetails = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('alper')) return { age: 34, nation: 'T.C.' };
    if (n.includes('reyhan')) return { age: 34, nation: 'T.C.' };
    if (n.includes('emir')) return { age: 37, nation: 'T.C.' };
    if (n.includes('barbaros')) return { age: 36, nation: 'T.C.' };
    if (n.includes('feride')) return { age: 41, nation: 'T.C.' };
    if (n.includes('erdal')) return { age: 52, nation: 'T.C.' };
    if (n.includes('seda')) return { age: 33, nation: 'T.C.' };
    if (n.includes('priya')) return { age: 31, nation: 'HİNT' };
    if (n.includes('mei')) return { age: 29, nation: 'ÇİN' };
    if (n.includes('ceren')) return { age: 26, nation: 'T.C.' };
    if (n.includes('aylin')) return { age: 27, nation: 'T.C.' };
    if (n.includes('mehmet')) return { age: 45, nation: 'T.C.' };
    if (n.includes('klaus')) return { age: 58, nation: 'ALMAN' };
    if (n.includes('nazlı') || n.includes('nazli')) return { age: 38, nation: 'T.C.' };
    if (n.includes('jasmin')) return { age: 23, nation: 'TUNUS' };
    if (n.includes('ilgaz')) return { age: 29, nation: 'T.C.' };
    if (n.includes('yasemin')) return { age: 29, nation: 'T.C.' };
    if (n.includes('sari')) return { age: 22, nation: 'LÜBNAN' };
    if (n.includes('gülya') || n.includes('gulya')) return { age: 23, nation: 'TÜRKMEN' };
    if (n.includes('öykü') || n.includes('oyku')) return { age: 29, nation: 'T.C.' };
    if (n.includes('tanju')) return { age: 30, nation: 'T.C.' };
    if (n.includes('lena')) return { age: 35, nation: 'ALMAN' };
    if (n.includes('elena')) return { age: 24, nation: 'RUS' };
    if (n.includes('can')) return { age: 28, nation: 'T.C.' };
    if (n.includes('neslihan')) return { age: 34, nation: 'T.C.' };
    if (n.includes('osman')) return { age: 44, nation: 'T.C.' };
    if (n.includes('cem')) return { age: 41, nation: 'T.C.' };
    if (n.includes('hans')) return { age: 63, nation: 'ALMAN' };
    if (n.includes('yusuf')) return { age: 48, nation: 'T.C.' };
    if (n.includes('nadia')) return { age: 24, nation: 'FAS' };
    if (n.includes('ahmet')) return { age: 55, nation: 'T.C.' };
    if (n.includes('sofia')) return { age: 38, nation: 'İTALYAN' };
    if (n.includes('leyla')) return { age: 25, nation: 'MISIR' };
    if (n.includes('selim')) return { age: 29, nation: 'T.C.' };
    
    return { age: 30, nation: 'T.C.' };
  };

  // Determine correct and active buttons for the current operation
  const buttonMapping = useMemo(() => {
    if (!activeOp) return { correct: '', active: [] as string[] };
    
    const desc = (activeOp.description || '').toLowerCase();
    const title = (activeOp.whoWhat || '').toLowerCase();
    const type = activeOp.type;
    
    // 1. Check-out
    if (type === 'check-out') {
      return {
        correct: 'check_out',
        active: ['check_out', 'check_in', 'reddedildi']
      };
    }
    
    // 2. Call
    if (type === 'call') {
      return {
        correct: 'odayi_ara',
        active: ['odayi_ara', 'lobide_beklet', 'reddedildi']
      };
    }
    
    // 3. Escort / Ziyaretçi / Visitor
    if (type === 'escort' || desc.includes('ziyaret') || desc.includes('eskort')) {
      return {
        correct: 'odayi_ara',
        active: ['odayi_ara', 'kimlik_1', 'reddedildi']
      };
    }
    
    // 4. Pet / Kedi / Köpek
    if (desc.includes('pet') || desc.includes('kedi') || desc.includes('köpek') || desc.includes('duman')) {
      return {
        correct: 'pet',
        active: ['pet', 'kimlik_1', 'check_in', 'reddedildi']
      };
    }
    
    // 5. Expired ID / Passport
    if (desc.includes('süresi dol') || desc.includes('geçersiz') || desc.includes('pasaport') || desc.includes('evrak-eksik')) {
      return {
        correct: 'pasaport',
        active: ['pasaport', 'kimlik_1', 'check_in', 'reddedildi']
      };
    }
    
    // 6. Refused / Problem guests
    if (
      title.includes('mehmet arslan') || 
      title.includes('elena petrova') || 
      desc.includes('reddedil') || 
      desc.includes('alkollü') || 
      desc.includes('şüpheli')
    ) {
      return {
        correct: 'reddedildi',
        active: ['reddedildi', 'kimlik_1', 'check_in']
      };
    }
    
    // 7. Walk-in
    if (type === 'walk-in') {
      return {
        correct: 'check_in',
        active: ['check_in', 'musaitlik', 'reddedildi']
      };
    }
    
    // 8. Companion
    if (desc.includes('refakatçi') || desc.includes('eşi')) {
      return {
        correct: 'kimlik_2',
        active: ['kimlik_2', 'kimlik_1', 'check_in', 'reddedildi']
      };
    }
    
    // 9. Post-it / Event
    if (type === 'post-it' || type === 'event') {
      if (desc.includes('arıza') || desc.includes('klima') || desc.includes('boya') || desc.includes('tadilat') || desc.includes('oda 203') || desc.includes('oda 304')) {
        return {
          correct: 'musaitlik',
          active: ['musaitlik', 'lobide_beklet', 'odayi_ara']
        };
      }
      return {
        correct: 'lobide_beklet',
        active: ['lobide_beklet', 'odayi_ara', 'musaitlik']
      };
    }
    
    // Default standard check-in
    return {
      correct: 'check_in',
      active: ['kimlik_1', 'check_in', 'reddedildi']
    };
  }, [activeOp]);

  // Handle click on decision deck action buttons
  const handleActionButtonClick = (actionId: string, label: string) => {
    if (selectedChoiceId) return; // Locked
    
    const isCorrect = actionId === buttonMapping.correct;
    setSelectedChoiceId(actionId);
    
    if (isCorrect) {
      setIsCorrectSelected(true);
      setErrorMessage(null);
      setScore(prev => prev + 15);
    } else {
      setIsCorrectSelected(false);
      setErrors(prev => prev + 1);
      
      // Fine-grained thematic feedback messages depending on the chosen action
      let msg = `❌ YANLIŞ İŞLEM! "${label}" kararı bu misafir için doğru prosedür değildi. Otel kuralları ihlal edildi.`;
      if (actionId === 'reddedildi') {
        msg = `❌ YANLIŞ İŞLEM! Misafirin tüm belgeleri noksansız ve otel kurallarına uygundur. Girişini haksız yere reddettiğiniz için müdürden uyarı aldınız.`;
      } else if (actionId === 'check_in') {
        msg = `❌ YANLIŞ İŞLEM! Bu misafirden henüz kimlik belgesi, pasaport beyanı veya evcil hayvan depozitosu alınmadan aceleyle giriş yapıldı.`;
      } else if (actionId === 'pet') {
        msg = `❌ YANLIŞ İŞLEM! Misafirin yanında evcil hayvan bulunmamaktadır. Pet pasaportu ve depozito prosedürü uygulayamazsınız.`;
      } else if (actionId === 'pasaport') {
        msg = `❌ YANLIŞ İŞLEM! Misafirin kimlik süresi dolmamıştır veya pasaport beyanı yapması gerekmemektedir.`;
      } else if (actionId === 'odayi_ara') {
        msg = `❌ YANLIŞ İŞLEM! Odadaki misafiri aramanızı gerektiren bir ziyaretçi veya teyit durumu mevcut değildir.`;
      } else if (actionId === 'check_out') {
        msg = `❌ YANLIŞ İŞLEM! Misafir çıkış yapmak için gelmedi, lobiye yeni giriş yaptı veya bir servis talebinde bulunuyor.`;
      } else if (actionId === 'musaitlik') {
        msg = `❌ YANLIŞ İŞLEM! Bu misafirin zaten onaylı bir oda rezervasyonu var, oda müsaitliği sorgulamanıza gerek yoktu.`;
      }
      setErrorMessage(msg);
    }
  };

  // Handle Select Choice (Left column buttons moved to right column decisions)
  const handleSelectChoice = (choice: { id: string; text: string; isCorrect: boolean }) => {
    if (selectedChoiceId) return; // Prevent multiple clicks on the same step

    setSelectedChoiceId(choice.id);
    if (choice.isCorrect) {
      setIsCorrectSelected(true);
      setErrorMessage(null);
      setScore(prev => prev + 15);
    } else {
      setIsCorrectSelected(false);
      setErrors(prev => prev + 1);
      setErrorMessage("❌ YANLIŞ İŞLEM! Otel kuralları ihlal edildi veya misafir tepki gösterdi. Lütfen kural kartlarına uyun.");
    }
  };

  const handleNext = () => {
    if (isCorrectSelected) {
      if (currentStep < operations.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Last step finished! Show Day Summary
        setShowDaySummary(true);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsShiftStarted(false);
    setSelectedChoiceId(null);
    setIsCorrectSelected(false);
    setErrorMessage(null);
    setRevealEffect(false);
    setScore(0);
    setErrors(0);
    setShowDaySummary(false);
    setShowWeekSummary(false);
  };

  // Completely wipe local storage to start clean
  const handleFullReset = () => {
    localStorage.removeItem('kemskoy_game_progress');
    setGameProgress({
      completedDays: {},
      unlockedSecrets: [],
      cumulativeScore: 0,
      cumulativeErrors: 0,
      lastActiveDayId: null,
      lastActiveStep: 0
    });
    handleReset();
  };

  // Complete the current day and register metrics
  const triggerCompleteDay = () => {
    if (!activeDay) return;

    const dayKey = activeDay.id;
    const isNew = !gameProgress.completedDays[dayKey];

    let rank = "Görkemli Resepsiyonist";
    if (errors > 1) rank = "İdare Eder";
    if (errors > 2) rank = "Gözetim Altında";

    // Unlock secret of the day
    const secretIndex = (currentChapterIndex - 1) % DUZADA_SECRETS.length;
    const updatedSecrets = gameProgress.unlockedSecrets.includes(secretIndex)
      ? gameProgress.unlockedSecrets
      : [...gameProgress.unlockedSecrets, secretIndex];

    if (isNew) {
      setGameProgress(prev => ({
        ...prev,
        completedDays: {
          ...prev.completedDays,
          [dayKey]: { 
            score, 
            errors, 
            rank, 
            date: getDayDate(currentChapterIndex),
            title: activeDay.title 
          }
        },
        unlockedSecrets: updatedSecrets,
        cumulativeScore: prev.cumulativeScore + score,
        cumulativeErrors: prev.cumulativeErrors + errors,
        lastActiveDayId: null,
        lastActiveStep: 0
      }));
    }

    // Check if there is a next day
    const nextChapterIndex = currentChapterIndex + 1;
    const nextDay = days.find(d => d.metadata?.chapterIndex === nextChapterIndex);

    if (nextDay) {
      // Go to next day
      if (onSelectItem) {
        onSelectItem(nextDay.id);
      }
    } else {
      // Last day of the project / week finished!
      setShowDaySummary(false);
      setShowWeekSummary(true);
    }
  };

  const unlockedLoreSecret = useMemo(() => {
    if (!isCorrectSelected) return null;
    return DUZADA_SECRETS[currentStep % DUZADA_SECRETS.length];
  }, [isCorrectSelected, currentStep]);

  // Derived weather and dates
  const dateStr = getDayDate(currentChapterIndex);
  const dayNameStr = getDayName(currentChapterIndex);
  const weatherStr = getDayWeather(currentChapterIndex);

  // Custom Memo based on chapter index
  const getSaldaMemoText = (chapter: number) => {
    switch (chapter) {
      case 1:
        return "İlk vardiyanıza hoş geldiniz. Sezon kapanışına çok az kaldı. Bugün evrak ve kimlik doğrulama süreçlerine tam dikkat gösterin. Limanda pet taşıtları kontrol edilmeli.";
      case 2:
        return "Ada genelinde lodos fırtınası uyarısı bulunuyor. Lobi rüzgar koruyucularını taktırın. Fırtınada limana sığınan yabancılara karşı tetikte olun ve pasaport isteyin.";
      case 3:
        return "Oda 203'teki klima su sızıntısı büyüdü. Burası kesinlikle bakıma alındı. Hiçbir misafiri ne pahasına olursa olsun Oda 203'e yerleştirmeyin, alternatif sunun.";
      case 4:
        return "Liman 54 kapanış şenlikleri sebebiyle adaya giriş çıkışlar yoğunlaştı. Şüpheli evraklı veya şüpheli tavırlı tipleri güvenlik müdürü Nusret'e acil bildirin.";
      case 5:
        return "Oda 304'te elektrik tesisatı arızası tespit edildi. Boya tadilatı ve elektrik bakımında. Odayı kesinlikle boş tutun. Gözünüzü lobi telefonlarından ayırmayın.";
      default:
        return "Kemskøy kuralları her zaman geçerlidir. Giriş, çıkış, walk-in ve kurye teslimatlarında kimlik veya imza almadan asla anahtar teslimi yapmayın.";
    }
  };

  const activeMemoText = getSaldaMemoText(currentChapterIndex);

  // --- HOTEL BLUEPRINT (KROKI) CALCULATION ---
  const hotelState = useMemo<Record<string, RoomState>>(() => {
    const rooms: Record<string, RoomState> = {};
    const roomNumbers = [
      '101', '102', '103', '104', '105',
      '201', '202', '203', '204', '205',
      '301', '302', '303', '304', '305',
      '401', '402', '403', '404', '405'
    ];

    roomNumbers.forEach(num => {
      const floor = parseInt(num[0], 10);
      let type = 'Standart';
      if (num.endsWith('3')) type = 'Suite';
      else if (num.endsWith('4') || num.endsWith('5')) type = 'Deluxe';

      const isMaintenance = (num === '203' || num === '304');

      rooms[num] = {
        num,
        floor,
        type,
        status: isMaintenance ? 'bakım' : 'boş'
      };
    });

    // Run active day operations up to the current step (or all if shift not running or completed)
    const activeOps = isShiftStarted ? operations.slice(0, currentStep) : operations;

    activeOps.forEach((op: Islem) => {
      let rNum: string | null = null;
      const match = op.description.match(/Oda\s*(\d{3})/i) || op.correctAction.match(/Oda\s*(\d{3})/i);
      if (match) {
        rNum = match[1];
      }

      if (rNum && rooms[rNum]) {
        if (rooms[rNum].status === 'bakım') return; // Maintenance takes precedence
        
        if (op.type === 'check-in' || op.type === 'walk-in') {
          rooms[rNum].status = 'dolu';
          rooms[rNum].guestName = op.whoWhat;
        } else if (op.type === 'check-out') {
          rooms[rNum].status = 'boş';
          rooms[rNum].guestName = undefined;
        }
      }
    });

    return rooms;
  }, [operations, isShiftStarted, currentStep]);

  // Group rooms by floors (4 down to 1) for rendering
  const floorRooms = useMemo(() => {
    const floors: Record<number, RoomState[]> = { 4: [], 3: [], 2: [], 1: [] };
    Object.values(hotelState).forEach((r: RoomState) => {
      floors[r.floor].push(r);
    });
    return floors;
  }, [hotelState]);

  // Compute stats
  const stats = useMemo(() => {
    const all = Object.values(hotelState) as RoomState[];
    const total = all.length;
    const maintenance = all.filter((r: RoomState) => r.status === 'bakım').length;
    const occupied = all.filter((r: RoomState) => r.status === 'dolu').length;
    const available = total - maintenance - occupied;
    const occupancyRate = total > 0 ? Math.round((occupied / (total - maintenance)) * 100) : 0;

    return { total, maintenance, occupied, available, occupancyRate };
  }, [hotelState]);

  // Is active day already completed?
  const isDayCompleted = activeDay ? !!gameProgress.completedDays[activeDay.id] : false;

  if (operations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FAF6F0] dark:bg-[#111] text-amber-800 dark:text-amber-500/80 font-mono text-xs border border-dashed border-amber-800/30 rounded-xl space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-700 dark:text-amber-500 animate-pulse" />
        <div className="text-center space-y-2 max-w-sm">
          <p className="font-bold uppercase font-serif text-sm text-stone-800 dark:text-stone-200">SİMÜLASYON BAŞLATILAMIYOR</p>
          <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
            Seçili gün için henüz herhangi bir operasyon işlemi tasarlanmadı. Lütfen önce "Senaryo Tasarımcısı" sekmesinden işlemler ekleyin veya AI'dan gün akışı taslağı üretin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAF6F0] dark:bg-[#0f0f0f] rounded-2xl border border-stone-300 dark:border-stone-800 overflow-hidden shadow-xl min-h-[660px] h-full font-serif select-none relative">
      
      {/* 1. ANASAYFA (HOME SCREEN) - Rendered if shift is not started */}
      {!isShiftStarted ? (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          
          {/* Imperial Header Block */}
          <div className="bg-[#1B3B2B] dark:bg-[#122319] p-6 text-center border-b-2 border-stone-800 dark:border-amber-700/50 space-y-2 relative">
            <h1 className="text-2xl font-serif font-bold text-[#EAD2AC] tracking-widest uppercase">
              THE IMPERIAL KEMSKØY
            </h1>
            <p className="text-[10px] font-mono tracking-wider text-[#FAF6F0]/80">
              LOBİ KOMUTA VE RESEPSİYON SİMÜLASYON MASASI • EST. 1954
            </p>
            
            {/* Quick Stats Banner */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-3 text-[#EAD2AC] text-[10px] font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <span>Skor: +{gameProgress.cumulativeScore}</span>
              <span>|</span>
              <span>Hata: {gameProgress.cumulativeErrors}</span>
            </div>
          </div>

          {/* Home Screen Navigation Tabs */}
          <div className="flex border-b border-stone-300 dark:border-stone-800 bg-[#F2ECE4] dark:bg-[#141414] text-[11px] font-sans font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveHomeTab('vardiya')}
              className={`flex-1 py-3 text-center transition-all ${activeHomeTab === 'vardiya' ? 'bg-[#FAF6F0] dark:bg-[#0f0f0f] text-[#1B3B2B] dark:text-[#EAD2AC] border-b-2 border-[#1B3B2B] dark:border-[#EAD2AC]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'}`}
            >
              💼 Vardiya Kontrol
            </button>
            <button
              onClick={() => setActiveHomeTab('kroki')}
              className={`flex-1 py-3 text-center transition-all ${activeHomeTab === 'kroki' ? 'bg-[#FAF6F0] dark:bg-[#0f0f0f] text-[#1B3B2B] dark:text-[#EAD2AC] border-b-2 border-[#1B3B2B] dark:border-[#EAD2AC]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'}`}
            >
              🗺️ Otel Krokisi &amp; Katlar
            </button>
            <button
              onClick={() => setActiveHomeTab('puanlar')}
              className={`flex-1 py-3 text-center transition-all ${activeHomeTab === 'puanlar' ? 'bg-[#FAF6F0] dark:bg-[#0f0f0f] text-[#1B3B2B] dark:text-[#EAD2AC] border-b-2 border-[#1B3B2B] dark:border-[#EAD2AC]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'}`}
            >
              🏆 Sicil &amp; Puanlama
            </button>
            <button
              onClick={() => setActiveHomeTab('sirlar')}
              className={`flex-1 py-3 text-center transition-all ${activeHomeTab === 'sirlar' ? 'bg-[#FAF6F0] dark:bg-[#0f0f0f] text-[#1B3B2B] dark:text-[#EAD2AC] border-b-2 border-[#1B3B2B] dark:border-[#EAD2AC]' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'}`}
            >
              📖 Kanon Sırları ({gameProgress.unlockedSecrets.length}/11)
            </button>
          </div>

          {/* Tab Content Areas */}
          <div className="flex-1 p-6">
            
            {/* TAB A: VARDIYA KONTROL */}
            {activeHomeTab === 'vardiya' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
                
                {/* Left Card: Active Day Details */}
                <div className="lg:col-span-7 bg-[#FAF6F0] dark:bg-[#161616] p-6 rounded-xl border border-stone-300 dark:border-stone-800 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start border-b border-stone-200 dark:border-stone-800 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-stone-400 block uppercase">AKTİF SEÇİLİ GÜN</span>
                      <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
                        Gün {currentChapterIndex} - {dayNameStr}
                      </h2>
                      <p className="text-[11px] font-sans text-stone-500 dark:text-stone-400 tracking-wide mt-0.5">
                        {dateStr} • {weatherStr}
                      </p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                      %{stats.occupancyRate} Doluluk
                    </span>
                  </div>

                  {/* Salda Directive Typewriter */}
                  <div className="p-4 bg-[#FAF8F5] dark:bg-black/30 border-l-4 border-amber-600 rounded-r-lg space-y-2">
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-500 text-[10px] font-mono font-bold uppercase">
                      <FileText className="w-3.5 h-3.5" />
                      <span>TALİMATNAME — MÜDÜR CEMAL SALDA</span>
                    </div>
                    <p className="text-xs font-serif leading-relaxed italic text-stone-700 dark:text-stone-300">
                      "{activeMemoText}"
                    </p>
                  </div>

                  {/* Expected Departures / Arrivals Quick Glance */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-stone-100/60 dark:bg-stone-900 border border-stone-200 dark:border-stone-800/80 rounded-lg">
                      <span className="text-[9px] font-mono font-bold text-stone-400 block uppercase mb-1">GİRİŞ YAPACAK MİSAFİRLER</span>
                      <div className="text-[11px] font-sans font-bold space-y-1">
                        {operations.filter(op => op.type === 'check-in' || op.type === 'walk-in').slice(0, 3).map((op, idx) => (
                          <div key={idx} className="truncate text-stone-800 dark:text-stone-300">👤 {op.whoWhat}</div>
                        ))}
                        {operations.filter(op => op.type === 'check-in' || op.type === 'walk-in').length === 0 && (
                          <span className="text-stone-400 text-[10px] font-normal">Beklenen giriş bulunmuyor</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-stone-100/60 dark:bg-stone-900 border border-stone-200 dark:border-stone-800/80 rounded-lg">
                      <span className="text-[9px] font-mono font-bold text-stone-400 block uppercase mb-1">BEKLENEN ODA ÇIKIŞLARI</span>
                      <div className="text-[11px] font-sans font-bold space-y-1 text-stone-800 dark:text-stone-300">
                        {expectedDepartures.slice(0, 3).map((dep, idx) => (
                          <div key={idx} className="truncate">🔑 {dep.name} ({dep.room})</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons to start shift */}
                  <div className="flex items-center gap-4 pt-4 border-t border-stone-200 dark:border-stone-800">
                    <button
                      onClick={() => setIsShiftStarted(true)}
                      className="flex-1 py-3 bg-[#1B3B2B] hover:bg-[#152F22] text-[#FAF6F0] font-serif font-bold text-sm rounded-lg border-2 border-stone-800 dark:border-amber-700/50 shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>VARDİYAYI BAŞLAT ➔</span>
                    </button>
                    
                    <button
                      onClick={handleReset}
                      className="p-3 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg border border-stone-300 dark:border-stone-700 shadow-sm cursor-pointer transition-all active:scale-95"
                      title="Sıfırla"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Column: Custom rules index card */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 bg-white dark:bg-[#181818] border border-stone-300 dark:border-stone-800 rounded-xl space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase text-[#1B3B2B] dark:text-[#EAD2AC] border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      RESEPSİYON REHBERİ
                    </h3>
                    <ul className="text-xs leading-relaxed space-y-2 text-stone-600 dark:text-stone-300 font-sans">
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#1B3B2B] dark:text-[#EAD2AC] font-bold mt-0.5">•</span>
                        <span>Tüm kararları **sağ paneldeki** butonları veya seçenekleri kullanarak onaylayın.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#1B3B2B] dark:text-[#EAD2AC] font-bold mt-0.5">•</span>
                        <span>Yanlış kararlarda sicilinize hata (X) işlenir. 3 hataya ulaşırsanız vardiya iptal edilir.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#1B3B2B] dark:text-[#EAD2AC] font-bold mt-0.5">•</span>
                        <span>Her başarılı ve doğru işlem adasında gizli bir lore sırrını açar!</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400 text-xs flex items-start gap-2 leading-relaxed">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>İpucu:</strong> Günlük talimatnameyi dikkatle okuyun. Özellikle lodoslu günlerde ve bakım durumlarında odaların güncel durumları kuralları etkiler.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB B: OTEL KROKİSİ & KATLAR */}
            {activeHomeTab === 'kroki' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  💡 Bu kroki, seçtiğiniz günün tüm operasyonlarının tamamlanmış haline göre odaların doluluk durumunu listeler.
                </div>

                {/* Quick stats indicators */}
                <div className="grid grid-cols-4 gap-4 text-center font-mono text-[10px]">
                  <div className="p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
                    <span className="block text-stone-400">Toplam Oda</span>
                    <strong className="text-stone-800 dark:text-stone-200 text-sm">{stats.total}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
                    <span className="block text-green-600 dark:text-green-400">Boş</span>
                    <strong className="text-green-600 dark:text-green-400 text-sm">{stats.available}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
                    <span className="block text-amber-600 dark:text-amber-500">Dolu</span>
                    <strong className="text-amber-600 dark:text-amber-500 text-sm">{stats.occupied}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
                    <span className="block text-rose-600 dark:text-rose-400">Bakım</span>
                    <strong className="text-rose-600 dark:text-rose-400 text-sm">{stats.maintenance}</strong>
                  </div>
                </div>

                {/* Floors layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {[4, 3, 2, 1].map(floorNum => (
                    <div key={floorNum} className="bg-white dark:bg-[#161616] border border-stone-200 dark:border-stone-800 p-4 rounded-xl space-y-3 shadow-2xs">
                      <h4 className="text-[10px] font-mono font-bold text-stone-400 border-b border-stone-100 dark:border-stone-800 pb-1 uppercase tracking-wider">
                        🏢 {floorNum}. KAT
                      </h4>
                      <div className="space-y-2">
                        {floorRooms[floorNum]?.map(room => {
                          let style = "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400";
                          if (room.status === 'bakım') {
                            style = "bg-rose-50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 opacity-80";
                          } else if (room.status === 'dolu') {
                            style = "bg-amber-50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400";
                          }
                          return (
                            <div key={room.num} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-sans ${style}`}>
                              <span className="font-mono font-bold">{room.num}</span>
                              <div className="text-right text-[10px]">
                                <span className="font-mono opacity-80 block text-[9px] uppercase">{room.type}</span>
                                <span className="font-bold">
                                  {room.status === 'bakım' ? '🛠️ BAKIM' : room.status === 'dolu' ? `👤 ${room.guestName?.split(' ')[0]}` : '✓ BOŞ'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB C: SICIL & PUANLAMA */}
            {activeHomeTab === 'puanlar' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-[#161616] p-6 rounded-xl border border-stone-300 dark:border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">BİRİKMİŞ TOPLAM SKOR</span>
                    <div className="text-4xl font-serif font-bold text-amber-600 dark:text-amber-400">
                      +{gameProgress.cumulativeScore}
                    </div>
                  </div>
                  <div className="space-y-1 border-y md:border-y-0 md:border-x border-stone-200 dark:border-stone-800 py-4 md:py-0">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">TOPLAM ALINAN HATA</span>
                    <div className="text-4xl font-serif font-bold text-red-600 dark:text-red-400">
                      {gameProgress.cumulativeErrors}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-stone-400 uppercase">TAMAMLANAN GÜNLER</span>
                    <div className="text-4xl font-serif font-bold text-emerald-600 dark:text-emerald-400">
                      {Object.keys(gameProgress.completedDays).length} / {days.length || 7}
                    </div>
                  </div>
                </div>

                {/* Score list */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 dark:border-stone-800 pb-1.5">
                    GÜNLÜK RESEPSİYON DEĞERLENDİRME RAPORLARI
                  </h3>
                  {Object.keys(gameProgress.completedDays).length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-xs border border-dashed border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-[#161616]">
                      Henüz tamamlanmış bir vardiya kaydı bulunmuyor. İlk günü tamamlayarak başlayın!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(Object.entries(gameProgress.completedDays) as [string, { score: number; errors: number; rank: string; date: string; title: string }][]).map(([key, item]) => (
                        <div key={key} className="p-4 bg-white dark:bg-[#161616] border border-stone-200 dark:border-stone-800 rounded-xl flex justify-between items-center">
                          <div className="space-y-1 font-serif">
                            <span className="text-[9px] font-mono text-amber-600 dark:text-amber-500 font-bold uppercase">{item.date}</span>
                            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200 leading-snug">{item.title}</h4>
                            <span className="inline-block text-[9px] font-mono bg-stone-100 dark:bg-stone-900 px-2 py-0.5 rounded text-stone-500">
                              Değerlendirme: {item.rank}
                            </span>
                          </div>
                          <div className="text-right font-mono text-xs">
                            <div className="text-green-600 dark:text-green-400 font-bold">+{item.score} Puan</div>
                            <div className="text-red-500">{item.errors} Hata</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear career button */}
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      if (confirm("Tüm sicilinizi silmek ve yeni bir oyuna başlamak istediğinizden emin misiniz?")) {
                        handleFullReset();
                      }
                    }}
                    className="px-4 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-500 rounded-lg text-xs font-sans font-bold cursor-pointer transition-colors"
                  >
                    Sicili Sıfırla &amp; Yeni Oyuna Başla
                  </button>
                </div>
              </div>
            )}

            {/* TAB D: KANON SIRLARI (HİKAYELER) */}
            {activeHomeTab === 'sirlar' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed flex items-start gap-2">
                  <BookMarked className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>Düzada Roman Kanonu Sırları:</strong> Kemskøy otelinin ve adanın derin geçmişine dair arşiv belgeleri. Her vardiya sonunda başarılı işlemleriniz doğrultusunda bu belgelerin kilidi sırayla açılır.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DUZADA_SECRETS.map((secret, index) => {
                    const isUnlocked = gameProgress.unlockedSecrets.includes(index);
                    const title = secret.split(':')[0];
                    const content = secret.split(':')[1];

                    return (
                      <div
                        key={index}
                        className={`p-5 rounded-xl border transition-all ${
                          isUnlocked 
                            ? 'bg-white dark:bg-[#161616] border-stone-300 dark:border-stone-800 shadow-xs' 
                            : 'bg-stone-100 dark:bg-stone-900/30 border-stone-200 dark:border-stone-900 opacity-60 text-stone-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-2 mb-2 font-mono text-[10px] font-bold">
                          {isUnlocked ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-amber-600 dark:text-amber-500 uppercase">ÇÖZÜLDÜ • BELGE #{index + 1}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-stone-400" />
                              <span>KİLİTLİ • BELGE #{index + 1}</span>
                            </>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase font-serif mb-1">
                          {title}
                        </h4>
                        
                        {isUnlocked ? (
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed italic font-serif">
                            "{content.trim()}"
                          </p>
                        ) : (
                          <p className="text-[10px] italic font-mono text-stone-400/80">
                            [Bu belgenin kilidini açmak için simülasyonu başarıyla bitirin ve doğru resepsiyon kararları verin.]
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        
        // 2. ACTIVE GAMEPLAY DESK VIEW (Vardiya Başladı)
        <div className="flex-1 flex flex-col lg:h-full lg:overflow-hidden h-auto overflow-y-auto">
          
          {/* Top Header Bar */}
          <div className="bg-[#1B3B2B] dark:bg-[#122319] text-[#EAD2AC] border-b-2 border-stone-800 dark:border-amber-700/50 px-4 py-3 flex justify-between items-center font-mono text-[10px] shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowGuideModal(true)}
                className="p-1 hover:bg-[#EAD2AC]/10 rounded text-[#EAD2AC] transition-all cursor-pointer"
                title="Yönetmelik / Nasıl Oynanır"
              >
                <FileText className="w-4 h-4" />
              </button>
              <div className="border-l border-[#EAD2AC]/30 h-4 mx-1"></div>
              <span className="font-serif font-bold tracking-wider uppercase text-[11px]">THE IMPERIAL Kemskøy</span>
            </div>

            {/* Game stats and score counters */}
            <div className="flex items-center gap-3 text-[#EAD2AC] font-bold text-[10px]">
              <span title="Gün sayısı">G{currentChapterIndex}</span>
              <span className="text-white/20">|</span>
              <span title="İşlem Adımı">{currentStep + 1}/{operations.length}</span>
              <span className="text-white/20">|</span>
              <span className="text-emerald-400" title="Kazanılan Skor">+{score} S</span>
              <span className="text-white/20">|</span>
              <span className="text-red-400" title="Hatalar">X{errors}/3</span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowMapModal(true)}
                className="px-2 py-1 bg-[#EAD2AC]/10 hover:bg-[#EAD2AC]/20 text-[#EAD2AC] rounded transition-all flex items-center gap-1 cursor-pointer"
              >
                <Map className="w-3 h-3" />
                <span className="hidden sm:inline">Bölüm Haritası</span>
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 bg-[#EAD2AC]/10 hover:bg-[#EAD2AC]/20 text-[#EAD2AC] rounded transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Aktif vardiyadan ayrılmak istiyor musunuz? İlerlemeniz kaydedilecektir.")) {
                    setIsShiftStarted(false);
                  }
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-all cursor-pointer font-bold font-sans"
              >
                Vardiyayı Kapat
              </button>
            </div>
          </div>

          {/* 3-Column Tactical Gameplay Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:overflow-hidden h-auto lg:h-full">
            
            {/* COLUMN 1 (Left 3 cols): REGULATIONS & DIRECTIVES (Dark Forest Green) */}
            <div className="lg:col-span-3 bg-[#1B3B2B] dark:bg-[#122319] border-r-2 border-stone-800 dark:border-amber-700/40 text-[#EAD2AC] p-4 flex flex-col justify-between lg:overflow-y-auto lg:h-full h-auto text-xs font-serif shrink-0">
              <div className="space-y-6">
                
                {/* Günlük Memo */}
                <div className="space-y-2">
                  <h3 className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#EAD2AC]/50 border-b border-[#EAD2AC]/20 pb-1">
                    MÜDÜR TALİMATI
                  </h3>
                  <p className="text-[11px] leading-relaxed text-[#FAF6F0]/90 italic font-serif">
                    "{activeMemoText}"
                  </p>
                </div>

                {/* Yönetmelik ve Kurallar */}
                <div className="space-y-2.5">
                  <h3 className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#EAD2AC]/50 border-b border-[#EAD2AC]/20 pb-1">
                    GÜNLÜK YÖNETMELİK
                  </h3>
                  <div className="space-y-3 font-serif leading-relaxed text-[#FAF6F0]/80 text-[11px]">
                    <div className="space-y-0.5">
                      <strong className="block text-[#EAD2AC] font-mono text-[9px] uppercase">1. KİMLİK KONTROLÜ:</strong>
                      <p>Lobiye giren her misafirin kimlik kayıt evrakını sorgulayın. T.C. hanesi ve isim doğrulanmalıdır.</p>
                    </div>
                    <div className="space-y-0.5">
                      <strong className="block text-[#EAD2AC] font-mono text-[9px] uppercase">2. ARIZALI/BAKIM ODALARI:</strong>
                      <p>Oda 203 (klima) ve Oda 304 (tesisat) kesinlikle kapalı tutulmalıdır. Oraya yerleştirme taleplerini derhal reddedin.</p>
                    </div>
                    {currentChapterIndex >= 2 && (
                      <div className="space-y-0.5">
                        <strong className="block text-[#EAD2AC] font-mono text-[9px] uppercase">3. LODOS &amp; PASAPORT:</strong>
                        <p>Liman sığınmacılarının süresi dolmuş kimliklerinde ek olarak pasaport beyanı aranmalıdır.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Check list */}
                <div className="space-y-2">
                  <h3 className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#EAD2AC]/50 border-b border-[#EAD2AC]/20 pb-1">
                    RESEPSİYON KONTROLLERİ
                  </h3>
                  <div className="space-y-1.5 font-mono text-[10px] text-[#EAD2AC]/80">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input type="checkbox" defaultChecked className="accent-[#EAD2AC]" />
                      <span>1. Kimlik Kartı &amp; Evrak</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input type="checkbox" defaultChecked className="accent-[#EAD2AC]" />
                      <span>2. Oda Durum Tespiti</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input type="checkbox" className="accent-[#EAD2AC]" />
                      <span>3. Kara Liste &amp; Sicil</span>
                    </label>
                  </div>
                </div>

                {/* Beklenen Çıkışlar */}
                <div className="space-y-1.5">
                  <h3 className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#EAD2AC]/50 border-b border-[#EAD2AC]/20 pb-1">
                    BEKLENEN ÇIKIŞLAR
                  </h3>
                  <div className="space-y-1 font-mono text-[9px] text-[#EAD2AC]/70">
                    {expectedDepartures.map((dep, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>👤 {dep.name}</span>
                        <span>{dep.room}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-[#EAD2AC]/10 text-[9px] font-mono text-[#EAD2AC]/30 uppercase tracking-widest text-center shrink-0">
                Liman 54 • Düzada Kanyonu
              </div>
            </div>

            {/* COLUMN 2 (Middle 6 cols): INTERACTIVE DESK & BLUEPRINT GRAPHIC */}
            <div className="lg:col-span-6 bg-[#FAF6F0] dark:bg-[#161513] p-5 flex flex-col justify-between lg:overflow-y-auto space-y-4 lg:h-[529.129px] h-auto">
              
              {/* Dialogue Box Area */}
              <div className="space-y-4">
                
                {/* Guest Profile/Dossier Card (No illustration, elegant text card instead) */}
                <div className="p-4 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl shadow-xs space-y-2 animate-fadeIn font-sans">
                  <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-2">
                    <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                      [LOBİDEKİ AKTİF MİSAFİR DOSYASI]
                    </span>
                    <span className="text-[9px] font-mono bg-[#1B3B2B] text-[#FAF6F0] px-2 py-0.5 rounded uppercase font-bold">
                      {activeOp?.type} talebi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-serif text-stone-800 dark:text-stone-200">
                    <div>
                      <span className="block text-[8px] font-mono text-stone-400 uppercase">KİMLİK/AD</span>
                      <strong className="text-stone-900 dark:text-stone-100">{activeOp?.whoWhat || "Bilinmeyen Misafir"}</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] font-mono text-stone-400 uppercase">UYRUK</span>
                      <strong>T.C. Vatandaşı</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] font-mono text-stone-400 uppercase">KODU</span>
                      <strong className="font-mono">#{(activeOp?.whoWhat?.length || 0) * 19 + 54}</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] font-mono text-stone-400 uppercase">DURUM</span>
                      <span className="text-green-600 font-bold">Evrak Sunuldu</span>
                    </div>
                  </div>
                </div>

                {/* Speech dialogue bubble */}
                <div className="bg-[#1B3B2B] dark:bg-[#122319] text-[#EAD2AC] p-5 rounded-2xl border border-stone-800 dark:border-amber-700/30 relative shadow-md flex flex-col justify-between font-serif">
                  <div className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                    👤 MİSAFİR DİYALOGU:
                  </div>

                  {/* Speech bubble arrow decoration */}
                  <div className="absolute top-8 -left-2.5 w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-[#1B3B2B] dark:border-r-[#122319] border-b-[8px] border-b-transparent hidden sm:block"></div>

                  <p className="text-sm font-sans italic text-white leading-relaxed">
                    "{activeOp?.description}"
                  </p>

                  <div className="text-[8px] font-mono text-[#EAD2AC]/40 text-right mt-3 select-none flex items-center justify-end gap-1">
                    <span>işlem bekliyor</span>
                    <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
                  </div>
                </div>

                {/* Gözlem Defteri (Observation panel) */}
                <div className="p-3 bg-[#FAF6F0] dark:bg-[#1c1b19] border-2 border-dashed border-[#C29B38] dark:border-[#B08C30]/50 rounded-lg text-[#C29B38] font-mono text-[10px] font-bold flex items-center gap-2 shadow-sm">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                  <span>GÖZLEM: Evrakları, oda talebini ve varsa lobi yönergelerini sağdaki panele göre işleme alın.</span>
                </div>

              </div>

              {/* INTEGRATED LIVE COMPACT HOTEL BLUEPRINT RIGHT IN THE MIDDLE AREA */}
              <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-stone-300 dark:border-stone-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-1.5">
                  <h4 className="text-[10px] font-mono font-bold uppercase text-stone-500 flex items-center gap-1">
                    <span>🗺️ REEL-TİME LOBİ ODA BLUEPRINTİ (KROKİ)</span>
                  </h4>
                  <span className="text-[8px] font-mono text-stone-400">%{stats.occupancyRate} DOLU</span>
                </div>

                {/* Compact Grid of Rooms */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {(Object.values(hotelState) as RoomState[]).map(room => {
                    let style = "bg-green-50/70 border-green-200/50 text-green-700 dark:bg-green-950/10 dark:border-green-900/30 dark:text-green-400";
                    if (room.status === 'bakım') {
                      style = "bg-rose-50/70 border-rose-200/50 text-rose-700 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-400 opacity-60";
                    } else if (room.status === 'dolu') {
                      style = "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/15 dark:border-amber-800/30 dark:text-amber-400 font-bold";
                    }

                    return (
                      <div 
                        key={room.num} 
                        className={`p-1.5 border rounded-lg flex flex-col items-center justify-between text-center min-h-[46px] select-none ${style}`}
                        title={`Oda ${room.num} - ${room.status.toUpperCase()}`}
                      >
                        <span className="font-mono font-bold text-[9px]">{room.num}</span>
                        <span className="text-[7px] block font-sans truncate max-w-full uppercase tracking-tight">
                          {room.status === 'bakım' ? '🛠️' : room.status === 'dolu' ? (room.guestName?.split(' ')[0] || 'DOLU') : 'BOŞ'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Step Switchers */}
              <div className="flex items-center justify-between border-t border-stone-300 dark:border-stone-800 pt-3 text-xs font-mono shrink-0 font-sans">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`px-3 py-1.5 border rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[11px] ${
                    currentStep === 0
                      ? 'border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                      : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 text-stone-700 dark:text-stone-300 hover:bg-stone-100/50'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Önceki İşlem
                </button>

                <span className="text-stone-400 text-[8px] uppercase tracking-wider">
                  {isCorrectSelected ? "[GEÇİŞ SERBEST]" : "[DOĞRU KARAR BEKLENİYOR]"}
                </span>

                <button
                  onClick={handleNext}
                  disabled={!isCorrectSelected}
                  className={`px-3 py-1.5 border rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[11px] ${
                    (!isCorrectSelected)
                      ? 'border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-50'
                      : 'border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  }`}
                >
                  {currentStep === operations.length - 1 ? "Günü Bitir ✓" : "Sıradaki İşlem"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* COLUMN 3 (Right 3 cols): DECISION DECK & KARAR PANELI */}
            <div className="lg:col-span-3 bg-[#FAF6F0] dark:bg-[#141312] border-t-2 lg:border-t-0 lg:border-l-2 border-stone-800 dark:border-amber-900/40 p-0 flex flex-col justify-between lg:overflow-y-auto lg:h-full h-auto shrink-0 font-sans">
              
              <div className="flex flex-col">
                {/* Vintage Tabs Header */}
                <div className="grid grid-cols-2 border-b border-stone-300 dark:border-stone-800 shrink-0">
                  <button
                    onClick={() => {
                      setActiveDecisionTab('islemler');
                      setDialStatus(null);
                    }}
                    className={`py-3 text-center text-[10px] font-mono font-bold tracking-widest transition-colors ${
                      activeDecisionTab === 'islemler'
                        ? 'bg-[#1B3B2B] text-[#FAF6F0] dark:bg-[#1E3E2C]'
                        : 'bg-[#EDE7DE] dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:bg-[#E4DCCE] dark:hover:bg-stone-800'
                    }`}
                  >
                    İŞLEMLER
                  </button>
                  <button
                    onClick={() => setActiveDecisionTab('telefon')}
                    className={`py-3 text-center text-[10px] font-mono font-bold tracking-widest transition-colors ${
                      activeDecisionTab === 'telefon'
                        ? 'bg-[#1B3B2B] text-[#FAF6F0] dark:bg-[#1E3E2C]'
                        : 'bg-[#EDE7DE] dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:bg-[#E4DCCE] dark:hover:bg-stone-800'
                    }`}
                  >
                    TELEFON
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {activeDecisionTab === 'islemler' ? (
                    /* 10 DECISION DECK BUTTONS */
                    <div className="space-y-1.5">
                      {[
                        { id: 'kimlik_1', label: '🗉 KİMLİK İSTE (1)', color: 'green' },
                        { id: 'kimlik_2', label: '🗉 KİMLİK İSTE (2)', color: 'green' },
                        { id: 'pet', label: '🐾 PET PASAPORTU', color: 'green' },
                        { id: 'pasaport', label: '🎴 PASAPORT BEYAN', color: 'green' },
                        { id: 'check_in', label: '✓ CHECK-IN', color: 'blue' },
                        { id: 'check_out', label: '⇗ CHECK-OUT', color: 'blue' },
                        { id: 'reddedildi', label: '✕ REDDEDİLDİ', color: 'red' },
                        { id: 'odayi_ara', label: '☏ ODAYI ARA', color: 'gray' },
                        { id: 'lobide_beklet', label: '⌛ LOBİDE BEKLET', color: 'gray' },
                        { id: 'musaitlik', label: '🔍 MÜSAİTLİK', color: 'gray' }
                      ].map((btn) => {
                        const isActive = buttonMapping.active.includes(btn.id);
                        const isSelected = selectedChoiceId === btn.id;
                        
                        let style = "";
                        let disabledAttr = false;

                        if (!isActive) {
                          // Disabled state
                          style = "bg-[#FAF6F0] dark:bg-stone-900 border-[#E9E3D8] dark:border-stone-800 text-stone-400 dark:text-stone-600 opacity-40 cursor-not-allowed";
                          disabledAttr = true;
                        } else {
                          // Active states
                          if (selectedChoiceId) {
                            disabledAttr = true;
                            if (isSelected) {
                              if (isCorrectSelected) {
                                style = "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/20";
                              } else {
                                style = "bg-rose-700 text-white border-rose-700 shadow-md ring-2 ring-rose-500/20 animate-shake";
                              }
                            } else {
                              style = "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-700 opacity-50 cursor-not-allowed";
                            }
                          } else {
                            // Hover/active styles based on colors in image
                            if (btn.color === 'green') {
                              style = "bg-[#1B3B2B] text-white border-[#1B3B2B] hover:bg-[#132A1E] dark:bg-[#1C3E2D] dark:border-[#1C3E2D] dark:hover:bg-[#142D20]";
                            } else if (btn.color === 'blue') {
                              style = "bg-[#1B365D] text-white border-[#1B365D] hover:bg-[#11233D] dark:bg-[#1E314D] dark:border-[#1E314D] dark:hover:bg-[#142236]";
                            } else if (btn.color === 'red') {
                              style = "bg-[#801818] text-white border-[#801818] hover:bg-[#5C1010] dark:bg-[#5C1515] dark:border-[#5C1515] dark:hover:bg-[#420F0F]";
                            } else {
                              style = "bg-[#4E483F] text-white border-[#4E483F] hover:bg-[#3D3831] dark:bg-[#3D362F] dark:border-[#3D362F] dark:hover:bg-[#2C2722]";
                            }
                          }
                        }

                        return (
                          <button
                            key={btn.id}
                            disabled={disabledAttr}
                            onClick={() => handleActionButtonClick(btn.id, btn.label)}
                            className={`w-full py-2 px-3 rounded text-left border transition-all text-[11px] font-mono uppercase tracking-wide flex items-center justify-between cursor-pointer ${style}`}
                          >
                            <span>{btn.label}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold">
                                {isCorrectSelected ? "✓ BAŞARILI" : "✗ HATA"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* RETRO HOTEL TELEPHONE INTERCOM SYSTEM */
                    <div className="space-y-4 animate-fadeIn">
                      <div className="bg-[#FAF6F0] dark:bg-stone-900 border border-stone-300 dark:border-stone-800 p-3 rounded text-center space-y-2 font-serif">
                        <div className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">REZAN INTERCOM - 1954</div>
                        <div className="h-10 flex items-center justify-center bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-stone-850 rounded font-mono text-xs font-bold tracking-widest text-[#1B3B2B] dark:text-[#EAD2AC]">
                          {dialStatus ? "📞 BAĞLANTI KURULDU..." : "☏ HAT SEÇİNİZ"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { ext: '54', label: 'Müdür Cemal', desc: 'İnterkom Hattı' },
                          { ext: '09', label: 'Güvenlik Nusret', desc: 'Lobi Güvenliği' },
                          { ext: '101', label: 'Oda 101 (Lobi)', desc: 'Zemin Standart' },
                          { ext: '205', label: 'Oda 205 (Reyhan)', desc: 'Kat 2 Standart' },
                          { ext: '402', label: 'Oda 402 (Erdal)', desc: 'Kat 4 Deluxe' }
                        ].map((tel) => (
                          <button
                            key={tel.ext}
                            onClick={() => {
                              const isHevesActive = activeOp?.linkedCharacterId === 'kemskoy_companion_heves';
                              if (tel.ext === '402' && isHevesActive) {
                                setDialStatus(`📞 VIP Erdal Sönmez: 'Teyit alındı resepsiyonist. Heves hanımı yukarı yönlendirebilirsin. Kendisi beklenen misafirim.'`);
                              } else if (tel.ext === '402') {
                                setDialStatus(`📞 VIP Erdal Sönmez: 'Resepsiyonist, dinleniyorum. Acil olmayan durumlar dışında lütfen hattı meşgul etmeyin.'`);
                              } else if (tel.ext === '54') {
                                setDialStatus(`📞 Müdür Cemal: 'Kolay gelsin evlat. Lobi düzeni sana emanet, kurallardan asla taviz verme!'`);
                              } else if (tel.ext === '09') {
                                setDialStatus(`📞 Nusret Demir: 'Her şey kontrolüm altında. Bahçe ve sarnıç kapısını devriye geziyorum.'`);
                              } else {
                                setDialStatus(`📞 Oda ${tel.ext}: 'Merhaba resepsiyon, odada her şey yolunda. İyi çalışmalar dileriz.'`);
                              }
                            }}
                            className="p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded hover:bg-stone-50 dark:hover:bg-stone-800 text-left cursor-pointer transition-all w-full"
                          >
                            <div className="text-[10px] font-bold text-[#1B3B2B] dark:text-[#EAD2AC] flex items-center justify-between">
                              <span>{tel.label}</span>
                              <span className="font-mono text-stone-400 text-[9px]">ext: {tel.ext}</span>
                            </div>
                            <div className="text-[8px] text-stone-500 font-sans truncate">{tel.desc}</div>
                          </button>
                        ))}
                      </div>

                      {dialStatus && (
                        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/2 border border-amber-500/20 rounded font-serif text-[10px] italic leading-relaxed text-stone-700 dark:text-stone-300 animate-fadeIn">
                          {dialStatus}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback, Errors and Lore Secrets Card */}
                  {errorMessage && (
                    <div className="p-3 bg-red-100 dark:bg-red-950/20 border border-red-500/30 text-red-800 dark:text-red-400 rounded-lg flex items-start gap-1.5 animate-fadeIn text-[10px] leading-relaxed">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {isCorrectSelected && unlockedLoreSecret && (
                    <div className="p-3 bg-emerald-500/5 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 rounded-xl space-y-2 animate-fadeIn">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <strong className="text-[10px] uppercase font-mono font-bold">
                          DOĞRU İŞLEM: SIR AÇILDI
                        </strong>
                      </div>

                      <div className="bg-[#FAF6F0] dark:bg-black/40 p-2.5 rounded border border-emerald-500/20 text-stone-800 dark:text-stone-300 text-[10px] font-serif leading-relaxed italic">
                        "{unlockedLoreSecret}"
                      </div>

                      {/* Effect report drawer */}
                      <button
                        onClick={() => setRevealEffect(!revealEffect)}
                        className="text-[9px] font-mono text-amber-600 dark:text-amber-500 hover:underline uppercase block text-right w-full font-bold"
                      >
                        {revealEffect ? "Etkiyi Gizle [-]" : "Etki Raporunu Gör [✓]"}
                      </button>

                      {revealEffect && (
                        <p className="text-[9px] font-mono text-stone-500 bg-emerald-500/10 p-1.5 rounded animate-fadeIn leading-relaxed">
                          {activeOp?.effect || "Resepsiyon işlemi başarıyla sisteme kaydedildi. Puan eklendi."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom active guest details profile card */}
              {activeOp && (
                <div className="m-4 p-3 bg-[#D2DBD5] dark:bg-[#1C2C24] border border-[#B8C5BD] dark:border-[#2C4035] rounded-lg font-serif shrink-0 space-y-1">
                  <span className="text-[8px] font-mono font-bold text-[#1B3B2B]/60 dark:text-[#A4B8AC]/60 uppercase tracking-widest block">
                    MİSÁFİR:
                  </span>
                  <div className="text-sm font-bold text-[#1B3B2B] dark:text-[#E2EAE5] uppercase tracking-wide">
                    {activeOp.whoWhat}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-[#1B3B2B]/80 dark:text-[#A4B8AC]/80">
                    {getGuestDetails(activeOp.whoWhat).age} · {getGuestDetails(activeOp.whoWhat).nation}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ================= Day Summary Overlay (Gün Özeti) ================= */}
      <AnimatePresence>
        {showDaySummary && activeDay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-serif"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-[#FAF6F0] dark:bg-[#141414] border-2 border-stone-800 dark:border-amber-700/60 rounded-xl overflow-hidden shadow-2xl p-6 space-y-5"
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-500 uppercase tracking-widest block">VARDİYA TAMAMLANDI RAPORU</span>
                <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100 uppercase">
                  GÜN {currentChapterIndex} ÖZETİ
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                  {dateStr} • {activeDay.title}
                </p>
              </div>

              {/* Stats Card */}
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl grid grid-cols-2 gap-4 text-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-stone-400 block uppercase">KAZANILAN SKOR</span>
                  <strong className="text-xl font-mono text-green-600 dark:text-green-400">+{score} Puan</strong>
                </div>
                <div className="space-y-0.5 border-l border-stone-200 dark:border-stone-800">
                  <span className="text-[9px] font-mono text-stone-400 block uppercase">YAPILAN HATA</span>
                  <strong className="text-xl font-mono text-red-600 dark:text-red-400">{errors} / 3</strong>
                </div>
              </div>

              {/* Cemal Salda Evaluation stamp */}
              <div className="p-4 bg-stone-100 dark:bg-stone-950/40 rounded-lg space-y-1.5 border border-stone-200 dark:border-stone-800/60 text-xs">
                <span className="font-mono text-[9px] text-stone-400 font-bold uppercase tracking-wider block">CEMAL SALDA DEĞERLENDİRMESİ</span>
                <p className="font-serif italic text-stone-700 dark:text-stone-300">
                  {errors === 0 && '"Mükemmel iş çıkardın resepsiyonist. Siciline tek bir leke bile geçmedi. Kemskøy ailesi adına teşekkür ederim."'}
                  {errors === 1 && '"Kabul edilebilir bir performans. Ufak bir hatan oldu ancak lobi nizamı bozulmadı. Devam et."'}
                  {errors === 2 && '"Dikkat et! İki büyük idari prosedür hatası yaptın. Kendine çeki düzen vermezsen müdür odasında görüşmek zorunda kalırız."'}
                  {errors >= 3 && '"Rezalet bir idari kayıt! Lobi nizamı darmadağın oldu. Soruşturma açılabilir."'}
                </p>
              </div>

              {/* Unlocked story teaser */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1 text-xs">
                <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">📖 GÜNLÜK KANON SIRRI AÇILDI</span>
                <p className="font-serif text-stone-700 dark:text-stone-300 italic">
                  "{DUZADA_SECRETS[(currentChapterIndex - 1) % DUZADA_SECRETS.length]}"
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={triggerCompleteDay}
                className="w-full py-3 bg-[#1B3B2B] hover:bg-[#152F22] text-[#FAF6F0] font-serif font-bold text-sm rounded-lg border-2 border-stone-800 dark:border-amber-700/50 shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{currentChapterIndex === days.length ? "Hafta Özetini Gör ➔" : "Sıradaki Güne Geç ➔"}</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= Week Summary Overlay (Hafta Özeti) ================= */}
      <AnimatePresence>
        {showWeekSummary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 font-serif"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-lg bg-[#FAF6F0] dark:bg-[#141414] border-2 border-stone-800 dark:border-amber-700/60 rounded-xl overflow-hidden shadow-2xl p-6 space-y-6 max-h-[90%] overflow-y-auto"
            >
              <div className="text-center space-y-1">
                <span className="text-xs font-mono text-amber-600 dark:text-amber-500 uppercase tracking-widest block">KEMSKØY SEZON DEĞERLENDİRMESİ</span>
                <h3 className="text-3xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                  HAFTA ÖZETİ RAPORU
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans uppercase">
                  Düzada Sezon Kapanışı Kariyer Karnesi
                </p>
              </div>

              {/* Kariyer Karnesi */}
              <div className="p-5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-xl grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-stone-400 block uppercase">TOPLAM PUAN</span>
                  <strong className="text-2xl font-mono text-green-600 dark:text-green-400 font-bold">
                    +{gameProgress.cumulativeScore}
                  </strong>
                </div>
                <div className="space-y-1 border-x border-stone-200 dark:border-stone-800">
                  <span className="text-[9px] font-mono text-stone-400 block uppercase">TOPLAM HATA</span>
                  <strong className="text-2xl font-mono text-red-600 dark:text-red-400 font-bold">
                    {gameProgress.cumulativeErrors}
                  </strong>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-stone-400 block uppercase">SIR ÇÖZÜMÜ</span>
                  <strong className="text-2xl font-mono text-amber-600 dark:text-amber-500 font-bold">
                    {gameProgress.unlockedSecrets.length} / 11
                  </strong>
                </div>
              </div>

              {/* Rütbe Unvan Kartı */}
              <div className="p-4 bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-xl text-center space-y-1.5">
                <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 uppercase tracking-widest block font-bold">HAK KAZANILAN RESMİ LOBİ RÜTBESİ</span>
                <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-amber-300 uppercase">
                  {gameProgress.cumulativeErrors === 0 && "🏆 DÜZADA EFSANESİ BAŞRESEPSİYONİST"}
                  {gameProgress.cumulativeErrors > 0 && gameProgress.cumulativeErrors <= 3 && "✓ GÜVENİLİR MEMUR"}
                  {gameProgress.cumulativeErrors > 3 && gameProgress.cumulativeErrors <= 7 && "✓ SIRADAN BÜROKRAT"}
                  {gameProgress.cumulativeErrors > 7 && "⚠️ SİCİLİ LEKELİ STAJYER"}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-sm mx-auto font-sans">
                  The Imperial Kemskøy idari komitesi tarafından onaylanmıştır. Düzada sürgün senaryolarındaki başarı dereceniz devlet arşivine kaydedilmiştir.
                </p>
              </div>

              {/* Unlocked Secrets list scrapbook */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 dark:border-stone-800 pb-1.5">
                  ÇÖZÜLEN REKOR KANON SIRLARI ALBÜMÜ ({gameProgress.unlockedSecrets.length} / 11)
                </h5>
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {DUZADA_SECRETS.map((secret, idx) => {
                    const isUnlocked = gameProgress.unlockedSecrets.includes(idx);
                    return (
                      <div key={idx} className="p-3 bg-white/60 dark:bg-stone-900/60 rounded-lg text-xs leading-relaxed font-sans border border-stone-200 dark:border-stone-800/80">
                        <strong className="text-stone-800 dark:text-stone-200">{secret.split(':')[0]}:</strong>
                        <p className="italic font-serif text-stone-600 dark:text-stone-400 text-[11px] mt-0.5">
                          {isUnlocked ? secret.split(':')[1] : "[🔒 KİLİTLİ - Doğru kararlarla kilidini açın]"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleFullReset}
                  className="flex-1 py-3 bg-red-700 hover:bg-red-800 text-white font-serif font-bold text-sm rounded-lg shadow cursor-pointer text-center"
                >
                  Sicili Temizle &amp; Yeni Oyuna Başla
                </button>
                <button
                  onClick={() => {
                    setShowWeekSummary(false);
                    setIsShiftStarted(false);
                  }}
                  className="px-5 py-3 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-sans font-bold text-xs rounded-lg cursor-pointer"
                >
                  Anasayfaya Dön
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= Popup Modals Section ================= */}

      {/* A. BÖLÜM HARİTASI (Chapter Map) Modal */}
      {showMapModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-serif">
          <div className="w-full max-w-md bg-[#FAF6F0] dark:bg-[#141414] border-2 border-stone-800 dark:border-amber-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90%]">
            <div className="bg-[#1B3B2B] dark:bg-[#122319] p-4 text-[#EAD2AC] border-b-2 border-stone-800 dark:border-amber-700/50 flex justify-between items-center font-mono">
              <span className="text-xs font-bold tracking-widest">BÖLÜM HARİTASI</span>
              <button 
                onClick={() => setShowMapModal(false)}
                className="text-[#EAD2AC] hover:text-white transition-all cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 border-b border-stone-300 dark:border-stone-800 font-mono text-[10px] uppercase">
              <button className="py-2.5 text-center bg-[#FAF6F0] dark:bg-[#141414] text-stone-800 dark:text-stone-100 font-bold border-r border-stone-300 dark:border-stone-800">
                BÖLÜM I (Sezon Sonu)
              </button>
              <button disabled className="py-2.5 text-center bg-stone-100 dark:bg-stone-900/40 text-stone-400 cursor-not-allowed">
                BÖLÜM II (🔒 Yakında)
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 max-h-[300px] bg-[#FAF6F0] dark:bg-[#141414]">
              {days.map((day) => {
                const dayNum = day.metadata?.chapterIndex || 1;
                const isActive = activeDay?.id === day.id;
                return (
                  <button
                    key={day.id}
                    onClick={() => {
                      if (onSelectItem) {
                        onSelectItem(day.id);
                        handleReset();
                        setShowMapModal(false);
                      }
                    }}
                    className={`w-full p-3 border rounded-lg text-left transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-[#1B3B2B] text-white border-stone-800 dark:border-amber-700/50 shadow-md' 
                        : 'bg-[#F2ECE4] hover:bg-stone-100 border-stone-300 text-stone-800 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className={`text-[9px] font-mono font-bold block ${isActive ? 'text-amber-300' : 'text-stone-500'}`}>
                        GÜN {dayNum} - {getDayName(dayNum)}
                      </span>
                      <strong className="text-xs font-serif">{day.title}</strong>
                    </div>
                    <div className="text-[10px] font-mono opacity-80 whitespace-nowrap">
                      {getDayDate(dayNum)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-stone-300 dark:border-stone-800 bg-[#F2ECE4] dark:bg-[#111] flex justify-end shrink-0">
              <button
                onClick={() => setShowMapModal(false)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white font-serif font-bold text-xs rounded-lg cursor-pointer"
              >
                KAPAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. AYARLAR (Settings) Modal */}
      {showSettingsModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-serif">
          <div className="w-full max-w-sm bg-[#FAF6F0] dark:bg-[#141414] border-2 border-stone-800 dark:border-amber-700/60 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-[#1B3B2B] dark:bg-[#122319] p-4 text-[#EAD2AC] border-b-2 border-stone-800 dark:border-amber-700/50 flex justify-between items-center font-mono">
              <span className="text-xs font-bold tracking-widest">AYARLAR</span>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-[#EAD2AC] hover:text-white transition-all cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 font-sans text-xs">
              
              {/* Audio switches */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest block">SES EFEKTLERİ</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAudioEnabled(true)}
                    className={`py-2 border rounded-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      audioEnabled 
                        ? 'bg-[#1B3B2B] text-white border-stone-800' 
                        : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Açık
                  </button>
                  <button
                    onClick={() => setAudioEnabled(false)}
                    className={`py-2 border rounded-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !audioEnabled 
                        ? 'bg-[#1B3B2B] text-white border-stone-800' 
                        : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300'
                    }`}
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    Kapalı
                  </button>
                </div>
              </div>

              {/* Difficulty selects */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest block">ZORLUK SEVİYESİ</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['kolay', 'normal', 'zor'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-2 border rounded-md font-mono text-[10px] uppercase font-bold transition-all cursor-pointer ${
                        difficulty === level 
                          ? 'bg-[#1B3B2B] text-white border-stone-800' 
                          : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="p-2.5 bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-400 text-[10px] leading-relaxed rounded border border-stone-200 dark:border-stone-800">
                  {difficulty === 'kolay' && "Kolay: 5 hata yapma hakkı sunar."}
                  {difficulty === 'normal' && "Normal: 3 hata yapma hakkı sunar."}
                  {difficulty === 'zor' && "Zor: Hata toleransı sıfırdır, tek yanlışta uyarılırsınız."}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-stone-300 dark:border-stone-800 bg-[#F2ECE4] dark:bg-[#111] flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 bg-[#1B3B2B] hover:bg-[#152F22] text-[#FAF6F0] font-serif font-bold text-xs rounded-lg cursor-pointer"
              >
                KAYDET VE KAPAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. NASIL OYNANIR (How to Play) Modal */}
      {showGuideModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-serif">
          <div className="w-full max-w-sm bg-[#FAF6F0] dark:bg-[#141414] border-2 border-stone-800 dark:border-amber-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#1B3B2B] dark:bg-[#122319] p-4 text-[#EAD2AC] border-b-2 border-stone-800 dark:border-amber-700/50 flex justify-between items-center font-mono shrink-0">
              <span className="text-xs font-bold tracking-widest">NASIL OYNANIR</span>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="text-[#EAD2AC] hover:text-white transition-all cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-center bg-[#FAF6F0] dark:bg-[#141414]">
              {guideSlide === 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-3xl mx-auto border border-stone-300 dark:border-stone-700 font-sans select-none">
                    ❓
                  </div>
                  <strong className="block text-sm font-serif uppercase tracking-wide text-stone-900 dark:text-stone-100">KİMLİK SORGULA</strong>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans px-2">
                    Lobiye gelen tüm misafirlerden evraklarını isteyin. Doğru kimlik detayları olmadan içeri kimseyi almayın.
                  </p>
                </div>
              )}

              {guideSlide === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-3xl mx-auto border border-stone-300 dark:border-stone-700 font-sans select-none">
                    📋
                  </div>
                  <strong className="block text-sm font-serif uppercase tracking-wide text-stone-900 dark:text-stone-100">YÖNETMELİĞE UYUN</strong>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans px-2">
                    Müdür Cemal Salda'nın talimatlarını takip edin. Tadilat, fırtına ve liman yönergelerine noksansız uyun.
                  </p>
                </div>
              )}

              {guideSlide === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-3xl mx-auto border border-stone-300 dark:border-stone-700 font-sans select-none">
                    ⚡
                  </div>
                  <strong className="block text-sm font-serif uppercase tracking-wide text-stone-900 dark:text-stone-100">SAĞ PANEL SEÇENEKLERİ</strong>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans px-2">
                    Tüm resepsiyon işlemlerini sağ taraftaki karar seçeneklerinden yapın. Yanlış işlemlerde siciliniz lekelenecektir!
                  </p>
                </div>
              )}

              {guideSlide === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="w-16 h-16 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-3xl mx-auto border border-stone-300 dark:border-stone-700 font-sans select-none">
                    🔑
                  </div>
                  <strong className="block text-sm font-serif uppercase tracking-wide text-stone-900 dark:text-stone-100">SIRLAR ALBÜMÜ</strong>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans px-2">
                    Her başarılı kararla birlikte Düzada'nın karanlık Osmanlı ve Cumhuriyet dönemi sırlarının kilidini açıp arşivde toplayın.
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-1.5 pt-2">
                {[0, 1, 2, 3].map((idx) => (
                  <span 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${guideSlide === idx ? 'bg-[#1B3B2B] scale-110' : 'bg-stone-300 dark:bg-stone-700'}`}
                  ></span>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-stone-300 dark:border-stone-800 bg-[#F2ECE4] dark:bg-[#111] flex justify-between shrink-0 font-mono text-[11px]">
              <button
                onClick={() => setGuideSlide(prev => Math.max(0, prev - 1))}
                disabled={guideSlide === 0}
                className={`px-3 py-1.5 border rounded-md cursor-pointer ${guideSlide === 0 ? 'text-stone-400 border-stone-200 cursor-not-allowed' : 'border-stone-400 text-stone-700 hover:bg-stone-100'}`}
              >
                ◀ ÖNCEKİ
              </button>
              
              {guideSlide < 3 ? (
                <button
                  onClick={() => setGuideSlide(prev => Math.min(3, prev + 1))}
                  className="px-3 py-1.5 bg-[#1B3B2B] text-white rounded-md cursor-pointer hover:bg-[#152F22]"
                >
                  SONRAKİ ▶
                </button>
              ) : (
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-1.5 bg-emerald-700 text-white rounded-md cursor-pointer hover:bg-emerald-800 font-bold"
                >
                  TAMAM ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
