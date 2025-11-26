export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 0) {
    return "gerade eben";
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 1) {
    return "gerade eben";
  } else if (seconds < 60) {
    return `${seconds} Sek.`;
  } else if (minutes < 60) {
    return `${minutes} Min.`;
  } else if (hours < 24) {
    return `${hours} Std.`;
  } else if (days < 7) {
    return `${days} T.`;
  } else {
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
    });
  }
}

