export const mockHistory = [
  {
    title: "UPI Collect Request",
    time: "Today 10:12",
    risk: "HIGH RISK",
    score: 92,
  },
  {
    title: "Bank KYC Expired",
    time: "Today 09:03",
    risk: "SUSPICIOUS",
    score: 64,
  },
  {
    title: "Salary Credit SMS",
    time: "Yesterday 18:41",
    risk: "SAFE",
    score: 12,
  },
];

export const mockDashboard = {
  total: 128,
  spam: 34,
  normal: 94,
  top_spam_types: [
    { label: "UPI Fraud", value: 14 },
    { label: "Phishing", value: 9 },
    { label: "Loan Scam", value: 6 },
    { label: "Lottery", value: 5 },
  ],
  latest_normal: [
    "Salary credited from SBI",
    "Your OTP for login is 482901",
    "Package delivered successfully",
  ],
  latest_spam: [
    "UPI collect request pending",
    "KYC expired verify now",
    "Win lottery prize click link",
  ],
};
