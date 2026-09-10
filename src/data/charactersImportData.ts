export interface ImportCharacter {
  ad: string;
  yas: number | null;
  rol: string;
  fizik: string;
  sac: string;
  gozler: string;
  kisilik: string;
  sevdikleri: string;
  sevmedikleri: string;
  hobiler: string;
  ayrinti: string[];
  oyunda_var: boolean;
}

export const CHARACTERS_IMPORT_DATA: ImportCharacter[] = [
  {
    "ad": "Esra Gezgin",
    "yas": 38,
    "rol": "Başaşçı",
    "fizik": "1,75 boyunda, 65 kilo, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, kahverengi saçlı",
    "gozler": "",
    "kisilik": "Yetenekli, disiplinli, çalışkan, hırslı",
    "sevdikleri": "Yemek yapmak, yeni tarifler denemek, iş arkadaşlarıyla vakit geçirmek",
    "sevmedikleri": "Tembellik, düzensizlik, eşitsizlik",
    "hobiler": "",
    "ayrinti": [
      "15 yıldır profesyonel olarak aşçılık yapmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür. Evli ve bir çocuk annesidir.",
      "Boş zamanlarında yeni tarifler denemeyi ve iş arkadaşlarıyla vakit geçirmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Oya Demre",
    "yas": 25,
    "rol": "Genç Aşçı",
    "fizik": "1,60 boyunda, 50 kilo, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, sarı saçlı",
    "gozler": "",
    "kisilik": "Hevesli, öğrenmeye açık, yaratıcı, yardımsever",
    "sevdikleri": "Yemek yapmak, yeni şeyler öğrenmek, insanlarla tanışmak",
    "sevmedikleri": "Tembellik, ilgisizlik, dağınıklık",
    "hobiler": "",
    "ayrinti": [
      "Üniversiteden yeni mezun olmuş, genç ve dinamik bir aşçıdır.",
      "İstanbul'da doğmuş ve büyümüştür. Ailesiyle birlikte yaşamaktadır.",
      "Boş zamanlarında yeni şeyler öğrenmeyi ve insanlarla tanışmayı sever."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Cüneyt Şahin",
    "yas": 40,
    "rol": "Et Uzmanı Aşçı",
    "fizik": "1,85 boyunda, 80 kilo, kahverengi gözlü, fit bir yapıya sahip",
    "sac": "Kısa, siyah saçlı",
    "gozler": "",
    "kisilik": "Gurme, iddialı, kararlı, hırslı",
    "sevdikleri": "Et yemekleri, yarışmalar, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, düzensizlik, eşitsizlik",
    "hobiler": "",
    "ayrinti": [
      "25 yıldır profesyonel olarak aşçılık yapmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür. Evli ve iki çocuk babasıdır.",
      "Boş zamanlarında et yemekleri üzerine yarışmalara katılır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Zehra Karahanlı",
    "yas": 27,
    "rol": "Tatlı Uzmanı Aşçı",
    "fizik": "1,65 boyunda, 55 kilo, yeşil gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, kahverengi saçlı",
    "gozler": "",
    "kisilik": "Duygusal, yaratıcı, özenli, titiz",
    "sevdikleri": "Tatlı yapmak, yeni tarifler denemek, sanat",
    "sevmedikleri": "Tembellik, ilgisizlik, dağınıklık",
    "hobiler": "",
    "ayrinti": [
      "10 yıldır profesyonel olarak aşçılık yapmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür. Bekardır.",
      "Boş zamanlarında resim ve müzik yapar."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Aysu Ateş",
    "yas": 32,
    "rol": "Sommelier (Şarap Uzmanı)",
    "fizik": "1,70 boyunda, 60 kilo, mavi gözlü, uzun boylu, düz saçları olan",
    "sac": "Uzun, sarı saçlı",
    "gozler": "",
    "kisilik": "Bilgili, zeki, sofistike, zarif",
    "sevdikleri": "Şarap, sanat, culture",
    "sevmedikleri": "Tembellik, saygısızlık, yalan",
    "hobiler": "",
    "ayrinti": [
      "15 yıldır profesyonel olarak sommelierlik yapmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür. Evli ve bir çocuk annesidir.",
      "Boş zamanlarında sanat galerilerini gezmeyi ve kültürel etkinliklere katılır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Deniz Aydın",
    "yas": 35,
    "rol": "Ana Restoranın Sommelieri",
    "fizik": "1,80 boyunda, 75 kilo, kahverengi gözlü, fit bir yapıya sahip",
    "sac": "Kısa, kahverengi saçlı",
    "gozler": "",
    "kisilik": "Bilgili, zeki, sofistike, zarif",
    "sevdikleri": "Şarap, sanat, kültür",
    "sevmedikleri": "Tembellik, saygısızlık, yalan",
    "hobiler": "",
    "ayrinti": [
      "15 yıldır profesyonel olarak sommelierlik yapmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür. Evli ve bir çocuk annesidir.",
      "Boş zamanlarında sanat galerilerini gezmeyi ve kültürel etkinliklere katılır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Hasan Tuncer",
    "yas": 45,
    "rol": "Şef Garson",
    "fizik": "1,85 boyunda, 80 kilo, kahverengi gözlü, fit bir yapıya sahip",
    "sac": "Kısa, siyah saçlı",
    "gozler": "",
    "kisilik": "Deneyimli, profesyonel, saygın, otoriter",
    "sevdikleri": "Müşteri memnuniyeti, ekip çalışması, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, saygısızlık, düzensizlik",
    "hobiler": "",
    "ayrinti": [
      "25 yıldır restoran sektöründe çalışmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür. Evli ve iki çocuk babasıdır.",
      "Boş zamanlarında futbol oynamaktadır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Gizem Atalay",
    "yas": 22,
    "rol": "Garson",
    "fizik": "1,65 boyunda, 55 kilo, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, sarı saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, enerjik, öğrenmeye açık",
    "sevdikleri": "Müşterilerle vakit geçirmek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Tembellik, saygısızlık, dağınıklık",
    "hobiler": "",
    "ayrinti": [
      "Üniversiteden yeni mezun olmuş, genç ve dinamik bir garsondur.",
      "İstanbul'da doğmuş ve büyümüştür. Ailesiyle birlikte yaşamaktadır.",
      "Boş zamanlarında seyahat etmeyi ve yeni yerler keşfetmeyi sevmektedir."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Berke Demirci",
    "yas": 28,
    "rol": "Yardımcı Aşçı",
    "fizik": "1,75 boyunda, 70 kilo, kahverengi gözlü, fit bir yapıya sahip",
    "sac": "Kısa, siyah saçlı",
    "gozler": "",
    "kisilik": "Hevesli, öğrenmeye açık, yardımsever, sadık",
    "sevdikleri": "Yemek yapmak, yeni şeyler öğrenmek, insanlarla çalışmak",
    "sevmedikleri": "Tembellik, saygısızlık, dağınıklık",
    "hobiler": "",
    "ayrinti": [
      "Üniversiteden yeni mezun olmuş, genç ve dinamik bir aşçıdır.",
      "İstanbul'da doğmuş ve büyümüştür. Ailesiyle birlikte yaşamaktadır.",
      "Boş zamanlarında arkadaşlarıyla vakit geçirmekten ve yeni tarifler denemekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Nilay Güneş",
    "yas": 23,
    "rol": "Mutfak Stajyeri",
    "fizik": "1,60 boyunda, 50 kilo, yeşil gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, kahverengi saçlı",
    "gozler": "",
    "kisilik": "Hevesli, öğrenmeye açık, yardımsever, azimli",
    "sevdikleri": "Yemek yapmak, yeni şeyler öğrenmek, insanların mutluluğunu görmek",
    "sevmedikleri": "Tembellik, saygısızlık, dağınıklık",
    "hobiler": "",
    "ayrinti": [
      "Üniversitede aşçılık bölümünde okuyan genç ve dinamik bir stajyerdir.",
      "İstanbul'da doğmuş ve büyümüştür. Ailesiyle birlikte yaşamaktadır.",
      "Boş zamanlarında resim ve müzik yapmaktan hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Fatih Aksak",
    "yas": 45,
    "rol": "Başaşçı",
    "fizik": "1,85 boyunda, 90 kilo, siyah saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı siyah saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Yemek pişirmek, yeni lezzetler denemek, seyahat etmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "25 yıldır mutfak sektöründe çalışmaktadır.",
      "Son 10 yıldır Orient Rüya Restaurant & Bar'ın başaşçısıdır.",
      "Türk mutfağının en iyilerini misafirlerine sunmaktan gurur duyar."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Kemal Açık",
    "yas": 35,
    "rol": "Baş Aşçının Yardımcısı",
    "fizik": "1,75 boyunda, 75 kilo, sarı saçlı, yeşil gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Yeni lezzetler denemek, yemek pişirmek, insanlarla tanışmak",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "15 yıldır mutfak sektöründe çalışmaktadır.",
      "Son 5 yıldır Orient Rüya Restaurant & Bar'ın başaşçının yardımcısıdır.",
      "Fatih Aksak ile birlikte Türk mutfağının en iyilerini misafirlere sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ahmet Karahan",
    "yas": 40,
    "rol": "Şef Garson",
    "fizik": "1,70 boyunda, 70 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, müzik dinlemek, film izlemek",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve büyümüştür.",
      "10 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 5 yıldır Orient Rüya Restaurant & Bar'ın şef garsonudur.",
      "Misafirlerin yemek deneyimini en iyi şekilde yaşamasını sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Canan Yosun",
    "yas": 25,
    "rol": "Garson",
    "fizik": "1,65 boyunda, 55 kilo, siyah saçlı, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, müzik dinlemek, film izlemek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "5 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Orient Rüya Restaurant & Bar'da garson olarak çalışmaktadır.",
      "Misafirlere lezzetli yemekler sunmaktan ve onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Neslihan Akçay",
    "yas": 27,
    "rol": "Garson",
    "fizik": "1,60 boyunda, 50 kilo, sarı saçlı, yeşil gözlü, orta boylu, dalgalı saçları olan",
    "sac": "Orta boylu, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Seyahat etmek, yeni şeyler denemek, insanlarla tanışmak",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "5 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Orient Rüya Restaurant & Bar'da garson olarak çalışmaktadır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ömer Kırca",
    "yas": 29,
    "rol": "Bar Şefi",
    "fizik": "1,85 boyunda, 90 kilo, siyah saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı siyah saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Müzik dinlemek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "10 yıldır barmenlik sektöründe çalışmaktadır.",
      "Son 5 yıldır Orient Rüya Restaurant & Bar'ın bar şefidir.",
      "Misafirlere unutulmaz bir bar deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Bahar Güzel",
    "yas": 23,
    "rol": "Barmaid",
    "fizik": "1,65 boyunda, 55 kilo, sarı saçlı, yeşil gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz sarı saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Müzik dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "3 yıldır barmenlik sektöründe çalışmaktadır.",
      "Son 2 yıldır Orient Rüya Restaurant & Bar'da barmaid olarak çalışmaktadır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Gökmen Erkek",
    "yas": 32,
    "rol": "Canlı Müzik Yorumcusu",
    "fizik": "1,70 boyunda, 70 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Müzik dinlemek, şarkı söylemek, insanlarla tanışmak",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve büyümüştür.",
      "10 yıldır canlı müzik sektöründe çalışmaktadır.",
      "Son 5 yıldır Orient Rüya Restaurant & Bar'da canlı müzik yorumcusu olarak çalışmaktadır.",
      "Misafirlere keyifli bir müzik deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Derya Aslan",
    "yas": 30,
    "rol": "Ses Sanatçısı",
    "fizik": "1,60 boyunda, 50 kilo, siyah saçlı, mavi gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Müzik dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "10 yıldır ses sanatçılığı yapmaktadır.",
      "Son 5 yıldır Orient Rüya Restaurant & Bar'da ses sanatçısı olarak çalışmaktadır.",
      "Misafirlere keyifli bir müzik deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Esin Doğan",
    "yas": 28,
    "rol": "Garson",
    "fizik": "1,75 boyunda, 65 kilo, kahverengi saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı kahverengi saçlı",
    "gozler": "",
    "kisilik": "Samimi, güvenilir, neşeli, çalışkan",
    "sevdikleri": "Müzik dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Yalan, hakaret, küfür",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "5 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Orient Rüya Restaurant & Bar'da garson olarak çalışmaktadır.",
      "Misafirlere lezzetli yemekler sunmaktan ve onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Murat Fırtına",
    "yas": 35,
    "rol": "Bar Müdürü",
    "fizik": "1,85 boyunda, 90 kilo, siyah saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı siyah saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Jazz müziği dinlemek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "10 yıldır barmenlik sektöründe çalışmaktadır.",
      "Son 5 yıldır Jazziana Jazz Bar'ın bar müdürüdür.",
      "Barın tüm operasyonlarından sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Soner Yıldırım",
    "yas": 32,
    "rol": "Barmen",
    "fizik": "1,75 boyunda, 75 kilo, sarı saçlı, yeşil gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Jazz müziği dinlemek, yeni lezzetler denemek, insanlarla tanışmak",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "10 yıldır barmenlik sektöründe çalışmaktadır.",
      "Son 5 yıldır Jazziana Jazz Bar'da barmen olarak çalışmaktadır.",
      "Misafirlere lezzetli içecekler sunmaktan ve onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Rıfat Yavuz",
    "yas": 33,
    "rol": "Barmen",
    "fizik": "1,70 boyunda, 70 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Jazz müziği dinlemek, müzik dinlemek, insanlarla tanışmak",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve büyümüştür.",
      "10 yıldır barmenlik sektöründe çalışmaktadır.",
      "Son 5 yıldır Jazziana Jazz Bar'da barmen olarak çalışmaktadır.",
      "Misafirlere lezzetli içecekler sunmaktan ve onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ali Tekin",
    "yas": 30,
    "rol": "Garson",
    "fizik": "1,65 boyunda, 55 kilo, siyah saçlı, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Jazz müziği dinlemek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "5 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Jazziana Jazz Bar'da garson olarak çalışmaktadır.",
      "Misafirlere lezzetli yemekler sunmaktan and onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ceylan Yokuş",
    "yas": 27,
    "rol": "Garson",
    "fizik": "1,60 boyunda, 50 kilo, sarı saçlı, yeşil gözlü, orta boylu, dalgalı saçları olan",
    "sac": "Orta boylu, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Jazz müziği dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "5 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Jazziana Jazz Bar'da garson olarak çalışmaktadır.",
      "Misafirlere lezzetli yemekler sunmaktan ve onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Gönül Artın",
    "yas": 31,
    "rol": "Garson",
    "fizik": "1,75 boyunda, 65 kilo, kahverengi saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı kahverengi saçlı",
    "gozler": "",
    "kisilik": "Samimi, güvenilir, neşeli, çalışkan",
    "sevdikleri": "Jazz müziği dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Yalan, hakaret, küfür",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "5 yıldır restorancılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Jazziana Jazz Bar'da garson olarak çalışmaktadır.",
      "Misafirlere lezzetli yemekler sunmaktan ve onların iyi vakit geçirmesini sağlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Zeynep Ayan",
    "yas": 26,
    "rol": "Dansçı",
    "fizik": "1,65 boyunda, 55 kilo, siyah saçlı, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Jazz müziği dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "5 yıldır dansçılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Jazziana Jazz Bar'da dansçı olarak çalışmaktadır.",
      "Misafirlere keyifli bir dans deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ahsen Ay",
    "yas": 24,
    "rol": "Dansçı",
    "fizik": "1,60 boyunda, 50 kilo, sarı saçlı, yeşil gözlü, orta boylu, dalgalı saçları olan",
    "sac": "Orta boylu, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Jazz müziği dinlemek, dans etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "5 yıldır dansçılık sektöründe çalışmaktadır.",
      "Son 3 yıldır Jazziana Jazz Bar'da dansçı olarak çalışmaktadır.",
      "Misafirlere keyifli bir dans deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Bulut Korkmaz",
    "yas": 29,
    "rol": "Canlı Müzik Yorumcusu",
    "fizik": "1,85 boyunda, 90 kilo, siyah saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı siyah saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Jazz müziği dinlemek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "10 yıldır canlı müzik sektöründe çalışmaktadır.",
      "Son 5 yıldır Jazziana Jazz Bar'da canlı müzik yorumcusu olarak çalışmaktadır.",
      "Misafirlere keyifli bir müzik deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Melis Özdemir",
    "yas": 28,
    "rol": "Canlı Müzik Yorumcusu",
    "fizik": "1,70 boyunda, 70 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Jazz müziği dinlemek, şarkı söylemek, insanlarla tanışmak",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "10 yıldır canlı müzik sektöründe çalışmaktadır.",
      "Son 5 yıldır Jazziana Jazz Bar'da canlı müzik yorumcusu olarak çalışmaktadır.",
      "Misafirlere keyifli bir müzik deneyimi sunmaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Kaan Taşlı",
    "yas": 28,
    "rol": "Resepsiyon Görevlisi",
    "fizik": "1,75 boyunda, 70 kilo, kahverengi saçlı, mavi gözlü, sportif bir görünüme sahip.",
    "sac": "Kısa kahverengi saçlı.",
    "gozler": "",
    "kisilik": "Dikkatli, yardımsever, pozitif, hızlı düşünen.",
    "sevdikleri": "Müşteri memnuniyeti sağlamak, sorunları çözmek, iletişim kurmak.",
    "sevmedikleri": "Kaba davranışlar, gereksiz beklemeler, karışıklık.",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve uzun yıllardır otelcilik sektöründe çalışmaktadır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Sevgi Erdemir",
    "yas": 31,
    "rol": "Resepsiyonist",
    "fizik": "1,68 boyunda, 65 kilo, siyah saçlı, kahverengi gözlü, zarif bir görünüme sahip.",
    "sac": "Uzun, siyah ve düz saçlı.",
    "gozler": "",
    "kisilik": "Sakin, saygılı, sabırlı, iletişim becerilerine sahip.",
    "sevdikleri": "Misafirlere yardımcı olmak, bilgi vermek, soruları yanıtlamak.",
    "sevmedikleri": "Kötü muamele, gereksiz karmaşa, düzensizlik.",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğup büyümüş ve otelcilik sektöründe deneyime sahiptir."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Alihan Durmuş",
    "yas": 27,
    "rol": "Misafir İlişkileri Sorumlusu",
    "fizik": "1,80 boyunda, 75 kilo, esmer saçlı, kahverengi gözlü, profesyonel bir görünüme sahip.",
    "sac": "Kısa, esmer saçlı.",
    "gozler": "",
    "kisilik": "Güler yüzlü, etkileyici, liderlik yetenekleri olan, çözüm odaklı.",
    "sevdikleri": "Misafir memnuniyetini artırmak, özel istekleri yerine getirmek, etkin iletişim.",
    "sevmedikleri": "Kaba davranışlar, kötü niyetli insanlar, kararsızlık.",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve misafir ilişkileri konusunda uzun yıllardır çalışmaktadır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "İlkin Arıkan",
    "yas": 29,
    "rol": "Konuk Karşılama Uzmanı",
    "fizik": "1,72 boyunda, 68 kilo, sarı saçlı, yeşil gözlü, şık bir görünüme sahip.",
    "sac": "Düz sarı saçlı.",
    "gozler": "",
    "kisilik": "İyi organize olabilen, detaylara dikkat eden, misafirperver.",
    "sevdikleri": "Misafirleri rahatlatmak, özel karşılama düzenlemek, tatil deneyimini unutulmaz kılmak.",
    "sevmedikleri": "İlgisizlik, eksiklikler, gecikmeler.",
    "hobiler": "",
    "ayrinti": [
      "Bodrum'da doğup büyümüş ve lüks tatil konsepti konusunda uzmandır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Cemal Salda",
    "yas": 35,
    "rol": "Resepsiyon Müdürü",
    "fizik": "1,85 boyunda, 80 kilo, kumral saçlı, kahverengi gözlü, lider bir görünüme sahip.",
    "sac": "Kısa kumral saçlı.",
    "gozler": "",
    "kisilik": "Kararlı, yetenekli, liderlik özelliklerine sahip, ekip çalışmasına önem veren.",
    "sevdikleri": "Ekip performansını artırmak, misafirlerle kaliteli iletişim kurmak, operasyonları yönetmek.",
    "sevmedikleri": "İşbirliği eksikliği, düzensizlik, kötü planlama.",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve otelcilik sektöründe kariyer yapmıştır."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Belkıs Yaman",
    "yas": 24,
    "rol": "Resepsiyon Görevlisi",
    "fizik": "1,70 boyunda, 60 kilo, siyah saçlı, kahverengi gözlü, enerjik bir görünüme sahip.",
    "sac": "Kısa siyah saçlı.",
    "gozler": "",
    "kisilik": "Enerjik, cana yakın, hızlı düşünen, çözüm odaklı.",
    "sevdikleri": "Misafirleri güler yüzle karşılamak, talepleri hızlıca yerine getirmek, yeni insanlarla tanışmak.",
    "sevmedikleri": "Negatif enerji, yavaş hareket, karmaşa.",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve turizm sektöründe deneyim kazanmıştır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ahu Koçak",
    "yas": 33,
    "rol": "Misafir Hizmetleri Koordinatörü",
    "fizik": "1,75 boyunda, 65 kilo, kızıl saçlı, ela gözlü, profesyonel bir görünüme sahip.",
    "sac": "Uzun kızıl saçlı.",
    "gozler": "",
    "kisilik": "Organize, sorumluluk sahibi, iletişim becerilerine sahip, detay odaklı.",
    "sevdikleri": "Misafir memnuniyetini artırmak, operasyonları koordine etmek, kaliteli hizmet sunmak.",
    "sevmedikleri": "İhmal, eksiklikler, iletişim eksikliği.",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğup büyümüş ve misafir hizmetleri konusunda uzmandır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Hayri Aydın",
    "yas": 26,
    "rol": "Concierge Görevlisi",
    "fizik": "1,78 boyunda, 70 kilo, esmer saçlı, kahverengi gözlü, yardımsever bir görünüme sahip.",
    "sac": "Kısa esmer saçlı.",
    "gozler": "",
    "kisilik": "Yardımsever, hızlı düşünen, etkili iletişim, yerel bilgiye sahip.",
    "sevdikleri": "Misafirlere yardımcı olmak, özel istekleri yerine getirmek, şehir hakkında bilgi vermek.",
    "sevmedikleri": "İhmal, eksiklikler, kötü muamele.",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'un yerel kültürüne hakimdir ve misafirlerin şehri keşfetmelerine yardımcı olur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Zerrin Sağlam",
    "yas": 30,
    "rol": "Rezervasyon Sorumlusu",
    "fizik": "1,70 boyunda, 65 kilo, kahverengi saçlı, mavi gözlü, profesyonel bir görünüme sahip.",
    "sac": "Düz kahverengi saçlı.",
    "gozler": "",
    "kisilik": "Organize, detaylara dikkat eden, rezervasyon işlemlerinde deneyimli.",
    "sevdikleri": "Misafirlerin rezervasyonlarını kolaylaştırmak, taleplere hızlıca yanıt vermek, müşteri memnuniyetini sağlamak.",
    "sevmedikleri": "Yanlış rezervasyonlar, iletişim sorunları, gecikmeler.",
    "hobiler": "",
    "ayrinti": [
      "Turizm sektöründe uzun yıllardır çalışmaktadır ve rezervasyon süreçlerini yönetir."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Levent Öztürk",
    "yas": 32,
    "rol": "Resepsiyon Görevlisi",
    "fizik": "1,75 boyunda, 70 kilo, esmer saçlı, kahverengi gözlü, pozitif bir görünüme sahip.",
    "sac": "Kısa esmer saçlı.",
    "gozler": "",
    "kisilik": "Pozitif, iletişim becerilerine sahip, hızlı düşünen.",
    "sevdikleri": "Misafirleri güler yüzle karşılamak, soruları yanıtlamak, hızlı hizmet sunmak.",
    "sevmedikleri": "Kaba davranışlar, kötü niyetli insanlar, karmaşa.",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve otelcilik sektöründe çalışmaktadır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Altan Aktaş",
    "yas": 42,
    "rol": "Housekeeping Müdürü",
    "fizik": "1,75 boyunda, 75 kilo, kahverengi saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı kahverengi saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, spor yapmak, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "20 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 10 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Baş temizlikçi olarak, departmanın tüm operasyonlarından sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Begüm Çalışkan",
    "yas": 21,
    "rol": "Genç Stajyer Temizlik Görevlisi",
    "fizik": "1,65 boyunda, 55 kilo, siyah saçlı, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, müzik dinlemek, film izlemek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "Üniversitede otelcilik bölümünde okuyor.",
      "Okulun staj programı kapsamında otelde temizlik görevlisi olarak çalışıyor.",
      "Bu işten çok zevk alıyor ve ileride otelcilik sektöründe kariyer yapmak istiyor."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ayşe Karabulut",
    "yas": 45,
    "rol": "Housekeeping Şefi",
    "fizik": "1,70 boyunda, 60 kilo, sarı saçlı, yeşil gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Seyahat etmek, yeni şeyler denemek, insanlarla tanışmak",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "15 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 10 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Temizlik şefi olarak, departmanın günlük operasyonlarından sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Selin Kaya",
    "yas": 28,
    "rol": "Housekeeping Personeli",
    "fizik": "1,65 boyunda, 55 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, yardım etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve büyümüştür.",
      "10 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 5 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Odaları süsleme personeli olarak, misafirlerin odalarını özel günler için süslemekten sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Emre Yıldıran",
    "yas": 35,
    "rol": "Alancı",
    "fizik": "1,85 boyunda, 90 kilo, kahverengi saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı kahverengi saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, spor yapmak, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "15 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 10 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Genel temizlik görevlisi olarak, otelin tüm genel alanlarını temizlemekten sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Ceyda Demir",
    "yas": 25,
    "rol": "Housekeeping Personeli",
    "fizik": "1,65 boyunda, 55 kilo, siyah saçlı, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, müzik dinlemek, film izlemek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "5 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 3 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Oda temizlik görevlisi olarak, misafirlerin odalarını temizlemekten sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Mehmet Ali Taş",
    "yas": 40,
    "rol": "Housekeeping Personeli",
    "fizik": "1,70 boyunda, 75 kilo, sarı saçlı, yeşil gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Seyahat etmek, yeni şeyler denemek, insanlarla tanışmak",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "10 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 5 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Yatak takımı temizlik görevlisi olarak, misafirlerin yatak takımlarını temizlemekten sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Aysun Yılmaz",
    "yas": 30,
    "rol": "Housekeeping Personeli",
    "fizik": "1,60 boyunda, 50 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, yardım etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve büyümüştür.",
      "7 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 3 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Havlu katlama görevlisi olarak, misafirlerin havlularını katlamaktan sorumludur."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Eda Kara",
    "yas": 22,
    "rol": "Housekeeping Personeli",
    "fizik": "1,75 boyunda, 65 kilo, kahverengi saçlı, kahverengi gözlü, uzun boylu, dalgalı saçlar",
    "sac": "Uzun, dalgalı kahverengi saçlı",
    "gozler": "",
    "kisilik": "Samimi, güvenilir, neşeli, çalışkan",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, müzik dinlemek, dans etmek",
    "sevmedikleri": "Yalan, hakaret, küfür",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "3 yıldır otelcilik sektöründe çalışmaktadır.",
      "Son 1 yıldır otelin housekeeping departmanında çalışmaktadır.",
      "Tuvalet temizlik görevlisi olarak, misafirlerin tuvaletlerini temizlemekten sorumludur"
    ],
    "oyunda_var": false
  },
  {
    "ad": "Nusret Demir",
    "yas": 35,
    "rol": "Güvenlik Müdürü",
    "fizik": "1,85 boyunda, 90 kilo, kahverengi saçlı, kahverengi gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı kahverengi saçlı",
    "gozler": "",
    "kisilik": "Sert, kararlı, disiplinli, hırslı",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, spor yapmak, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, adaletsizlik, yalan",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "10 yıldır özel güvenlik görevlisi olarak çalışmaktadır.",
      "Boş zamanlarında ailesi ve arkadaşlarıyla vakit geçirmekten, spor yapmaktan ve yeni şeyler öğrenmekten hoşlanır."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Mehmet Akça",
    "yas": 28,
    "rol": "Güvenlik Görevlisi",
    "fizik": "1,75 boyunda, 75 kilo, siyah saçlı, mavi gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz siyah saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, sempatik, iyimser",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, müzik dinlemek, film izlemek",
    "sevmedikleri": "Kavga, gürültü, şiddet",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "5 yıldır özel güvenlik görevlisi olarak çalışmaktadır.",
      "Boş zamanlarında ailesi ve arkadaşlarıyla vakit geçirmekten, müzik dinlemekten ve film izlemekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Sibel Dansu",
    "yas": 30,
    "rol": "Güvenlik Görevlisi",
    "fizik": "1,70 boyunda, 60 kilo, sarı saçlı, yeşil gözlü, uzun boylu, dalgalı saçları olan",
    "sac": "Uzun, dalgalı sarı saçlı",
    "gozler": "",
    "kisilik": "Algılayıcı, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Seyahat etmek, yeni şeyler denemek, insanlarla tanışmak",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "İzmir'de doğmuş ve büyümüştür.",
      "7 yıldır özel güvenlik görevlisi olarak çalışmaktadır.",
      "Boş zamanlarında seyahat etmekten, yeni şeyler denemekten ve insanlarla tanışmaktan hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Halil Tekir",
    "yas": 32,
    "rol": "Güvenlik Görevlisi",
    "fizik": "1,65 boyunda, 70 kilo, kahverengi saçlı, kahverengi gözlü, kısa boylu, kıvırcık saçları olan",
    "sac": "Kısa, kıvırcık kahverengi saçlı",
    "gozler": "",
    "kisilik": "Sakin, düşünceli, merhametli, yardımsever",
    "sevdikleri": "Hayvanlarla vakit geçirmek, doğada olmak, kitap okumak",
    "sevmedikleri": "Şiddet, adaletsizlik, ayrımcılık",
    "hobiler": "",
    "ayrinti": [
      "Bursa'da doğmuş ve büyümüştür.",
      "10 yıldır özel güvenlik görevlisi olarak çalışmaktadır.",
      "Boş zamanlarında hayvanlarla vakit geçirmekten, doğada olmaktan ve kitap okumaktan hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Asya Çelik",
    "yas": 26,
    "rol": "Güvenlik Görevlisi",
    "fizik": "1,60 boyunda, 55 kilo, kumral saçlı, ela gözlü, orta boylu, düz saçları olan",
    "sac": "Orta boylu, düz kumral saçlı",
    "gozler": "",
    "kisilik": "Duygusal, şefkatli, empatik, yardımsever",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, yardım etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Antalya'da doğmuş ve büyümüştür.",
      "5 yıldır özel güvenlik görevlisi olarak çalışmaktadır.",
      "Boş zamanlarında ailesi ve arkadaşlarıyla vakit geçirmekten, yardım etmekten ve yeni şeyler öğrenmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Heves Karanfil",
    "yas": 26,
    "rol": "Türk Eskort",
    "fizik": "1,65 boyunda, 55 kilo, kahverengi gözlü, siyah saçlı, uzun boylu, düz saçları olan",
    "sac": "",
    "gozler": "",
    "kisilik": "Özgüvenli, cazibeli, güçlü, bağımsız",
    "sevdikleri": "Müziği, dansı, güzellik ürünlerini",
    "sevmedikleri": "Yalan söylemeyi, ihaneti, baskıyı",
    "hobiler": "",
    "ayrinti": [
      "5 yıldır profesyonel olarak hayat kadını olarak çalışmaktadır.",
      "İstanbul'da doğmuş ve büyümüştür.",
      "Bekar ve yalnızdır.",
      "Boş zamanlarında müzik dinlemeyi, dans etmeyi ve güzellik ürünlerini kullanmayı sever."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Öykü Toprak",
    "yas": 29,
    "rol": "Türk Eskort",
    "fizik": "1,70 boyunda, 60 kilo, ela gözlü, kahverengi saçlı, uzun boylu, dalgalı saçları olan",
    "sac": "",
    "gozler": "",
    "kisilik": "Zeki, esprili, zeki, merhametli",
    "sevdikleri": "Okumayı, yazmayı, insanları yardım etmeyi",
    "sevmedikleri": "Cahilliği, nefreti, adaletsizliği",
    "hobiler": "",
    "ayrinti": [
      "7 yıldır profesyonel olarak hayat kadını olarak çalışmaktadır.",
      "Ankara'da doğmuş ve büyümüştür.",
      "Bekar ve yalnızdır.",
      "Boş zamanlarında kitap okumayı, yazmayı ve insanları yardım etmeyi sever."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Leyla Abdallah",
    "yas": 25,
    "rol": "Mısırlı Eskort",
    "fizik": "1,60 boyunda, 50 kilo, siyah gözlü, siyah saçlı, kısa boylu, düz saçları olan",
    "sac": "",
    "gozler": "",
    "kisilik": "Duygusal, sevecen, şefkatli, yardımsever",
    "sevdikleri": "Ailesini, arkadaşlarını, yardım etmeyi",
    "sevmedikleri": "Yalnızlığı, ayrılığı, adaletsizliği",
    "hobiler": "",
    "ayrinti": [
      "3 yıldır profesyonel olarak hayat kadını olarak çalışmaktadır.",
      "Kahire'de doğmuş ve büyümüştür.",
      "Bekar ve yalnızdır.",
      "Boş zamanlarında ailesini ve arkadaşlarını görmeyi, yardım etmeyi sever."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Nadia El-Amrani",
    "yas": 24,
    "rol": "Faslı Eskort",
    "fizik": "1,75 boyunda, 65 kilo, kahverengi gözlü, koyu kahverengi saçlı, uzun boylu, dalgalı saçları olan",
    "sac": "",
    "gozler": "",
    "kisilik": "Tutkulu, iddialı, cesur, bağımsız",
    "sevdikleri": "Dansı, müziği, seyahat etmeyi",
    "sevmedikleri": "Sınırlamaları, kısıtlamaları, önyargıları",
    "hobiler": "",
    "ayrinti": [
      "4 yıldır profesyonel olarak hayat kadını olarak çalışmaktadır.",
      "Kazablanka'da doğmuş ve büyümüştür.",
      "Bekar ve yalnızdır.",
      "Boş zamanlarında dans etmeyi, müzik dinlemeyi ve seyahat etmeyi sever."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Safa Benjelloun",
    "yas": 26,
    "rol": "Cezayirli Eskort",
    "fizik": "1,65 boyunda, 55 kilo, mavi gözlü, sarı saçlı, uzun boylu, düz saçları olan",
    "sac": "",
    "gozler": "",
    "kisilik": "Çekici, eğlenceli, zeki, bağımsız",
    "sevdikleri": "Modaya, alışverişe, güzellik ürünlerine",
    "sevmedikleri": "Sıradanlığı, monotonluğu, bağımlılığı",
    "hobiler": "",
    "ayrinti": [
      "5 yıldır profesyonel olarak hayat kadını olarak çalışmaktadır.",
      "Cezayir'de doğmuş ve büyümüştür.",
      "Bekar ve yalnızdır.",
      "Boş zamanlarında modaya, alışverişe ve güzellik ürünlerine bakmayı sever."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Jasmin El-Trabelsi",
    "yas": 23,
    "rol": "Tunuslu Eskort",
    "fizik": "1,65 boyunda, 55 kilo, siyah saçlı, kahverengi gözlü, uzun boylu, düz saçları olan",
    "sac": "Uzun, siyah saçlı",
    "gozler": "",
    "kisilik": "Sevecen, yardımsever, merhametli, cesur",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Ayrılık, ayrımcılık, adaletsizlik",
    "hobiler": "",
    "ayrinti": [
      "Tunus'un başkenti Tunus'ta doğmuş ve büyümüştür.",
      "Üniversitede işletme bölümünde okuyor.",
      "Boş zamanlarında aile ve arkadaşlarıyla vakit geçirmekten, yeni şeyler öğrenmekten ve seyahat etmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Sari El-Hassan",
    "yas": 22,
    "rol": "Lübnanlı Eskort",
    "fizik": "1,70 boyunda, 60 kilo, siyah saçlı, mavi gözlü, kısa boylu, kıvırcık saçları olan",
    "sac": "Kısa, kıvırcık siyah saçlı",
    "gozler": "",
    "kisilik": "Zeki, yaratıcı, özgüvenli, kararlı",
    "sevdikleri": "Okumak, yazmak, müzik dinlemek, dans etmek",
    "sevmedikleri": "Sıkıntı, monotonluk, belirsizlik",
    "hobiler": "",
    "ayrinti": [
      "Lübnan'ın başkenti Beyrut'ta doğmuş ve büyümüştür.",
      "Üniversitede edebiyat bölümünde okuyor.",
      "Boş zamanlarında kitap okumaktan, yazmaktan, müzik dinlemekten ve dans etmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Vania Ivanova",
    "yas": 21,
    "rol": "Ukraynalı Eskort",
    "fizik": "1,75 boyunda, 65 kilo, sarı saçlı, mavi gözlü, uzun boylu, düz saçları olan",
    "sac": "Uzun, düz sarı saçlı",
    "gozler": "",
    "kisilik": "Özgür ruhlu, heyecanlı, maceracı, cesur",
    "sevdikleri": "Seyahat etmek, yeni şeyler denemek, doğayla vakit geçirmek",
    "sevmedikleri": "Rutin, monotonluk, kısıtlamalar",
    "hobiler": "",
    "ayrinti": [
      "Ukrayna'nın başkenti Kiev'de doğmuş ve büyümüştür.",
      "Üniversitede turizm bölümünde okuyor.",
      "Boş zamanlarında seyahat etmekten, yeni şeyler denemekten ve doğayla vakit geçirmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Elena Petrova",
    "yas": 24,
    "rol": "Rus Eskort",
    "fizik": "1,60 boyunda, 50 kilo, kahverengi saçlı, yeşil gözlü, kısa boylu, düz saçları olan",
    "sac": "Kısa, düz kahverengi saçlı",
    "gozler": "",
    "kisilik": "Akıllı, çalışkan, disiplinli, hırslı",
    "sevdikleri": "Okumak, yazmak, araştırma yapmak, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, boşa vakit geçirmek, sığlık",
    "hobiler": "",
    "ayrinti": [
      "Rusya'nın başkenti Moskova'da doğmuş ve büyümüştür.",
      "Üniversitede mühendislik bölümünde okuyor.",
      "Boş zamanlarında kitap okumaktan, yazmaktan, araştırma yapmaktan ve yeni şeyler öğrenmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Gülya Berdyyeva",
    "yas": 23,
    "rol": "Türkmen Eskort",
    "fizik": "1,70 boyunda, 60 kilo, kumral saçlı, ela gözlü, orta boylu, dalgalı saçları olan",
    "sac": "Orta boylu, dalgalı kumral saçlı",
    "gozler": "",
    "kisilik": "Güler yüzlü, yardımsever, iyimser, sevecen",
    "sevdikleri": "Ailesi ve arkadaşlarıyla vakit geçirmek, yeni şeyler öğrenmek, yardım etmek",
    "sevmedikleri": "Yalnızlık, ayrımcılık, haksızlık",
    "hobiler": "",
    "ayrinti": [
      "Türkmenistan'ın başkenti Aşkabat'ta doğmuş ve büyümüştür.",
      "Üniversitede tıp bölümünde okuyor.",
      "Boş zamanlarında ailesi ve arkadaşlarıyla vakit geçirmekten, yeni şeyler öğrenmekten ve yardım etmekten hoşlanır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Alper Kansu",
    "yas": 34,
    "rol": "İş Seyahati Misafiri",
    "fizik": "1,85 boyunda, 80 kilo, atletik yapılı, koyu kahverengi gözlü, kısa, siyah saçlı",
    "sac": "Kısa, siyah saçlı",
    "gozler": "",
    "kisilik": "İş odaklı, hırslı, disiplinli, dakiklik ve verimliliğe önem veren, yerel mutfağı keşfetmeyi ve şık giyinmeyi seven, uçuş gecikmelerini sevmeyen, iş anlaşması yapmanın heyecanını yaşayan",
    "sevdikleri": "İş seyahatlerinde yerel mutfağı keşfetmek, şık giyinmek, iş anlaşması yapmak",
    "sevmedikleri": "Uçuş gecikmeleri, iş ortamında düzensizlik",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "10 yıldır uluslararası bir şirkette satış müdürü olarak çalışmaktadır.",
      "İş seyahatlerinde yeni lezzetler denemeyi ve yerel kültürleri keşfetmeyi sever.",
      "Düzenli olarak spor yapar ve sağlıklı beslenir."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Aylin Karakaş",
    "yas": 27,
    "rol": "Genç Tatilci",
    "fizik": "1,65 boyunda, 55 kilo, minyon yapılı, mavi gözlü, uzun, sarı saçlı",
    "sac": "Uzun, sarı saçlı",
    "gozler": "",
    "kisilik": "Maceracı, spontane, açık fikirli, yeni destinasyonları keşfetmekten keyif alan, seyahatlerinde güzel anları fotoğraflamaya tutkulu, kalabalık turistik yerlerden hoşlanmayan, yerel kültüre dalmayı seven",
    "sevdikleri": "Yeni destinasyonları keşfetmek, güzel anları fotoğraflamak, yerel kültüre dalmak",
    "sevmedikleri": "Kalabalık turistik yerler, düzensizlik",
    "hobiler": "",
    "ayrinti": [
      "İzmir'da doğmuş ve büyümüştür.",
      "5 yıldır dünyayı gezmektedir.",
      "Seyahatlerinde yeni insanlarla tanışmayı ve farklı kültürleri öğrenmeyi sever.",
      "Fotoğrafçılık eğitimi almıştır ve fotoğraf çekmekten büyük keyif alır."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Feride Çarıkçı",
    "yas": 41,
    "rol": "Yeni Boşanmış Eski Oyuncu",
    "fizik": "1,70 boyunda, 60 kilo, fit yapılı, ela gözlü, dalgalı, kahverengi saçlı",
    "sac": "Dalgalı, kahverengi saçlı",
    "gozler": "",
    "kisilik": "İçe dönük, düşünceli, yalnızlığı değer veren, seyahatlerinde huzur arayan",
    "sevdikleri": "Huzur, plajda kitap okumak, meditasyon yapmak",
    "sevmedikleri": "Gürültülü turistik yerler, kalabalık",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "Efsane olmuş bazı filmlerin başrol aktristidir.",
      "10 yıldır hiçbir filmde oynamamıştır.",
      "Seyahatlerinde huzur ve sakinlik aramaktadır.",
      "Doğayı ve hayvanları sever."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Ilgaz Demirer",
    "yas": 29,
    "rol": "Zengin Bir Ailenin Oğlu",
    "fizik": "1,80 boyunda, 70 kilo, atletik yapılı, mavi gözlü, kısa, kahverengi saçlı",
    "sac": "Kısa, kahverengi saçlı",
    "gozler": "",
    "kisilik": "Özgüvenli, cesur, maceracı, yeni deneyimlere açık",
    "sevdikleri": "Film izlemek, filmlere ait eşyaları toplamak, yeni şeyler öğrenmek",
    "sevmedikleri": "Rutin, monotonluk, konfor alanından çıkmak",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "5 yıldır dünyayı gezmektedir.",
      "Macera dolu bir hayat yaşamak ister.",
      "Yeni insanlarla tanışmaktan ve farklı kültürleri öğrenmekten keyif alır."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Emir Çeliker",
    "yas": 37,
    "rol": "Yazar",
    "fizik": "1,75 boyunda, 65 kilo, normal yapılı, yeşil gözlü, kısa, siyah saçlı",
    "sac": "Kısa, siyah saçlı",
    "gozler": "",
    "kisilik": "Zeki, yaratıcı, gözlemci, analitik",
    "sevdikleri": "Kitap okumak, yazmak, film izlemek",
    "sevmedikleri": "Tembellik, önyargı, yüzeysellik",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "10 yıldır roman yazarlığı yapmaktadır.",
      "Romanlarında genellikle toplumsal sorunları ve insan ilişkilerini ele alır.",
      "Seyahat etmeyi ve yeni insanlarla tanışmayı sever."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Seda Kor",
    "yas": 33,
    "rol": "İki Eski Arkadaşın Karşılaşması",
    "fizik": "1,65 boyunda, 55 kilo, minyon yapılı, mavi gözlü, uzun, sarı saçlı",
    "sac": "Uzun, sarı saçlı",
    "gozler": "",
    "kisilik": "Sevecen, arkadaş canlısı, yardımsever, eğlenceli",
    "sevdikleri": "Arkadaşlarıyla vakit geçirmek, yeni şeyler öğrenmek, seyahat etmek",
    "sevmedikleri": "Yalnızlık, sıkıcı insanlar, monotonluk",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "Bir reklam ajansında çalışmaktadır.",
      "Arkadaşları ile vakit geçirmekten ve yeni şeyler öğrenmekten keyif alır.",
      "Seyahat etmeyi ve yeni kültürler keşfetmeyi sever."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Selim Yıldız",
    "yas": 31,
    "rol": "Genç Çift Üyesi",
    "fizik": "1,80 boyunda, 70 kilo, atletik yapılı, kahverengi gözlü, kısa, siyah saçlı",
    "sac": "Kısa, siyah saçlı",
    "gozler": "",
    "kisilik": "Özgüvenli, cesur, maceracı, yeni deneyimlere açık",
    "sevdikleri": "Spor yapmak, doğada vakit geçirmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Rutin, monotonluk, konfor alanından çıkmak",
    "hobiler": "",
    "ayrinti": [
      "Ankara'da doğmuş ve büyümüştür.",
      "Bir yazılım firmasında çalışmaktadır.",
      "Macera dolu bir hayat yaşamak ister.",
      "Yeni insanlarla tanışmaktan ve farklı kültürleri öğrenmekten keyif alır."
    ],
    "oyunda_var": false
  },
  {
    "ad": "Nazlı Demirkol",
    "yas": 38,
    "rol": "İş Kadını",
    "fizik": "1,70 boyunda, 60 kilo, fit yapılı, ela gözlü, dalgalı, kahverengi saçlı",
    "sac": "Dalgalı, kahverengi saçlı",
    "gozler": "",
    "kisilik": "İş odaklı, hırslı, disiplinli, kararlı",
    "sevdikleri": "İşini yapmak, seyahat etmek, yeni şeyler öğrenmek",
    "sevmedikleri": "Tembellik, düzensizlik, belirsizlik",
    "hobiler": "",
    "ayrinti": [
      "İstanbul'da doğmuş ve büyümüştür.",
      "Bir finans şirketinde yönetici olarak çalışmaktadır.",
      "İşinde başarılı olmak için çok çalışır.",
      "Seyahat etmeyi ve yeni kültürler keşfetmeyi sever."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Barbaros Yılmaz",
    "yas": 36,
    "rol": "Gezgin",
    "fizik": "1,85 boyunda, 80 kilo, atletik yapılı, mavi gözlü, kısa, kahverengi saçlı",
    "sac": "Kısa, kahverengi saçlı",
    "gozler": "",
    "kisilik": "Dışa dönük, girişken, maceracı, eğlenceli",
    "sevdikleri": "Seyahat etmek, yeni insanlarla tanışmak, yeni şeyler denemek",
    "sevmedikleri": "Rutin, monotonluk, konfor alanından çıkmak",
    "hobiler": "",
    "ayrinti": [
      "İsviçre'de doğmuş ve büyümüştür.",
      "Lakros takımında çalışmaktadır.",
      "Dünyayı gezmek ve yeni deneyimler yaşamak ister.",
      "Yeni insanlarla tanışmaktan ve farklı kültürleri öğrenmekten keyif alır."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Tanju Kayaca",
    "yas": 30,
    "rol": "Spor Tutkunu Misafir",
    "fizik": "1,80 boyunda, 75 kilo, atletik yapılı, kaslı bir vücuda sahip.",
    "sac": "Kısa siyah saçları düzgün ve bakımlı.",
    "gozler": "Canlı mavi gözleri enerji ve tutkuyu yansıtıyor.",
    "kisilik": "Rekabetçi, enerjik ve sınırlarını zorlamayı seven bir yapıya sahip.",
    "sevdikleri": "",
    "sevmedikleri": "",
    "hobiler": "Spor yapmaktan ve yeni aktiviteler denemekten keyif alır. Genellikle spor salonuna gider veya doğada egzersiz yapar.",
    "ayrinti": [
      "İstanbul doğumlu ve genç yaşına rağmen spor tutkusu onun için bir yaşam tarzı haline gelmiştir.",
      "Hafta sonları genellikle arkadaşlarıyla spor etkinlikleri düzenler ve yarışmalara katılır.",
      "Maraton koşmak onun için büyük bir tutkudur."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Yasemin Çelay",
    "yas": 29,
    "rol": "Yoga Eğitmeni",
    "fizik": "1,68 boyunda, esnek ve kaslı bir vücuda sahip.",
    "sac": "Uzun, siyah saçları sıkça bir topuzda toplanır.",
    "gozler": "Sakin kahverengi gözleri iç huzuru yansıtır.",
    "kisilik": "Sakin, sabırlı ve bütünsel bir yaşam tarzını benimsemiştir.",
    "sevdikleri": "",
    "sevmedikleri": "",
    "hobiler": "Yoga yapmaktan ve başkalarına yoga öğretmekten keyif alır. Seyahatlerinde yoga yapabileceği sakin alanlar arar.",
    "ayrinti": [
      "Yoga eğitmeni olarak eğitim almış ve yoga pratiği onun için bir yaşam felsefesi haline gelmiştir.",
      "Yoga matını yanından ayırmaz ve seyahatlerinde de yoga yapmayı ihmal etmez.",
      "Yoga eğitimleri vererek başkalarının da bu dengeyi bulmasına yardımcı olur."
    ],
    "oyunda_var": true
  },
  {
    "ad": "Reyhan Üsküp",
    "yas": 34,
    "rol": "Doğa Fotoğrafçısı",
    "fizik": "1,73 boyunda, 70 kilo, ince bir vücuda sahip.",
    "sac": "Dalgalı kahverengi saçları genellikle açık bırakılır.",
    "gozler": "Parlak yeşil gözleri doğaya duyduğu hayranlığı yansıtır.",
    "kisilik": "Gözlemci, sabırlı ve doğanın korunmasına duyarlı bir kişiliğe sahiptir.",
    "sevdikleri": "",
    "sevmedikleri": "",
    "hobiler": "Doğada fotoğraf çekmekten ve vahşi yaşamın korunmasına katkıda bulunmaktan keyif alır. En güzel manzaraları yakalamak için dünya genelinde seyahat eder.",
    "ayrinti": [
      "Reyhan, doğa fotoğrafçılığına olan ilgisi sayesinde pek çok ülkeyi gezip en iyi manzaraları yakalamış bir fotoğrafçıdır.",
      "Aynı zamanda doğayı korumak için çeşitli doğa koruma dernekleriyle işbirliği yapar ve fotoğraflarının gelirini doğa koruma projelerine bağışlar."
    ],
    "oyunda_var": true
  }
];
