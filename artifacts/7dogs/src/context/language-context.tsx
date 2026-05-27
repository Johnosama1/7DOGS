import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "en" | "ar";

const translations = {
  en: {
    // Wheel
    wheelTitle: "VIP Lounge",
    wheelSubtitle: "Spin to earn luxury rewards",
    spinBtn: "SPIN NOW",
    spinning: "Spinning...",
    noSpins: "No spins left!",
    noSpinsDesc: "Invite friends to earn free spins!",
    spinError: "An error occurred. Try again.",
    winTitle: "🎉 You won!",
    winDesc: (label: string) => `You received ${label} coins!`,
    spinsLabel: "Spins",
    coinsLabel: "Coins",

    // Referrals
    inviteTitle: "Invite Friends",
    inviteSubtitle: "Earn free spins for every friend who joins via your link.",
    nextReward: "Next Reward",
    progress: "Progress",
    reward: "Reward",
    copyLink: "Copy Link",
    copied: "Copied!",
    copiedDesc: "Referral link copied to clipboard.",
    yourNetwork: "Your Network",
    noInvites: "You haven't invited anyone yet.",

    // Gifts
    boutiqueTitle: "Boutique",
    boutiqueSubtitle: "Redeem your 7DOGS Coins for exclusive gifts.",
    redeem: "REDEEM",
    confirmRedeem: "Confirm Redemption",
    confirmRedeemDesc: (name: string, price: string) =>
      `Redeem "${name}" for ${price} coins?`,
    cancel: "Cancel",
    confirm: "Confirm",
    processing: "Processing...",
    insufficientCoins: "Insufficient Coins",
    insufficientCoinsDesc: "You don't have enough coins.",
    redeemSuccess: "Redeemed!",
    redeemSuccessDesc: "Gift redeemed successfully.",
    noGifts: "No gifts available yet.",

    // Account
    totalCoins: "Total Coins",
    totalSpins: "Total Spins",
    myGifts: "My Redeemed Gifts",
    spendCoins: "Spend Coins",
    adminDashboard: "Admin Dashboard",
    loading: "Loading...",

    // Bottom nav
    navWheel: "Wheel",
    navReferrals: "Referrals",
    navGifts: "Gifts",
    navAccount: "Account",

    // Language picker
    chooseLanguage: "Choose Language",
    english: "English",
    arabic: "العربية",

    // Admin
    adminTitle: "Admin",
    adminPassword: "Admin Password",
    enter: "Enter",
    verifying: "Verifying...",
    accessDenied: "Access Denied",
    invalidPassword: "Invalid password",
    logout: "Logout",
    restrictedArea: "Restricted Area",
  },
  ar: {
    // Wheel
    wheelTitle: "VIP Lounge",
    wheelSubtitle: "العب وكسب مكافآت فاخرة",
    spinBtn: "العب دلوقتي",
    spinning: "جاري اللف...",
    noSpins: "مفيش لفات!",
    noSpinsDesc: "ادعو أصحابك عشان تكسب لفات مجانية!",
    spinError: "حصل خطأ. حاول تاني.",
    winTitle: "🎉 مبروك!",
    winDesc: (label: string) => `كسبت ${label} عملة!`,
    spinsLabel: "لفات",
    coinsLabel: "عملات",

    // Referrals
    inviteTitle: "ادعو أصحابك",
    inviteSubtitle: "اكسب لفات مجانية لكل صاحب بيدخل بلينك بتاعك.",
    nextReward: "المكافأة الجاية",
    progress: "التقدم",
    reward: "المكافأة",
    copyLink: "انسخ اللينك",
    copied: "اتنسخ!",
    copiedDesc: "اتنسخ اللينك في الكليبورد.",
    yourNetwork: "أصحابك",
    noInvites: "لسه مدعيتش حد.",

    // Gifts
    boutiqueTitle: "المتجر",
    boutiqueSubtitle: "استبدل عملاتك بهدايا حصرية.",
    redeem: "استبدل",
    confirmRedeem: "تأكيد الاستبدال",
    confirmRedeemDesc: (name: string, price: string) =>
      `عايز تستبدل "${name}" بـ ${price} عملة؟`,
    cancel: "إلغاء",
    confirm: "تأكيد",
    processing: "جاري التنفيذ...",
    insufficientCoins: "عملات مش كفاية",
    insufficientCoinsDesc: "مش معاك عملات كفاية.",
    redeemSuccess: "تم!",
    redeemSuccessDesc: "اتاستبدلت الهدية بنجاح.",
    noGifts: "مفيش هدايا متاحة دلوقتي.",

    // Account
    totalCoins: "إجمالي العملات",
    totalSpins: "إجمالي اللفات",
    myGifts: "هداياي",
    spendCoins: "استبدل عملاتك",
    adminDashboard: "لوحة الأدمن",
    loading: "جاري التحميل...",

    // Bottom nav
    navWheel: "العجلة",
    navReferrals: "أصحابك",
    navGifts: "هدايا",
    navAccount: "حسابي",

    // Language picker
    chooseLanguage: "اختار اللغة",
    english: "English",
    arabic: "العربية",

    // Admin
    adminTitle: "الأدمن",
    adminPassword: "باسورد الأدمن",
    enter: "دخول",
    verifying: "جاري التحقق...",
    accessDenied: "رفض الدخول",
    invalidPassword: "باسورد غلط",
    logout: "خروج",
    restrictedArea: "منطقة مقيدة",
  },
} as const;

export type Translations = typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  isRTL: boolean;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("7dogs_lang") as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    localStorage.setItem("7dogs_lang", l);
    setLangState(l);
  };

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] as Translations, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
