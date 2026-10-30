import vm from 'vm';
import JSZip from 'jszip';
import { FeatureManifest, CustomFeature } from '../src/types.js';

export interface SandboxedFeatureInstance {
  featureId: string;
  name: string;
  version: string;
  active: boolean;
  context: vm.Context | null;
  timers: NodeJS.Timeout[];
  eventCleanups: Array<() => void>;
  logs: Array<{ type: 'log' | 'warn' | 'error'; message: string; timestamp: string }>;
  error?: string;
}

export function validateFeaturePackage(manifestJson: string, code: string): { valid: boolean; manifest?: FeatureManifest; error?: string } {
  try {
    const manifest: FeatureManifest = JSON.parse(manifestJson);
    if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
      return { valid: false, error: 'Manifest missing valid "name" field.' };
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      return { valid: false, error: 'Manifest missing valid "version" field.' };
    }
    if (!manifest.entryPoint || typeof manifest.entryPoint !== 'string') {
      return { valid: false, error: 'Manifest missing valid "entryPoint" field.' };
    }
    if (!Array.isArray(manifest.permissions)) {
      return { valid: false, error: 'Manifest "permissions" must be an array.' };
    }
    const allowedPermissions = ['chat', 'movement', 'events', 'status'];
    for (const perm of manifest.permissions) {
      if (!allowedPermissions.includes(perm)) {
        return { valid: false, error: `Invalid permission "${perm}". Allowed: ${allowedPermissions.join(', ')}` };
      }
    }
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { valid: false, error: 'Entry point file contains no executable code.' };
    }

    // Static code security checks
    const forbiddenPatterns = [
      /\bprocess\b/,
      /\brequire\s*\(/,
      /\bimport\s*\(/,
      /\bchild_process\b/,
      /\bfs\b/,
      /\bnet\b/,
      /\bhttp\b/,
      /\bhttps\b/,
      /\b__dirname\b/,
      /\b__filename\b/,
      /\bglobal\b/,
      /\bFunction\s*\(/,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { valid: false, error: `Feature code contains forbidden identifier: ${pattern.toString()}` };
      }
    }

    return { valid: true, manifest };
  } catch (err: any) {
    return { valid: false, error: `Manifest parse failure: ${err.message}` };
  }
}

export async function parseZipFeature(buffer: Buffer): Promise<{ valid: boolean; manifest?: FeatureManifest; code?: string; error?: string }> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      return { valid: false, error: 'ZIP must contain a manifest.json file at the root.' };
    }

    const manifestContent = await manifestFile.async('string');
    const tempManifest: any = JSON.parse(manifestContent);
    const entryPath = tempManifest.entryPoint || 'index.js';

    const codeFile = zip.file(entryPath);
    if (!codeFile) {
      return { valid: false, error: `Entry point "${entryPath}" not found in ZIP archive.` };
    }

    const code = await codeFile.async('string');
    const validation = validateFeaturePackage(manifestContent, code);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    return { valid: true, manifest: validation.manifest, code };
  } catch (err: any) {
    return { valid: false, error: `Failed to unpack ZIP archive: ${err.message}` };
  }
}

export class FeatureRuntime {
  private instances: Map<string, SandboxedFeatureInstance> = new Map();

  constructor(private bot: any, private onLogCallback: (log: { featureId: string; type: string; message: string }) => void) {}

  public loadFeature(feature: CustomFeature, userConfig: Record<string, any> = {}): boolean {
    const featureId = feature.id;
    this.unloadFeature(featureId);

    const logs: SandboxedFeatureInstance['logs'] = [];
    const timers: NodeJS.Timeout[] = [];
    const eventCleanups: Array<() => void> = [];

    const instance: SandboxedFeatureInstance = {
      featureId,
      name: feature.name,
      version: feature.version,
      active: true,
      context: null,
      timers,
      eventCleanups,
      logs,
    };

    const addLog = (type: 'log' | 'warn' | 'error', message: string) => {
      const entry = { type, message: String(message).slice(0, 500), timestamp: new Date().toISOString() };
      logs.push(entry);
      if (logs.length > 100) logs.shift();
      this.onLogCallback({ featureId, type, message });
    };

    // Construct controlled API based on feature permissions
    const permissions = feature.permissions || [];
    const controlledApi: Record<string, any> = {
      config: { ...userConfig },
      log: (msg: any) => addLog('log', String(msg)),
      warn: (msg: any) => addLog('warn', String(msg)),
      error: (msg: any) => addLog('error', String(msg)),
    };

    if (permissions.includes('chat')) {
      controlledApi.chat = {
        send: (msg: string) => {
          if (!this.bot || typeof this.bot.chat !== 'function') return;
          const sanitized = String(msg).slice(0, 256);
          this.bot.chat(sanitized);
        },
        onMessage: (cb: (sender: string, message: string) => void) => {
          if (!this.bot || typeof cb !== 'function') return;
          const handler = (username: string, message: string) => {
            if (username === this.bot.username) return;
            try {
              cb(username, message);
            } catch (e: any) {
              addLog('error', `Chat callback exception: ${e.message}`);
            }
          };
          this.bot.on('chat', handler);
          eventCleanups.push(() => this.bot.removeListener('chat', handler));
        }
      };
    }

    if (permissions.includes('movement')) {
      controlledApi.movement = {
        setControl: (control: string, state: boolean) => {
          if (!this.bot || typeof this.bot.setControlState !== 'function') return;
          const allowedControls = ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'];
          if (allowedControls.includes(control)) {
            this.bot.setControlState(control as any, !!state);
          }
        },
        look: (yaw: number, pitch: number) => {
          if (!this.bot || typeof this.bot.look !== 'function') return;
          try {
            this.bot.look(Number(yaw) || 0, Number(pitch) || 0, true);
          } catch (e) {}
        },
        stop: () => {
          if (!this.bot || typeof this.bot.clearControlStates !== 'function') return;
          this.bot.clearControlStates();
        }
      };
    }

    if (permissions.includes('status')) {
      controlledApi.status = {
        get: () => {
          if (!this.bot) return null;
          return {
            health: this.bot.health || 20,
            food: this.bot.food || 20,
            dimension: this.bot.game?.dimension || 'unknown',
            position: this.bot.entity?.position ? {
              x: Math.round(this.bot.entity.position.x),
              y: Math.round(this.bot.entity.position.y),
              z: Math.round(this.bot.entity.position.z),
            } : null,
          };
        }
      };
    }

    if (permissions.includes('events')) {
      controlledApi.events = {
        on: (event: string, cb: (...args: any[]) => void) => {
          if (!this.bot || typeof cb !== 'function') return;
          const safeEvents = ['spawn', 'death', 'rain', 'time', 'kicked', 'playerJoined', 'playerLeft'];
          if (!safeEvents.includes(event)) {
            addLog('warn', `Subscription to event "${event}" denied by security policy.`);
            return;
          }
          const handler = (...args: any[]) => {
            try {
              cb(...args);
            } catch (err: any) {
              addLog('error', `Event callback error (${event}): ${err.message}`);
            }
          };
          this.bot.on(event, handler);
          eventCleanups.push(() => this.bot.removeListener(event, handler));
        }
      };
    }

    // Safe timers
    const safeSetTimeout = (fn: Function, delay: number) => {
      const ms = Math.max(10, Math.min(60000, Number(delay) || 100));
      const t = setTimeout(() => {
        try {
          fn();
        } catch (e: any) {
          addLog('error', `Timer execution error: ${e.message}`);
        }
      }, ms);
      timers.push(t);
      return t;
    };

    const safeClearTimeout = (t: any) => {
      clearTimeout(t);
    };

    const sandbox = Object.freeze({
      api: controlledApi,
      console: {
        log: (msg: any) => addLog('log', String(msg)),
        warn: (msg: any) => addLog('warn', String(msg)),
        error: (msg: any) => addLog('error', String(msg)),
      },
      setTimeout: safeSetTimeout,
      clearTimeout: safeClearTimeout,
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean,
      Array,
      Object,
    });

    const context = vm.createContext(sandbox);
    instance.context = context;

    try {
      const script = new vm.Script(`
        (function() {
          "use strict";
          try {
            ${feature.code}
          } catch(err) {
            api.error("Initialization failure: " + (err && err.message ? err.message : String(err)));
          }
        })();
      `);

      script.runInContext(context, { timeout: 2000 });
      addLog('log', `Feature "${feature.name}" v${feature.version} successfully loaded and activated.`);
      this.instances.set(featureId, instance);
      return true;
    } catch (err: any) {
      addLog('error', `Fatal compile/execution error: ${err.message}`);
      instance.error = err.message;
      this.unloadFeature(featureId);
      return false;
    }
  }

  public unloadFeature(featureId: string) {
    const instance = this.instances.get(featureId);
    if (!instance) return;

    for (const t of instance.timers) {
      clearTimeout(t);
    }
    for (const cleanup of instance.eventCleanups) {
      try {
        cleanup();
      } catch (e) {}
    }

    instance.active = false;
    this.instances.delete(featureId);
  }

  public unloadAll() {
    for (const featureId of Array.from(this.instances.keys())) {
      this.unloadFeature(featureId);
    }
  }

  public getLoadedInstances(): SandboxedFeatureInstance[] {
    return Array.from(this.instances.values());
  }
}
