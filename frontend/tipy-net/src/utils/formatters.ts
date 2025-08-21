export const formatAddress = (address: string | undefined | null): string => {
  if (!address) return "Unknown";
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

export const formatAmount = (amount: number, isSol: boolean): string => {
  return isSol ? (amount / 1000000000).toFixed(6) + " SOL" : amount.toString();
};

export const formatDate = (date: Date): string => {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const shortenSignature = (signature: string): string => {
  return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
};
