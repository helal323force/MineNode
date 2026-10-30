import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ActivityLog, WorkerMetrics, CustomFeature } from '../types.js';
import { 
  ShieldCheck, 
  Users, 
  Bot, 
  Cpu, 
  Sliders, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  RotateCw, 
  Play, 
  Square, 
  Trash2, 
  ThumbsUp, 
  ThumbsDown,
  Layers,
  Settings
} from 'lucide-react';

export function AdminDashboard() {
  const { authFetch, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'bots' | 'limits' | 'features' | 'worker' | 'logs' | 'settings'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [allBots, setAllBots] = useState<any[]>([]);
  const [featuresList, setFeaturesList] = useState<CustomFeature[]>([]);
  const [workerMetrics, setWorkerMetrics] = useState<WorkerMetrics | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [defaultBotLimit, setDefaultBotLimit] = useState(3);
  const [defaultFeatureLimit, setDefaultFeatureLimit] = useState(5);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllAdminData = async () => {
    try {
      const [ovRes, uRes, bRes, fRes, mRes, lRes] = await Promise.all([
        authFetch('/api/admin/overview'),
        authFetch('/api/admin/users'),
        authFetch('/api/admin/bots'),
        authFetch('/api/admin/features'),
        authFetch('/api/system/metrics'),
        authFetch('/api/admin/logs'),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
      if (bRes.ok) setAllBots(await bRes.json());
      if (fRes.ok) setFeaturesList(await fRes.json());
      if (mRes.ok) setWorkerMetrics(await mRes.json());
      if (lRes.ok) setLogs(await lRes.json());
    } catch (e) {
      console.error('Admin fetch error', e);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllAdminData();
      const interval = setInterval(fetchAllAdminData, 6000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4">
          <Ban className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-xs text-neutral-400">
          Administrator privileges are verified securely on the backend server. Your current account does not have authorization to view this interface.
        </p>
      </div>
    );
  }

  const handleUpdateLimits = async (userId: string, bLimit: number, fLimit: number) => {
    const res = await authFetch(`/api/admin/users/${userId}/limits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botLimit: bLimit, featureLimit: fLimit }),
    });
    if (res.ok) {
      setMsg({ type: 'success', text: `Limits updated for user.` });
      fetchAllAdminData();
    }
  };

  const handleToggleUserSuspension = async (userId: string, currentStatus: boolean) => {
    const res = await authFetch(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSuspended: !currentStatus }),
    });
    if (res.ok) {
      setMsg({ type: 'success', text: `User account status modified.` });
      fetchAllAdminData();
    }
  };

  const handleModerateFeature = async (featureId: string, status: string, action?: string) => {
    const res = await authFetch(`/api/admin/features/${featureId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, action }),
    });
    if (res.ok) {
      setMsg({ type: 'success', text: `Feature updated.` });
      fetchAllAdminData();
    }
  };

  const handleAdminStopBot = async (profileId: string) => {
    const res = await authFetch(`/api/admin/bots/${profileId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    if (res.ok) {
      setMsg({ type: 'success', text: `Bot terminated by admin.` });
      fetchAllAdminData();
    }
  };

  const handleSaveGlobalLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultBotLimit: Number(defaultBotLimit),
        defaultFeatureLimit: Number(defaultFeatureLimit),
      }),
    });
    if (res.ok) {
      setMsg({ type: 'success', text: 'Global default limits saved.' });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'bots', label: 'Bot Management', icon: Bot },
    { id: 'limits', label: 'Limits', icon: Sliders },
    { id: 'features', label: 'Features Review', icon: ShieldCheck },
    { id: 'worker', label: 'Worker Telemetry', icon: Cpu },
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Admin Settings', icon: Settings },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Master Administration Console</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
            <span>Server-side authorization enforced</span>
            <span aria-hidden="true">·</span>
            <span>Admin Email: wingxmc26@gmail.com</span>
          </div>
        </div>

        <button
          onClick={fetchAllAdminData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
          msg.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {/* Admin Tab Strip */}
      <div className="flex items-center gap-1 p-1 bg-[#121417] border border-neutral-800 rounded-xl overflow-x-auto scrollbar-none">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="text-xs text-neutral-400 mb-1">Total Users</div>
              <div className="text-2xl font-bold text-white font-mono">{overview?.totalUsers ?? '—'}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Platform accounts</div>
            </div>
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="text-xs text-neutral-400 mb-1">Active Bots</div>
              <div className="text-2xl font-bold text-white font-mono">{overview?.activeBots ?? '—'}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Total initiated</div>
            </div>
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="text-xs text-neutral-400 mb-1">Running In-Game</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{overview?.runningBots ?? '—'}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Online Mineflayer threads</div>
            </div>
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="text-xs text-neutral-400 mb-1">Worker Health</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono capitalize">{overview?.workerHealth ?? 'Healthy'}</div>
              <div className="text-[11px] text-neutral-500 mt-1">Daemon process running</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">System Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-500">Node Runtime</span>
                  <span className="font-mono text-neutral-200">{workerMetrics?.nodeVersion}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-neutral-500">Platform Host</span>
                  <span className="font-mono text-neutral-200">{workerMetrics?.platform}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Process Uptime</span>
                  <span className="font-mono text-neutral-200">{workerMetrics ? `${Math.floor(workerMetrics.workerUptime / 60)} minutes` : '—'}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Pending Moderation Queue</h3>
              <div className="text-xs text-neutral-400">
                {featuresList.filter(f => f.status === 'pending').length} community feature packages await admin approval.
              </div>
              <button
                onClick={() => setActiveTab('features')}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-lg"
              >
                Inspect Submissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Management */}
      {activeTab === 'users' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-white">Registered Users & Limits</h3>
            <span className="text-xs text-neutral-500">{usersList.length} total users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500">
                  <th className="pb-2">User / Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Bot Limit</th>
                  <th className="pb-2">Feature Limit</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {usersList.map(u => (
                  <tr key={u.uid} className="hover:bg-neutral-800/30">
                    <td className="py-3">
                      <div className="font-semibold text-white">{u.displayName || u.email}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 capitalize text-neutral-300">{u.role}</td>
                    <td className="py-3 font-mono text-neutral-200">{u.botLimit} max</td>
                    <td className="py-3 font-mono text-neutral-200">{u.featureLimit} max</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        u.isSuspended ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      }`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          const n = prompt(`Set maximum active bot limit for ${u.email}:`, String(u.botLimit));
                          if (n && !isNaN(Number(n))) {
                            handleUpdateLimits(u.uid, Number(n), u.featureLimit);
                          }
                        }}
                        className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded hover:text-white"
                      >
                        Edit Limit
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserSuspension(u.uid, u.isSuspended)}
                          className={`px-2 py-1 rounded border ${
                            u.isSuspended
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}
                        >
                          {u.isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Bot Management */}
      {activeTab === 'bots' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-white">Active Bots Across Entire Platform</h3>
            <span className="text-xs text-neutral-500">{allBots.length} active sessions</span>
          </div>

          {allBots.length === 0 ? (
            <div className="text-neutral-500 text-xs py-10 text-center">No active bot instances currently online.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500">
                    <th className="pb-2">Username</th>
                    <th className="pb-2">Server Host</th>
                    <th className="pb-2">User ID</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Uptime</th>
                    <th className="pb-2 text-right">Emergency Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {allBots.map(b => (
                    <tr key={b.profileId} className="hover:bg-neutral-800/30">
                      <td className="py-3 font-mono font-bold text-white">{b.username}</td>
                      <td className="py-3 font-mono text-neutral-300">{b.host}:{b.port}</td>
                      <td className="py-3 text-[11px] text-neutral-500 font-mono">{b.userId.slice(0, 10)}...</td>
                      <td className="py-3 capitalize text-emerald-400">{b.status}</td>
                      <td className="py-3 font-mono tabular-nums text-neutral-300">{b.uptime}s</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleAdminStopBot(b.profileId)}
                          className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20"
                        >
                          Force Stop
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Limits Management */}
      {activeTab === 'limits' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-6 max-w-lg space-y-4">
          <h3 className="text-sm font-semibold text-white">Default Platform Limits</h3>
          <p className="text-xs text-neutral-400">
            Configure default quotas automatically assigned to new registered users.
          </p>

          <form onSubmit={handleSaveGlobalLimits} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs text-neutral-300 mb-1">Default Active Bots Limit</label>
              <input
                type="number"
                min={1}
                max={50}
                value={defaultBotLimit}
                onChange={(e) => setDefaultBotLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 mb-1">Default Feature Upload Limit</label>
              <input
                type="number"
                min={1}
                max={50}
                value={defaultFeatureLimit}
                onChange={(e) => setDefaultFeatureLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-lg"
            >
              Update Global Defaults
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Features Moderation */}
      {activeTab === 'features' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-white">Public Feature Submissions & Safety</h3>
            <span className="text-xs text-neutral-500">{featuresList.length} total packages</span>
          </div>

          <div className="space-y-3">
            {featuresList.map(f => (
              <div key={f.id} className="p-4 bg-[#16181b] border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{f.name}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">v{f.version}</span>
                    <span className="text-[10px] text-neutral-400">by {f.authorEmail}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{f.description}</p>
                  <div className="text-[11px] text-neutral-500 mt-1 font-mono">
                    Permissions: [{f.permissions.join(', ')}]
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-neutral-400 px-2 py-0.5 border border-neutral-800 rounded">
                    {f.status}
                  </span>
                  {f.status !== 'approved' && (
                    <button
                      onClick={() => handleModerateFeature(f.id, 'approved')}
                      title="Approve for Public Directory"
                      className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {f.status !== 'suspended' && (
                    <button
                      onClick={() => handleModerateFeature(f.id, 'suspended')}
                      title="Suspend Unsafe Feature"
                      className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleModerateFeature(f.id, '', 'delete')}
                    title="Delete package"
                    className="p-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Worker Telemetry */}
      {activeTab === 'worker' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5">
            <div className="text-xs text-neutral-400 mb-1">Simulated CPU Load</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{workerMetrics?.cpuUsagePercent ?? 0}%</div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: `${workerMetrics?.cpuUsagePercent ?? 0}%` }} />
            </div>
          </div>

          <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5">
            <div className="text-xs text-neutral-400 mb-1">RAM Consumption</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {workerMetrics?.ramUsageMb ?? 0} <span className="text-xs text-neutral-500 font-sans">/ {workerMetrics?.totalRamMb ?? 0} MB</span>
            </div>
            <div className="text-[11px] text-neutral-500 mt-3">Host virtual memory buffer</div>
          </div>

          <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5">
            <div className="text-xs text-neutral-400 mb-1">Node Environment</div>
            <div className="text-sm font-bold font-mono text-white">{workerMetrics?.nodeVersion}</div>
            <div className="text-[11px] text-neutral-500 mt-2 truncate">{workerMetrics?.platform}</div>
          </div>
        </div>
      )}

      {/* Tab 7: Audit Activity Logs */}
      {activeTab === 'logs' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Platform Audit Trail</h3>
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {logs.map(l => (
              <div key={l.id} className="p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-lg text-xs flex items-start gap-3">
                <span className="text-neutral-500 font-mono text-[11px] shrink-0">
                  {new Date(l.timestamp).toLocaleTimeString()}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-neutral-900 border border-neutral-800 text-neutral-400 shrink-0">
                  {l.category}
                </span>
                <div>
                  <div className="font-semibold text-neutral-200">{l.action} <span className="font-normal text-neutral-400">({l.userEmail})</span></div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">{l.details}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: Admin Settings */}
      {activeTab === 'settings' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-6 max-w-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Security & Environment Policies</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            All administrative endpoints require signed Firebase JWT tokens matching authorized email addresses. Role privileges are evaluated synchronously in Express middleware before granting access.
          </p>
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-emerald-400">
            ADMIN_ACCOUNT = "wingxmc26@gmail.com"<br />
            RUNTIME_MODE = "Render / VPS Scalable"
          </div>
        </div>
      )}
    </div>
  );
}
