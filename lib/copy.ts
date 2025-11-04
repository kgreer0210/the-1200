/**
 * Centralized copy for The 1200 app
 * Tone: encouraging, credible, concise
 * Language: non-absolute (uses "typically," "often," "supports" not "proves," "guarantees")
 */

export const copy = {
  // Hero/Headlines
  hero: {
    h1: "Practice 20 minutes a day. Build real momentum.",
    subhead:
      "The 1200 guides you through a focused 20-hour challenge—designed to kick-start skills and support the consistency that habits need.",
  },

  // How it works (3 bullets)
  howItWorks: {
    title: "How it works",
    bullets: [
      "Pick a skill. Set a 20-minute daily target.",
      "Track sessions toward a 1,200-minute (20-hour) milestone.",
      "Use your streaks and insights to keep repetition effortless.",
    ],
  },

  // Why 20 hours callout
  why20Hours: {
    title: "Why 20 hours?",
    text: "Twenty hours is a proven quick-start for learning new skills. It won't guarantee an automatic habit for everyone—but it creates meaningful progress and makes consistency easier.",
  },

  // Dashboard/Home
  dashboard: {
    title: (name: string) => {
      const trimmed = name.trim();
      return trimmed ? `${trimmed}'s Habits` : "Your Habits";
    },
    subtitle:
      "Track your progress toward 1,200 minutes (20 hours) of intentional practice",
    emptyState: {
      title: "Welcome to The 1200",
      description1:
        "The journey from intention to habit starts with consistency. Twenty hours of focused practice is a proven quick-start for learning new skills and building momentum.",
      description2:
        "By committing to just 20 minutes a day for 60 days, you'll accumulate 1,200 minutes—the foundation for lasting change. This app helps you track that progress with intent, showing you exactly how far you've come and how much closer you are to strengthening your practice routine.",
      ctaTitle: "Ready to start?",
      ctaDescription:
        "Create your first habit to begin tracking your journey toward 1,200 minutes.",
      ctaButton: "Create Your First Habit",
    },
  },

  // Login
  login: {
    tagline: "20 minutes a day × 60 days = 1,200 minutes = Your new habit",
    description:
      "Research shows 20 hours of focused practice kick-starts skills and supports consistency. The 1200 helps you track your journey from intention to momentum with daily progress toward your 20-hour goal.",
  },

  // Onboarding
  onboarding: {
    title: "Welcome to The 1200!",
    description:
      "You're about to start tracking your journey from intention to momentum. Just 20 minutes a day for 60 days—that's 1,200 minutes total—is a proven quick-start for learning new skills and building consistency.",
    profilePrompt: "Let's start by completing your profile. Tell us your name.",
  },

  // New Habit
  newHabit: {
    title: "Create New Habit",
    description:
      "Start your journey from intention to momentum. Commit to 20 minutes a day, and track your progress toward 1,200 minutes (20 hours) of intentional practice—designed to kick-start skills and support consistency.",
    habitTitleLabel: "Habit Title",
    habitTitlePlaceholder: "e.g., Learn Spanish, Practice Piano",
    habitTitleDescription: "A short name for this skill (max 80 characters)",
    targetMinutesLabel: "Target Minutes",
    targetMinutesDescription:
      "Total minutes to reach (default: 1,200 = 20 hours). This represents a proven quick-start amount of focused practice that kick-starts skills and supports consistency.",
    createButton: "Create Habit",
    creating: "Creating...",
  },

  // Habit Detail
  habitDetail: {
    backLink: "← Back to dashboard",
    qualifiedToday: (minutes: number) => `✓ Qualified today (${minutes}m)`,
    cycleCompleted: "🎉 Cycle completed!",
    progressDescription:
      "Track your daily 20-minute sessions to build consistency. Every session brings you closer to strengthening your practice routine.",
  },

  // Toast/Microcopy
  toast: {
    dailyWin: "Daily win locked. Keep going to strengthen the habit loop.",
    streakWarning: "You're one session from keeping your streak alive.",
  },

  // Timer Notification
  timer: {
    dailyGoalAchieved: "Daily Goal Achieved!",
    dailyGoalMessage:
      "Daily win locked. Keep going to strengthen the habit loop.",
    awesomeButton: "Awesome!",
    stayCourse: {
      title: "Stay the Course!",
      message:
        "You're making great progress! Reaching 20 minutes helps build consistency and strengthens your habit loop. You've got this—just a bit more to go.",
      continueButton: "Continue Session",
      savePartialButton: "Save as Partial",
      partialNote:
        "This session won't count toward your daily streak, but your minutes will still be recorded.",
    },
    cycleComplete: {
      title: "Cycle Complete! 🎉",
      message:
        "Congratulations! You've reached 1,200 minutes of intentional practice. This is a significant milestone in your journey from intention to momentum.",
      restartButton: "Restart Cycle",
      extendButton: "Extend Challenge",
      restartDescription: (cycleNumber: number) =>
        `Start Cycle ${cycleNumber} fresh with your progress reset, keeping all your history.`,
      extendDescription: (cycleNumber: number) =>
        `Start Cycle ${cycleNumber} while preserving your progress from Cycle ${
          cycleNumber - 1
        }.`,
    },
  },

  // FAQ
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        question: "Does 20 hours make a habit automatic?",
        answer:
          "Not always. Habit studies show weeks to months, with big individual differences. The 1200 uses a 20-hour challenge to build consistent reps.",
      },
      {
        question: "Is this only for beginners?",
        answer:
          "No. Beginners get quick wins; experienced users use The 1200 to reboot consistency.",
      },
    ],
  },

  // Footer/Legal
  footer: {
    legal: "The 1200 is a practice tool, not medical or clinical advice.",
  },

  // Common replacements
  replacements: {
    "builds a habit": "kick-starts skills and consistency",
    "forms a habit": "kick-starts skills and consistency",
    "makes a habit": "supports habit formation",
    "guarantees a habit": "supports habit formation",
    "creates a habit": "supports habit formation",
  },
} as const;
