const HANGUL = "\\uAC00-\\uD7A3";

export function normalizePdfText(text: string) {
  return joinKoreanLineBreaks(fixNumericSpacing(removeNoisyCharacters(normalizeUnicode(text))))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasLikelyMojibake(text: string) {
  return text.includes("\uFFFD") || /\?{3,}|[ÃÂ][\x80-\xBF]/.test(text) || countSuspiciousCjkRuns(text) > 0;
}

function normalizeUnicode(text: string) {
  return text.normalize("NFKC").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function removeNoisyCharacters(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[□■◆◇●○]{2,}/g, " ")
    .replace(/[^\S\n]+/g, " ");
}

function joinKoreanLineBreaks(text: string) {
  return text
    .split("\n")
    .reduce<string[]>((lines, line) => {
      const current = line.trim();
      if (!current) {
        lines.push("");
        return lines;
      }
      const previous = lines.at(-1);
      if (previous && shouldJoin(previous, current)) {
        lines[lines.length - 1] = `${previous} ${current}`;
      } else {
        lines.push(current);
      }
      return lines;
    }, [])
    .join("\n");
}

function shouldJoin(previous: string, current: string) {
  const legalMarker = new RegExp(`^(제\\s*\\d+\\s*(?:조|장|절)|[①②③④⑤⑥⑦⑧⑨⑩]|\\d+\\.|[${HANGUL}]\\.)`);
  const hangulOrNumberEnd = new RegExp(`[${HANGUL}0-9)]$`);
  const hangulOrNumberStart = new RegExp(`^[${HANGUL}(0-9]`);
  if (legalMarker.test(current)) return false;
  if (/[.;。]$/.test(previous)) return false;
  if (previous.length < 12) return false;
  return hangulOrNumberEnd.test(previous) && hangulOrNumberStart.test(current);
}

function fixNumericSpacing(text: string) {
  const units = "(?:킬로그램|kg|그램|g|미터|m|만원|원|개월|일|년|시간|대|명|회)";
  const operators = "(?:이상|이하|초과|미만|이내|까지)";
  return text
    .replace(/이\s+상/g, "이상")
    .replace(/이\s+하/g, "이하")
    .replace(/초\s+과/g, "초과")
    .replace(/미\s+만/g, "미만")
    .replace(/이\s+내/g, "이내")
    .replace(/까\s+지/g, "까지")
    .replace(/신\s*고\s*하\s*여\s*야/g, "신고하여야")
    .replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s+(${units.slice(3, -1)})\\b`, "gi"), "$1$2")
    .replace(new RegExp(`(\\d+(?:\\.\\d+)?${units}?)\\s+(${operators.slice(3, -1)})`, "g"), "$1 $2")
    .replace(/(\d)\s+(\d{3})(만원|원)/g, "$1$2$3")
    .replace(new RegExp(`([${HANGUL}])\\s+([은는이가을를에의와과로])\\b`, "g"), "$1$2");
}

function countSuspiciousCjkRuns(text: string) {
  return [...text.matchAll(/[媛揶횄횂][^\s]{1,8}/g)].length;
}
