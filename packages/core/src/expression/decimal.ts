/**
 * Rounds `x` to `digits` decimal places, half away from zero, using the shortest
 * decimal representation of `x` (operators-v1 §5). Working on the decimal string
 * avoids binary artefacts: `roundHalfAwayFromZero(1.005, 2)` is `1.01`.
 */
export function roundHalfAwayFromZero(x: number, digits: number): number {
  const negative = x < 0;
  const [mantissa = "0", exponentPart] = String(Math.abs(x)).split("e");
  const exponent = exponentPart === undefined ? 0 : Number.parseInt(exponentPart, 10);
  const [intPart = "0", fracPart = ""] = mantissa.split(".");

  let allDigits = intPart + fracPart;
  // Number of digits before the decimal point.
  let pointPos = intPart.length + exponent;
  if (pointPos < 0) {
    allDigits = "0".repeat(-pointPos) + allDigits;
    pointPos = 0;
  }
  if (pointPos > allDigits.length) {
    allDigits += "0".repeat(pointPos - allDigits.length);
  }

  const keep = pointPos + digits;
  if (keep >= allDigits.length) {
    return x === 0 ? 0 : x;
  }

  let kept = allDigits.slice(0, keep) || "0";
  if (allDigits.charCodeAt(keep) - 48 >= 5) {
    kept = incrementDigits(kept);
  }

  const intLength = kept.length - digits;
  const text =
    (intLength > 0 ? kept.slice(0, intLength) : "0") +
    (digits > 0 ? "." + kept.slice(Math.max(intLength, 0)).padStart(digits, "0") : "");
  const result = Number(text);
  return result === 0 ? 0 : negative ? -result : result;
}

/** Adds one to a string of decimal digits. */
function incrementDigits(digits: string): string {
  const chars = digits.split("");
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] === "9") {
      chars[i] = "0";
    } else {
      chars[i] = String.fromCharCode(chars[i]!.charCodeAt(0) + 1);
      return chars.join("");
    }
  }
  return "1" + chars.join("");
}
