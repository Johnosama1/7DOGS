import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gift, Users, ChevronRight, Sparkles } from "lucide-react";
import botLogo from "/7dogs-logo.jpeg";

const STORAGE_KEY = "7dogs_welcomed_v1";

interface WelcomeScreenProps {
  children: React.ReactNode;
}

const features = [
  {
    icon: Coins,
    en: { title: "Spin & Earn", desc: "Win 7DOGS Coins every day" },
    ar: { title: "العب وكسب", desc: "كسب عملات كل يوم" },
  },
  {
    icon: Users,
    en: { title: "Invite Friends", desc: "Get free spins for each referral" },
    ar: { title: "ادعو أصحابك", desc: "اكسب لفات مجانية لكل صاحب" },
  },
  {
    icon: Gift,
    en: { title: "Redeem Gifts", desc: "Claim exclusive luxury rewards" },
    ar: { title: "استبدل هدايا", desc: "مكافآت حصرية فاخرة" },
  },
];

export function WelcomeScreen({ children }: WelcomeScreenProps) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  const lang = (localStorage.getItem("7dogs_lang") as "en" | "ar") ?? "en";
  const isRTL = lang === "ar";

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setShow(true);
  }, []);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "1");
      setShow(false);
    }, 420);
  };

  if (!show) return <>{children}</>;

  return (
    <>
      <AnimatePresence>
        {!exiting && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex justify-center bg-[#050505] overflow-hidden"
            dir={isRTL ? "rtl" : "ltr"}
          >
            {/* Background glows */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[300px] rounded-full bg-[#D4AF37]/10 blur-[90px]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] h-[200px] rounded-full bg-[#D4AF37]/06 blur-[70px]" />
              <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(212,175,55,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.6) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                }}
              />
            </div>

            {/* Scrollable column */}
            <div className="relative w-full max-w-[375px] h-full overflow-y-auto border-x border-[#D4AF37]/10">
              <div className="flex flex-col items-center px-5 py-8 min-h-full">

                {/* ── Logo ── */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex flex-col items-center mb-5"
                >
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-2xl scale-125" />
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 0 16px rgba(212,175,55,0.3)",
                          "0 0 36px rgba(212,175,55,0.6)",
                          "0 0 16px rgba(212,175,55,0.3)",
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                      className="relative w-24 h-24 rounded-full border-[3px] border-[#D4AF37] overflow-hidden"
                    >
                      <img src={botLogo} alt="7DOGS" className="w-full h-full object-cover" />
                    </motion.div>

                    {[
                      { style: { top: "-6px", right: "0px" }, delay: 0 },
                      { style: { top: "8px", left: "-10px" }, delay: 0.5 },
                      { style: { bottom: "0px", right: "-8px" }, delay: 1 },
                    ].map(({ style, delay }, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={style as React.CSSProperties}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.2, 0.7] }}
                        transition={{ repeat: Infinity, duration: 2.2, delay }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#FFE066]" />
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-[#D4AF37]/70 text-[10px] font-semibold tracking-[0.24em] uppercase mb-0.5">
                    {isRTL ? "مرحباً بك في" : "WELCOME TO"}
                  </p>

                  <motion.h1
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="text-[42px] font-black leading-none mb-2"
                    style={{
                      background:
                        "linear-gradient(180deg, #FFE066 0%, #D4AF37 55%, #997A00 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    7DOGS
                  </motion.h1>

                  <p className="text-[#888] text-[12.5px] text-center leading-relaxed max-w-[220px]">
                    {isRTL
                      ? "نظام المكافآت الفاخر — العب، كسب، وادعو أصحابك"
                      : "The luxury rewards system — spin, earn & invite friends"}
                  </p>
                </motion.div>

                {/* ── Features ── */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-full space-y-2 mb-6"
                >
                  {features.map(({ icon: Icon, en, ar }, i) => {
                    const f = isRTL ? ar : en;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.08 }}
                        className="flex items-center gap-3 bg-white/[0.04] border border-[#D4AF37]/12 rounded-xl px-4 py-3"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/22 flex items-center justify-center shrink-0">
                          <Icon className="w-[18px] h-[18px] text-[#D4AF37]" />
                        </div>
                        <div>
                          <p className="font-bold text-[13px] text-white">{f.title}</p>
                          <p className="text-[11px] text-[#777] mt-0.5">{f.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* ── Divider ── */}
                <div className="flex items-center gap-3 w-full mb-5">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/35" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50" />
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/35" />
                </div>

                {/* ── CTA button ── */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.58 }}
                  className="w-full"
                >
                  <motion.button
                    whileHover={{ scale: 1.025 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleEnter}
                    className="relative w-full h-[58px] rounded-2xl overflow-hidden font-black text-[17px] text-black flex items-center justify-center gap-2 group"
                    style={{
                      background:
                        "linear-gradient(135deg, #FFE066 0%, #D4AF37 50%, #A07800 100%)",
                      boxShadow:
                        "0 0 28px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.22)",
                    }}
                  >
                    {/* Shimmer sweep */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      animate={{ x: ["-150%", "250%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.5,
                        ease: "easeInOut",
                        repeatDelay: 1.2,
                      }}
                    />
                    <span className="relative z-10">
                      {isRTL ? "ادخل الـ Lounge" : "Enter the Lounge"}
                    </span>
                    <ChevronRight className="relative z-10 w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>

                  <p className="text-center text-[11px] text-[#444] mt-3">
                    {isRTL
                      ? "مجاني 100% • ابدأ بلفة مجانية"
                      : "100% Free • Start with a free spin"}
                  </p>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </>
  );
}
