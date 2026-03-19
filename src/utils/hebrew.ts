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
];
