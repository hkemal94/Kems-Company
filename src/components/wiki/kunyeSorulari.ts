/**
 * Künye soruları — her madde türünün doldurulması beklenen alanları.
 *
 * Eskiden `DuzadaWiki.tsx` içinde duruyordu; o bileşen kaldırılınca buraya
 * taşındı. Yeni wiki katmanı (WikiShell) künyedeki boşlukları bu listeye
 * bakarak buluyor.
 */

export const DEFAULT_QUESTIONS_BY_CAT: Record<string, Array<{ id: string; label: string; question: string; fieldPath: string }>> = {
  kisi: [
    { id: 'title', label: 'Karakter Adı / Unvan', question: 'Karakterin tam adı ve bilinen unvanı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Geçmiş Hikayesi / Özgeçmiş', question: 'Karakterin Düzada\'daki genel geçmişi ve detaylı yaşam hikayesi nedir?', fieldPath: 'notes' },
    { id: 'profession', label: 'Meslek veya Rol', question: 'Karakterin adadaki aktif mesleği, görevi veya rolü nedir?', fieldPath: 'metadata.profile.profession' },
    { id: 'personality', label: 'Mizaç ve Kişilik Özellikleri', question: 'Karakterin mizaç özellikleri, belirgin davranış kalıpları ve alışkanlıkları nelerdir?', fieldPath: 'metadata.profile.personality' },
    { id: 'origin', label: 'Köken ve Soy', question: 'Karakterin kökeni, ailesi, soyu veya adadaki geçmiş bağları nedir?', fieldPath: 'metadata.profile.origin' },
    { id: 'motivation', label: 'Ana Hedef ve Motivasyon', question: 'Bu karakterin adadaki ana amacı, motivasyonu veya sakladığı sırlar nelerdir?', fieldPath: 'metadata.profile.motivation' },
    { id: 'socialClass', label: 'Toplumsal Sınıf ve İtibar', question: 'Karakterin adadaki statüsü, saygınlığı ve diğer ada sakinleri üzerindeki etkisi nedir?', fieldPath: 'metadata.profile.socialClass' }
  ],
  mekan: [
    { id: 'title', label: 'Mekan Adı', question: 'Bu mekanın tam adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Mekan Detayları & Tarihçe', question: 'Mekanın kuruluş hikayesi, adadaki tarihi ve işleyişine dair detaylar nelerdir?', fieldPath: 'notes' },
    { id: 'shopType', label: 'Mekan Türü', question: 'Bu mekanın işlevi veya türü nedir (bar, restoran, fırın, kayalık, deniz feneri vb.)?', fieldPath: 'metadata.profile.shopType' },
    { id: 'manager', label: 'Mekan Sorumlusu veya Sahibi', question: 'Mekanı işleten, mülk sahibi olan ya da oradan sorumlu olan kişi kimdir?', fieldPath: 'metadata.profile.manager' },
    { id: 'style', label: 'Mimari Stil ve Görünüm', question: 'Mekanın dış ve iç mimari tarzı, dekorasyonu ve adadaki genel görünümü nasıldır?', fieldPath: 'metadata.profile.style' },
    { id: 'secrets', label: 'Önemli Sırlar & Gizemler', question: 'Bu mekanda saklanan gizli bölmeler, sırlar veya dedikodular nelerdir?', fieldPath: 'metadata.profile.secrets' },
    { id: 'region', label: 'Mahalle / Coğrafi Bölge', question: 'Bu mekan adanın hangi coğrafi bölgesinde veya mahallesinde yer alıyor? (örn: liman, kuzey, orman vb.)', fieldPath: 'metadata.region' }
  ],
  marka: [
    { id: 'title', label: 'Organizasyon / Kulüp Adı', question: 'Bu kuruluşun, kulübün veya markanın tam adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Tarihçe ve Manifesto', question: 'Organizasyonun adadaki nüfuzu, tarihi ve kuruluş manifestosu nedir?', fieldPath: 'notes' },
    { id: 'purpose', label: 'Kuruluş Amacı ve Misyon', question: 'Bu kulüp veya markanın var oluş amacı ve adadaki ana misyonu nedir?', fieldPath: 'metadata.profile.purpose' },
    { id: 'leader', label: 'Liderlik ve Yönetim Yapısı', question: 'Organizasyonu yöneten lider, kurucu meclis veya hiyerarşik yapı nasıldır?', fieldPath: 'metadata.profile.leader' },
    { id: 'secrecy', label: 'Gizlilik Derecesi ve Üyeler', question: 'Organizasyonun gizlilik derecesi nedir? Üyelik şartları ve üye yapısı nasıldır?', fieldPath: 'metadata.profile.secrecy' },
    { id: 'influence', label: 'Ekonomik & Siyasi Nüfuz', question: 'Bu kuruluşun adadaki ticari veya yönetimsel gücü nedir?', fieldPath: 'metadata.profile.influence' }
  ],
  olay: [
    { id: 'title', label: 'Olay / Şenlik Adı', question: 'Bu tarihi olayın veya şenliğin adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Olay Gelişimi & Hikayesi', question: 'Olayın detaylı gelişi, nasıl sonuçlandığı ve adada bıraktığı miras nedir?', fieldPath: 'notes' },
    { id: 'date', label: 'Gerçekleşme Tarihi', question: 'Olay ne zaman, hangi yıl veya hangi sezonda gerçekleşti? (örn: 12 Eylül, Her Ekinoks vb.)', fieldPath: 'metadata.date' },
    { id: 'recurrence', label: 'Tekrarlanma Düzeni', question: 'Bu olay periyodik olarak tekrarlanıyor mu (yıllık, her ekinoksta vb.) yoksa tek seferlik mi?', fieldPath: 'metadata.recurrence' },
    { id: 'manager', label: 'Ana Aktörler / Katılımcılar', question: 'Olayın merkezindeki ana karakterler, kulüpler veya tanıklar kimlerdir?', fieldPath: 'metadata.profile.manager' },
    { id: 'consequences', label: 'Sonuçlar ve Etkiler', question: 'Bu olayın ada sakinleri ve adanın geleceği üzerindeki kalıcı etkisi ne oldu?', fieldPath: 'metadata.profile.consequences' }
  ],
  urun: [
    { id: 'title', label: 'Eşya / Ürün Adı', question: 'Bu kurgusal eşyanın veya drop ürününün adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Eşyanın Bulunuş Hikayesi ve Efsanesi', question: 'Eşyanın evrendeki hikayesi, kökeni ve adalılar arasındaki önemi nedir?', fieldPath: 'notes' },
    { id: 'rarity', label: 'Nadirlik Derecesi', question: 'Eşyanın evrendeki nadirlik veya bulunabilirlik derecesi nedir (Efsanevi, Sıradan, Eşsiz vb.)?', fieldPath: 'metadata.profile.rarity' },
    { id: 'material', label: 'Köken / Malzeme Yapısı', question: 'Eşya hangi malzemelerden yapılmıştır veya kökeni nereye dayanmaktadır?', fieldPath: 'metadata.profile.material' },
    { id: 'function', label: 'Ana İşlevi ve Gizli Gücü', question: 'Eşyanın kurguda üstlendiği ana işlev, kilit rol veya gizli kullanım amacı nedir?', fieldPath: 'metadata.profile.function' },
    { id: 'owner', label: 'Şu Anki Sahibi / Bulunduğu Yer', question: 'Eşyanın adada saklandığı yer veya şu anki sahibi kimdir?', fieldPath: 'metadata.profile.owner' }
  ],
  oda: [
    { id: 'title', label: 'Oda No / Adı', question: 'Odanın kapı numarası veya adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Oda Durumu & Atmosfer', question: 'Odanın genel düzeni, dekorasyonu ve sezondaki atmosferi nedir?', fieldPath: 'notes' },
    { id: 'roomStatus', label: 'Doluluk Durumu', question: 'Oda şu an boş mu, dolu mu, yoksa rezerve mi?', fieldPath: 'metadata.profile.roomStatus' },
    { id: 'guest', label: 'Odadaki Misafir', question: 'Oda sakinlerinin tam listesi veya odada kalan misafirin adı nedir?', fieldPath: 'metadata.profile.guest' },
    { id: 'clues', label: 'Gizli İpuçları & Eşyalar', question: 'Oda içinde saklanmış veya unutulmuş kilit deliller, sırlar veya belgeler nelerdir?', fieldPath: 'metadata.profile.clues' },
    { id: 'floor', label: 'Bulunduğu Kat', question: 'Oda Imperial otelinin hangi katında yer alıyor?', fieldPath: 'metadata.profile.floor' }
  ],
  yer: [
    { id: 'title', label: 'Mahalle / Bölge Adı', question: 'Mahallenin veya coğrafi bölgenin resmi adı nedir?', fieldPath: 'title' },
    { id: 'notes', label: 'Geçmişi ve Coğrafyası', question: 'Bölgenin coğrafi yapısı, tarihi kökenleri ve adadaki konumu nedir?', fieldPath: 'notes' },
    { id: 'population', label: 'Tahmini Nüfus', question: 'Bölgede aktif olarak kaç hane yaşıyor veya tahmini nüfus dağılımı nedir?', fieldPath: 'metadata.profile.population' },
    { id: 'landmarks', label: 'Önemli Yapılar ve Simgeler', question: 'Bölgede yer alan deniz feneri, kalıntılar veya anıtlar gibi kilit simgeler nelerdir?', fieldPath: 'metadata.profile.landmarks' },
    { id: 'vibe', label: 'Sosyal Atmosfer', question: 'Bölgenin genel hissiyatı ve adadaki sosyal repütasyonu nedir? (Sakin, tekinsiz, asil vb.)', fieldPath: 'metadata.profile.vibe' }
  ]
};
