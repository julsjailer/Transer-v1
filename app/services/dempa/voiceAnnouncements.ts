/** Minimal voice announcements adapted from the supplied DEMPA local module.
 * It only speaks a generic notification; it does not execute connection actions.
 */
export function supportsVoiceAnnouncements(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function announceDempa(text: string, language: "es" | "en"): void {
  if (!supportsVoiceAnnouncements() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "es" ? "es-ES" : "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}
