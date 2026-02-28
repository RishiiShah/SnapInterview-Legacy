"use client";

import { useState } from "react";

export default function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [practiceReminders, setPracticeReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [scoreAlerts, setScoreAlerts] = useState(false);

  const prefs = [
    {
      label: "Email notifications",
      desc: "Receive updates about your account via email",
      value: emailNotifs,
      set: setEmailNotifs,
      icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>,
    },
    {
      label: "Practice reminders",
      desc: "Get daily reminders to keep practicing",
      value: practiceReminders,
      set: setPracticeReminders,
      icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "Weekly report",
      desc: "Receive a weekly summary of your progress",
      value: weeklyReport,
      set: setWeeklyReport,
      icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    },
    {
      label: "Score alerts",
      desc: "Get notified when you hit a new personal best",
      value: scoreAlerts,
      set: setScoreAlerts,
      icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228M18.75 4.236V2.721" /></svg>,
    },
  ];

  return (
    <div>
      <div className="border-b border-zinc-100 px-8 py-6">
        <h2 className="text-lg font-semibold text-zinc-900">Notification Preferences</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose what notifications you want to receive.</p>
      </div>

      <div className="px-8 py-6">
        <div className="space-y-2">
          {prefs.map((pref) => (
            <div key={pref.label} className="flex items-center justify-between rounded-xl border border-zinc-100 px-5 py-4 transition-all hover:border-zinc-200 hover:shadow-sm">
              <div className="flex items-center gap-4">
                <span className={`shrink-0 ${pref.value ? "text-zinc-700" : "text-zinc-300"} transition-colors`}>{pref.icon}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{pref.label}</p>
                  <p className="text-xs text-zinc-400">{pref.desc}</p>
                </div>
              </div>
              <button
                onClick={() => pref.set(!pref.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${pref.value ? "bg-zinc-900" : "bg-zinc-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${pref.value ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
