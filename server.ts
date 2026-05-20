import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Convert body parser JSON syntax errors into JSON responses.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, message: 'Invalid JSON body', error: err.message });
    }
    next(err);
  });

  // Solver API - run Python backend and capture JSON output
  let currentProcess: ChildProcessWithoutNullStreams | null = null;

  const isSolverActive = (proc: ChildProcessWithoutNullStreams | null) => {
    return proc !== null && proc.exitCode === null && proc.signalCode === null;
  };

  app.get('/api/solve/status', (req, res) => {
    return res.json({
      success: true,
      active: !!currentProcess && isSolverActive(currentProcess),
      hasProcess: !!currentProcess,
      pid: currentProcess?.pid ?? null,
      exitCode: currentProcess?.exitCode ?? null,
      signalCode: currentProcess?.signalCode ?? null,
    });
  });

  app.post('/api/solve', (req, res) => {
    console.log('[api/solve] incoming request', { body: req.body, currentProcess: currentProcess ? { pid: currentProcess.pid, exitCode: currentProcess.exitCode, signalCode: currentProcess.signalCode, killed: currentProcess.killed } : null });

    if (currentProcess && isSolverActive(currentProcess)) {
      return res.status(409).json({ success: false, message: 'Solver already running' });
    }
    if (currentProcess && !isSolverActive(currentProcess)) {
      console.log('[api/solve] stale solver process detected, clearing currentProcess');
      currentProcess = null;
    }

    try {
      const repoRoot = path.join(process.cwd(), '..', 'exam-scheduling-engine-main-NSGA2', 'exam-scheduling-engine-main');
      const pythonExe = process.env.PYTHON_PATH || 'python';
      const scriptPath = path.join(repoRoot, 'main.py');
      const cwd = repoRoot;
      const config = req.body?.config || {};

      // Run the solver without creating Excel output during API solve.
      const args: string[] = [
        scriptPath,
        '--skip-export',
        '--json-summary',
      ];

      console.log(`Starting NSGA2 Python solver with: ${pythonExe}`);
      console.log(`Solver script: ${scriptPath}`);
      console.log(`Working directory: ${cwd}`);
      console.log(`Solver args: ${args.join(' ')}`);
      const proc = spawn(pythonExe, args, {
        cwd,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
          PYTHONUNBUFFERED: '1',
        },
      });
      currentProcess = proc;

      let stdoutBuf = '';
      let stderrBuf = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString();
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString();
        console.error('[python stderr]', chunk.toString());
      });

      proc.on('error', (err: any) => {
        currentProcess = null;
        console.error('Python process error:', err);
        res.status(500).json({ success: false, message: String(err) });
      });

      const parseSolverJson = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return null;

        // Try direct JSON first.
        try {
          return JSON.parse(trimmed);
        } catch (_) {
          // Fallback: extract the last JSON object from the combined stdout.
          const lastOpen = trimmed.lastIndexOf('{');
          const lastClose = trimmed.lastIndexOf('}');
          if (lastOpen >= 0 && lastClose > lastOpen) {
            const candidate = trimmed.slice(lastOpen, lastClose + 1);
            try {
              return JSON.parse(candidate);
            } catch (__) {
              return null;
            }
          }
          return null;
        }
      };

      proc.on('close', (code: number) => {
        currentProcess = null;
        if (code === 0) {
          const parsed: any = parseSolverJson(stdoutBuf);

          if (parsed?.success) {
            return res.json(parsed);
          }

          return res.json({
            success: true,
            message: 'Python NSGA-II solver finished successfully.',
            algorithm: 'NSGA-II',
            assignments: parsed?.assignments ?? [],
            metrics: parsed?.metrics ?? {},
            rawOutput: stdoutBuf,
          });
        }
        return res.status(500).json({ success: false, message: `Python solver exited with code ${code}`, raw: stdoutBuf, stderr: stderrBuf });
      });
    } catch (err: any) {
      currentProcess = null;
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/solve/stop', async (req, res) => {
    if (!currentProcess) return res.json({ success: false, message: 'No solver running' });
    try {
      currentProcess.kill();
      currentProcess = null;
      return res.json({ success: true, message: 'Solver stopped' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Export Excel - run backend exporter and return generated file
  app.post('/api/export', async (req, res) => {
    try {
      const repoRoot = path.join(process.cwd(), '..', 'exam-scheduling-engine-main-NSGA2', 'exam-scheduling-engine-main');
      const pythonExe = process.env.PYTHON_PATH || 'python';
      const scriptPath = path.join(repoRoot, 'main.py');
      const cwd = repoRoot;

      // Run the exporter by calling main without --json so it writes outputs/Ket_Qua_Xep_Lich.xlsx
      const args = [scriptPath];
      console.log(`Running NSGA2 exporter: ${pythonExe} ${args.join(' ')}`);
      const proc = spawn(pythonExe, args, { cwd, env: { ...process.env, PYTHONUTF8: '1', PYTHONUNBUFFERED: '1' } });

      let stderr = '';
      proc.stderr.on('data', (c: Buffer) => {
        stderr += c.toString();
        console.error('[exporter stderr]', c.toString());
      });

      proc.on('close', (code: number) => {
        const outFile = path.join(repoRoot, 'outputs', 'Ket_Qua_Xep_Lich.xlsx');
        if (fs.existsSync(outFile)) {
          return res.download(outFile, 'Ket_Qua_Xep_Lich.xlsx');
        }
        return res.status(500).json({ success: false, message: `Export failed (code ${code})`, stderr });
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
