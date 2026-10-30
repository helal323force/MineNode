import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CustomFeature } from '../types.js';
import { 
  Upload, 
  Puzzle, 
  Trash2, 
  Globe, 
  Lock, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ExternalLink,
  Code
} from 'lucide-react';
import JSZip from 'jszip';

interface FeaturesPageProps {
  setCurrentTab: (tab: string) => void;
}

export function FeaturesPage({ setCurrentTab }: FeaturesPageProps) {
  const { authFetch, account, currentUser } = useAuth();
  const [features, setFeatures] = useState<CustomFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFeatureCode, setSelectedFeatureCode] = useState<CustomFeature | null>(null);

  const fetchFeatures = async () => {
    try {
      const res = await authFetch('/api/features');
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setStatusMessage({ type: 'error', text: 'Only .zip feature packages are accepted.' });
      return;
    }

    setUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('package', file);

    try {
      const res = await authFetch('/api/features/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Upload validation failed.' });
      } else {
        setStatusMessage({ type: 'success', text: `Feature "${data.feature.name}" uploaded and validated successfully!` });
        await fetchFeatures();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network upload error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete feature "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/features/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Feature "${name}" deleted.` });
        await fetchFeatures();
      }
    } catch (e) {}
  };

  const handleSubmitPublic = async (id: string, name: string) => {
    try {
      const res = await authFetch(`/api/features/${id}/submit-public`, { method: 'POST' });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Feature "${name}" submitted for admin review.` });
        await fetchFeatures();
      }
    } catch (e) {}
  };

  // Helper to generate a sample downloadable feature ZIP
  const downloadSamplePackage = async () => {
    const zip = new JSZip();
    const manifest = {
      name: "Player Notifier",
      description: "Announces the current game time every minute to server players.",
      version: "1.0.0",
      entryPoint: "index.js",
      botApiVersion: "1.0",
      permissions: ["chat", "events"],
      configSchema: {
        prefix: { type: "string", label: "Chat Prefix", default: "[ClockBot]" }
      }
    };
    const code = `
// Sandboxed Feature Entry Point
api.log("Clock Notifier initialized.");

api.events.on('time', function() {
  // Safe sandboxed execution
});
`;
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("index.js", code);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_feature_package.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const userFeaturesCount = features.filter(f => f.userId === currentUser?.uid).length;
  const maxFeatures = account?.featureLimit || 5;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Custom Features Ecosystem</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
            <span>Modular Mineflayer Capabilities</span>
            <span aria-hidden="true">·</span>
            <span>Sandboxed Node.js VM Execution</span>
            <span aria-hidden="true">·</span>
            <span>{userFeaturesCount} of {maxFeatures} Uploads Used</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadSamplePackage}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample ZIP</span>
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Validating...' : 'Upload Feature ZIP'}</span>
            <input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              disabled={uploading || userFeaturesCount >= maxFeatures}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
          statusMessage.type === 'error'
            ? 'bg-red-500/10 border border-red-500/20 text-red-300'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Manifest Specification Card */}
      <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 text-xs text-neutral-300 space-y-2">
        <div className="font-semibold text-white flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-emerald-400" />
          <span>Feature Package Requirements</span>
        </div>
        <p className="text-neutral-400 leading-relaxed">
          Every custom feature must be an unencrypted ZIP containing a <code className="text-emerald-300 bg-neutral-900 px-1 py-0.5 rounded">manifest.json</code> and an entry point JavaScript file.
          Permissions are verified upon upload: <span className="text-neutral-200">chat, movement, events, status</span>. Features run in isolated VM sandboxes without access to raw sockets, credentials, or file systems.
        </p>
      </div>

      {/* Features Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">Installed & Available Packages</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat) => {
            const isOwner = feat.userId === currentUser?.uid;
            return (
              <div key={feat.id} className="bg-[#121417] border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">{feat.name}</h3>
                      <div className="text-[11px] text-neutral-500 font-mono">v{feat.version} · API {feat.botApiVersion}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-medium border rounded uppercase ${
                      feat.status === 'approved' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                      feat.status === 'pending' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                      feat.status === 'suspended' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                      'text-neutral-400 border-neutral-800 bg-neutral-900'
                    }`}>
                      {feat.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 mb-4 line-clamp-3 leading-relaxed">
                    {feat.description || 'No description provided.'}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] text-neutral-500">Declared Permissions:</div>
                    <div className="flex flex-wrap gap-1">
                      {feat.permissions.map((p) => (
                        <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a1e] border border-neutral-800 text-neutral-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFeatureCode(feat)}
                      className="px-2.5 py-1 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3 h-3" />
                      <span>View Code</span>
                    </button>
                    {isOwner && !feat.isPublic && (
                      <button
                        onClick={() => handleSubmitPublic(feat.id, feat.name)}
                        title="Submit to Public Directory"
                        className="p-1.5 text-neutral-400 hover:text-emerald-400 bg-neutral-900 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleDelete(feat.id, feat.name)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 bg-neutral-900 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete package"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Inspector Modal */}
      {selectedFeatureCode && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-white">{selectedFeatureCode.name} - Code Preview</h3>
                <div className="text-xs text-neutral-500 font-mono">Entry: {selectedFeatureCode.entryPoint}</div>
              </div>
              <button onClick={() => setSelectedFeatureCode(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <pre className="p-4 bg-[#0c0d0e] border border-neutral-800 rounded-xl text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-96 scrollbar-thin">
              {selectedFeatureCode.code}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedFeatureCode(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
