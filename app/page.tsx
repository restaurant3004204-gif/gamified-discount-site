"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://apbeajqbucmdszswnzza.supabase.co";
const supabaseAnonKey = "sb_publishable_Zie3AkqNP1da3FWn6AH00Q_75r3hBCH";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LeaderboardEntry {
  id: string;
  score: number;
  leads: { email: string } | null;
}

export default function Home() {
  const [view, setView] = useState<"hub" | "tap-game" | "reaction-game" | "newrecord">("hub");
  const [score, setScore] = useState(0);
  const [email, setEmail] = useState("");
  const [coupon, setCoupon] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Reaction game states
  const [reactionState, setReactionState] = useState<"waiting" | "ready" | "clicked">("waiting");
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("high_scores")
      .select(`id, score, leads ( email )`)
      .order("score", { ascending: false })
      .limit(5);

    if (data) {
      setLeaderboard(data as unknown as LeaderboardEntry[]);
    }
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    if (finalScore >= 400) {
      setView("newrecord");
    } else {
      setView("hub");
      alert(`Game Over! Your score: ${finalScore}. Score 400+ to unlock rewards.`);
    }
  };

  // --- TAP TARGET GAME LOGIC ---
  const [tapCount, setTapCount] = useState(0);
  const startTapGame = () => {
    setTapCount(0);
    setView("tap-game");
    let currentScore = 0;
    const interval = setInterval(() => {
      // Game timer simulation or count
    }, 1000);
  };

  // --- REACTION SPEED GAME LOGIC ---
  const startReactionGame = () => {
    setReactionState("waiting");
    setView("reaction-game");
    const timeout = setTimeout(() => {
      setReactionState("ready");
      setStartTime(Date.now());
    }, Math.random() * 2000 + 1500);
  };

  const handleReactionClick = () => {
    if (reactionState === "waiting") {
      alert("Too early! Clicked before green.");
      setView("hub");
    } else if (reactionState === "ready") {
      const reactionTime = Date.now() - startTime;
      // Convert faster reaction time into higher points (max 1000)
      const calculatedScore = Math.max(100, 1000 - reactionTime);
      handleGameOver(calculatedScore);
    }
  };

  // --- SUBMISSION LOGIC WITH UPSERT ---
 const claimAndSaveScore = async () => {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      // 1. Upsert lead to get the lead_id safely
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .upsert({ email: email, marketing_consent: true }, { onConflict: "email" })
        .select("id")
        .single();

      if (leadError || !leadData) {
        console.error("Lead upsert error:", leadError);
        alert("Could not save your lead info. Please try again.");
        return;
      }

      const leadId = leadData.id;

      // 2. Fetch active competition (allow null if table is empty)
      const { data: compData } = await supabase
        .from("weekly_competitions")
        .select("id")
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      // 3. Insert High Score directly
      const { error: scoreError } = await supabase.from("high_scores").insert([
        {
          competition_id: compData?.id || null,
          game_id: view === "reaction-game" ? "reaction-speed" : "tap-target",
          lead_id: leadId,
          score: score,
          verification_status: "VERIFIED"
        }
      ]);

      if (scoreError) {
        console.error("High score insert error:", scoreError);
        alert(`Score save error: ${scoreError.message}`);
        return;
      }

      // 4. Assign an available coupon
      const { data: availableCoupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("status", "UNCLAIMED")
        .limit(1)
        .maybeSingle();

      if (availableCoupon) {
        await supabase
          .from("coupons")
          .update({ status: "CLAIMED", lead_id: leadId })
          .eq("id", availableCoupon.id);
        setCoupon(availableCoupon.code);
      } else {
        setCoupon("ARCADE-20-OFF");
      }

      // Refresh leaderboard list immediately
      fetchLeaderboard();
    } catch (err: any) {
      console.error("Unexpected error during claim:", err);
      setCoupon("ARCADE-20-OFF");
    }
  };

      fetchLeaderboard();
    } catch (err: any) {
      console.error("Submission error details:", err);
      alert("Error saving score. Check console for details.");
      setCoupon("ARCADE-20-OFF");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white p-4 select-none">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center">
        
        {view === "hub" && (
          <div className="w-full space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                ARCADE DISCOUNT HUB
              </h1>
              <p className="text-gray-400 text-xs">Choose a game, beat the target score, and win coupons!</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={startTapGame}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-between px-6">
                <span>⚡ Tap Blitz</span>
                <span className="text-xs bg-blue-900/60 px-2 py-1 rounded text-blue-300">Action</span>
              </button>

              <button 
                onClick={startReactionGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-between px-6">
                <span>🎯 Reflex Test</span>
                <span className="text-xs bg-purple-900/60 px-2 py-1 rounded text-purple-300">Skill</span>
              </button>
            </div>

            <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-4 text-left">
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">🔥 Weekly Leaderboard</h3>
              {leaderboard.length === 0 ? (
                <p className="text-xs text-gray-500">No scores recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {leaderboard.map((item, index) => {
                    const maskedEmail = item.leads?.email 
                      ? item.leads.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") 
                      : "Anonymous";
                    return (
                      <li key={item.id} className="flex justify-between items-center bg-gray-900 px-3 py-2 rounded-lg">
                        <span className="text-gray-300">#{index + 1} {maskedEmail}</span>
                        <span className="font-mono font-bold text-yellow-400">{item.score} pts</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {view === "tap-game" && (
          <div className="flex flex-col items-center w-full space-y-6 py-4">
            <div className="text-3xl font-mono text-yellow-400 font-bold">Taps: {tapCount}</div>
            <button 
              onClick={() => {
                const nextTaps = tapCount + 1;
                setTapCount(nextTaps);
                if (nextTaps >= 15) handleGameOver(600); // Trigger win at 15 taps
              }} 
              className="w-40 h-40 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full font-black text-xl text-gray-950 shadow-[0_0_30px_rgba(34,197,94,0.4)] active:scale-90 transition-transform flex items-center justify-center cursor-pointer">
              TAP FAST!
            </button>
            <p className="text-xs text-gray-400">Reach 15 taps quickly to win!</p>
            <button onClick={() => setView("hub")} className="text-gray-500 text-xs underline pt-2">Quit to Menu</button>
          </div>
        )}

        {view === "reaction-game" && (
          <div className="flex flex-col items-center w-full space-y-6 py-4">
            <div 
              onClick={handleReactionClick}
              className={`w-full h-56 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors shadow-xl ${
                reactionState === "waiting" 
                  ? "bg-red-600 hover:bg-red-500" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-gray-950 animate-pulse"
              }`}>
              <span className="text-xl font-black uppercase tracking-wider">
                {reactionState === "waiting" ? "Wait for Green..." : "CLICK NOW!"}
              </span>
            </div>
            <button onClick={() => setView("hub")} className="text-gray-500 text-xs underline pt-2">Quit to Menu</button>
          </div>
        )}

        {view === "newrecord" && (
          <div className="space-y-4 w-full text-left">
            <div className="bg-yellow-500/15 border border-yellow-500/30 p-4 rounded-xl text-center">
              <h2 className="text-2xl font-black text-yellow-400">🏆 HIGH SCORE UNLOCKED!</h2>
              <p className="text-sm text-gray-300 mt-1">Fantastic performance! Score: {score}</p>
            </div>
            
            {!coupon ? (
              <div className="space-y-3 pt-2">
                <label className="text-xs text-gray-400 block font-medium">Enter your email to submit score & claim coupon:</label>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  className="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button 
                  onClick={claimAndSaveScore} 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-3.5 rounded-xl transition-transform active:scale-95 shadow-lg">
                  Submit Score & Claim Reward
                </button>
              </div>
            ) : (
              <div className="bg-emerald-950/60 border border-emerald-500/50 p-5 rounded-xl text-center space-y-2">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Your Official Coupon</p>
                <p className="text-3xl font-mono font-black text-white tracking-widest">{coupon}</p>
                <p className="text-xs text-emerald-300/80 pt-1">Score saved to the weekly leaderboard!</p>
                <button 
                  onClick={() => { setCoupon(""); setView("hub"); fetchLeaderboard(); }} 
                  className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg text-sm">
                  Back to Arcade Hub
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}