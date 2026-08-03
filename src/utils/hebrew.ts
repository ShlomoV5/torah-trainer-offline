export function toHebrewLetter(num: number): string {
  if (num <= 0) return '';
  const tensStr = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const unitsStr = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  let result = "";
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    const hundredsStr = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
    result += hundredsStr[hundreds];
    num %= 100;
  }
  if (num === 15) return result + "טו";
  if (num === 16) return result + "טז";
  result += tensStr[Math.floor(num / 10)] + unitsStr[num % 10];
  return result;
}

export function getDateString(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export const BOOK_OPTIONS = [
  { value: "Genesis", label: "בראשית" },
  { value: "Exodus", label: "שמות" },
  { value: "Leviticus", label: "ויקרא" },
  { value: "Numbers", label: "במדבר" },
  { value: "Deuteronomy", label: "דברים" },
  { value: "Joshua", label: "יהושע" },
  { value: "Judges", label: "שופטים" },
  { value: "I Samuel", label: "שמואל א׳" },
  { value: "II Samuel", label: "שמואל ב׳" },
  { value: "I Kings", label: "מלכים א׳" },
  { value: "II Kings", label: "מלכים ב׳" },
  { value: "Isaiah", label: "ישעיהו" },
  { value: "Jeremiah", label: "ירמיהו" },
  { value: "Ezekiel", label: "יחזקאל" },
  { value: "Hosea", label: "הושע" },
  { value: "Joel", label: "יואל" },
  { value: "Amos", label: "עמוס" },
  { value: "Obadiah", label: "עובדיה" },
  { value: "Jonah", label: "יונה" },
  { value: "Micah", label: "מיכה" },
  { value: "Nahum", label: "נחום" },
  { value: "Habakkuk", label: "חבקוק" },
  { value: "Zephaniah", label: "צפניה" },
  { value: "Haggai", label: "חגי" },
  { value: "Zechariah", label: "זכריה" },
  { value: "Malachi", label: "מלאכי" },
];

/** Parasha / special reading entries for the parsha picker */
export interface ParshaEntry {
  /** Display name in Hebrew */
  label: string;
  /** Sefaria slug used in the next-read API */
  slug: string;
}

export const PARSHA_LIST: ParshaEntry[] = [
  // בראשית
  { label: "בראשית", slug: "Bereshit" },
  { label: "נח", slug: "Noach" },
  { label: "לך לך", slug: "Lech-Lecha" },
  { label: "וירא", slug: "Vayera" },
  { label: "חיי שרה", slug: "Chayei_Sara" },
  { label: "תולדות", slug: "Toldot" },
  { label: "ויצא", slug: "Vayetzei" },
  { label: "וישלח", slug: "Vayishlach" },
  { label: "וישב", slug: "Vayeshev" },
  { label: "מקץ", slug: "Miketz" },
  { label: "ויגש", slug: "Vayigash" },
  { label: "ויחי", slug: "Vayechi" },
  // שמות
  { label: "שמות", slug: "Shemot" },
  { label: "וארא", slug: "Vaera" },
  { label: "בא", slug: "Bo" },
  { label: "בשלח", slug: "Beshalach" },
  { label: "יתרו", slug: "Yitro" },
  { label: "משפטים", slug: "Mishpatim" },
  { label: "תרומה", slug: "Terumah" },
  { label: "תצווה", slug: "Tetzaveh" },
  { label: "כי תשא", slug: "Ki_Tisa" },
  { label: "ויקהל", slug: "Vayakhel" },
  { label: "פקודי", slug: "Pekudei" },
  // ויקרא
  { label: "ויקרא", slug: "Vayikra" },
  { label: "צו", slug: "Tzav" },
  { label: "שמיני", slug: "Shmini" },
  { label: "תזריע", slug: "Tazria" },
  { label: "מצורע", slug: "Metzora" },
  { label: "אחרי מות", slug: "Achrei_Mot" },
  { label: "קדושים", slug: "Kedoshim" },
  { label: "אמור", slug: "Emor" },
  { label: "בהר", slug: "Behar" },
  { label: "בחוקותי", slug: "Bechukotai" },
  // במדבר
  { label: "במדבר", slug: "Bamidbar" },
  { label: "נשא", slug: "Nasso" },
  { label: "בהעלותך", slug: "Beha'alotcha" },
  { label: "שלח", slug: "Sh'lach" },
  { label: "קרח", slug: "Korach" },
  { label: "חוקת", slug: "Chukat" },
  { label: "בלק", slug: "Balak" },
  { label: "פינחס", slug: "Pinchas" },
  { label: "מטות", slug: "Matot" },
  { label: "מסעי", slug: "Masei" },
  // דברים
  { label: "דברים", slug: "Devarim" },
  { label: "ואתחנן", slug: "Vaetchanan" },
  { label: "עקב", slug: "Eikev" },
  { label: "ראה", slug: "Re'eh" },
  { label: "שופטים", slug: "Shoftim" },
  { label: "כי תצא", slug: "Ki_Teitzei" },
  { label: "כי תבוא", slug: "Ki_Tavo" },
  { label: "ניצבים", slug: "Nitzavim" },
  { label: "וילך", slug: "Vayeilech" },
  { label: "האזינו", slug: "Ha'Azinu" },
  { label: "וזאת הברכה", slug: "Vezot_Haberakhah" },
  // מועדים מיוחדים
  { label: "ראש השנה", slug: "Rosh_Hashana" },
  { label: "יום כיפור", slug: "Yom_Kippur" },
  { label: "סוכות", slug: "Sukkot" },
  { label: "שמחת תורה", slug: "Simchat_Torah" },
  { label: "פסח", slug: "Pesach" },
  { label: "שבועות", slug: "Shavuot" },
  { label: "חנוכה", slug: "Chanukah" },
  { label: "פורים", slug: "Purim" },
];

export const NUSACH_OPTIONS = [
  { value: "ashkenazi", label: "אשכנז" },
  { value: "sephardi", label: "ספרד" },
  { value: "edot_hamizrach", label: "עדות המזרח" },
  { value: "teimani", label: "תימן" },
  { value: "italian", label: "איטלקי" },
];
