export function getUserKey(): string {
  if (typeof window === "undefined") return "";
  let userKey = localStorage.getItem("speakup_user_id");
  if (!userKey) {
    userKey = crypto.randomUUID();
    localStorage.setItem("speakup_user_id", userKey);
  }
  return userKey;
}
