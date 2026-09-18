#!/usr/bin/env node
import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);

// src/scripts/print-config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
var HOSTS = ["json", "claude-code", "cursor", "codex", "gemini", "vscode"];
var USAGE = `Usage: node print-config.js [host] [--bridge-port <port>]

  host                  One of: ${HOSTS.join(", ")}. Omit to print all.
  --bridge-port <port>  Bake a non-default bridge port into the snippets
                        (the AQA extension's bridge port setting must match).
`;
function print(text) {
  process.stdout.write(`${text}
`);
}
function fail(message) {
  process.stderr.write(`[${"UsableNet AQA Browser"}] ${message}

${USAGE}`);
  process.exit(1);
}
function shellQuote(arg) {
  return /^[\w./:@=-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", String.raw`'\''`)}'`;
}
function parseCli() {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      options: {
        "bridge-port": { type: "string" },
        help: { type: "boolean", default: false }
      },
      allowPositionals: true
    }));
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  if (values.help === true) {
    print(USAGE);
    process.exit(0);
  }
  if (positionals.length > 1) fail(`expected at most one host, got: ${positionals.join(" ")}`);
  const host2 = positionals[0] ?? "all";
  if (host2 !== "all" && !HOSTS.includes(host2)) fail(`unknown host "${host2}"`);
  const raw = values["bridge-port"];
  if (raw === void 0) return { host: host2, bridgePort: void 0 };
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    fail(`invalid --bridge-port "${raw}" \u2014 expected a port number (1-65535)`);
  }
  return { host: host2, bridgePort: port };
}
function tomlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}
function buildSnippet(host2, serverArgs2, bridgePort2) {
  const mcpServersJson = JSON.stringify(
    { mcpServers: { ["UsableNet AQA Browser"]: { command: "node", args: serverArgs2 } } },
    null,
    2
  );
  const shellArgs = serverArgs2.map(shellQuote).join(" ");
  switch (host2) {
    case "json":
      return `Generic \`mcpServers\` JSON \u2014 Windsurf, Claude Desktop, and most other MCP clients:

${mcpServersJson}`;
    case "cursor": {
      const workspaceArgs = [...serverArgs2, "--workspace-dir", "${workspaceFolder}"];
      const projectJson = JSON.stringify(
        { mcpServers: { ["UsableNet AQA Browser"]: { command: "node", args: workspaceArgs } } },
        null,
        2
      );
      const deepLinkConfig = Buffer.from(JSON.stringify({ command: "node", args: serverArgs2 })).toString("base64");
      return `Cursor \u2014 RECOMMENDED: per-project registration at <project>/.cursor/mcp.json (Cursor sends no MCP roots, so \`--workspace-dir \${workspaceFolder}\` anchors relative report/flow paths in the project):

${projectJson}

Global alternatives \u2014 ~/.cursor/mcp.json (reports then need absolute outDir paths):

${mcpServersJson}

or the one-click deep link:

https://cursor.com/en/install-mcp?name=${encodeURIComponent("UsableNet AQA Browser")}&config=${deepLinkConfig}

After registering, verify the written entry: \`command\` must be "node" with the path in \`args\` (a mangled entry spawns nothing, and Cursor shows a misleading "Connect/Authenticate" card \u2014 there is no OAuth; Skip it). Cursor also leases servers by CONFIG HASH: after fixing a broken entry, change any byte of the config (or rename the server) so a fresh process is spawned.

Recommended: also install the AQA plugin (skills Cursor loads on demand) by COPYING this whole dist folder to ~/.cursor/plugins/local/${"aqabrowser"} \u2014 real files, NOT a symlink (Cursor rejects symlinks that point outside plugins/local); re-copy after rebuilds. It carries a \`.cursor-plugin/plugin.json\` manifest and the \`skills/\` directory Cursor auto-discovers. Without it the agent gets the raw tools only.`;
    }
    case "claude-code": {
      const distDir2 = path.dirname(serverArgs2[0]);
      return `Claude Code \u2014 prefer installing the full plugin (skills + subagents included). This dist folder doubles as a local marketplace:

/plugin marketplace add ${distDir2}
/plugin install aqa@${"UsableNet"}

Or for development: claude --plugin-dir ${shellQuote(distDir2)}

To register ONLY the MCP server:

claude mcp add ${shellQuote("UsableNet AQA Browser")} --scope user -- node ${shellArgs}`;
    }
    case "codex": {
      const distDir2 = path.dirname(serverArgs2[0]);
      const toml = `[mcp_servers.${tomlKey("UsableNet AQA Browser")}]
command = "node"
args = [${serverArgs2.map((a) => JSON.stringify(a)).join(", ")}]`;
      return `Codex (CLI + ChatGPT desktop app) \u2014 prefer installing the full plugin (skills included). This dist folder doubles as a local Codex marketplace (\`.agents/plugins/marketplace.json\`):

codex plugin marketplace add ${shellQuote(distDir2)}
codex plugin add aqa@${"UsableNet"}

Then start a NEW Codex session \u2014 plugins load at session start. The plugin runs the server on the default bridge port (Codex has no per-plugin settings), so for a non-default port register the server manually instead. Codex negotiates no MCP roots and runs the server from inside the plugin folder, so relative report/flow paths anchor at $HOME (~/reports, ~/.aqa/flows) \u2014 pass absolute paths to place them elsewhere.

To register ONLY the MCP server${bridgePort2 === void 0 ? "" : ` (with --bridge-port ${bridgePort2})`}, add to ~/.codex/config.toml:

${toml}`;
    }
    case "gemini":
      return `Gemini CLI:

gemini mcp add ${shellQuote("UsableNet AQA Browser")} node ${shellArgs}`;
    case "vscode":
      return `VS Code (GitHub Copilot):

code --add-mcp '${JSON.stringify({ name: "UsableNet AQA Browser", command: "node", args: serverArgs2 })}'

Recommended: also install the AQA skills (workflow guidance Copilot loads on demand) by copying this dist's \`skills/\` folders into your project's \`.github/skills/\` directory. The subagent definitions in \`agents/\` can be copied alongside if your VS Code setup supports custom agents. Without them the agent gets the raw tools only.`;
    default:
      return fail(`unknown host "${String(host2)}"`);
  }
}
var { host, bridgePort } = parseCli();
var distDir = path.dirname(fileURLToPath(import.meta.url));
var serverPath = path.join(distDir, "mcp-server.js");
var serverArgs = [
  serverPath,
  ...bridgePort === void 0 ? [] : ["--bridge-port", String(bridgePort)]
];
print(`${"UsableNet AQA Browser"} v${"0.3.1"} \u2014 ${serverPath}`);
var selected = host === "all" ? HOSTS : [host];
for (const h of selected) {
  print(`
\u2500\u2500\u2500 ${h} ${"\u2500".repeat(Math.max(0, 60 - h.length))}`);
  print(`
${buildSnippet(h, serverArgs, bridgePort)}`);
}
print(
  `
\u2500\u2500\u2500 first run ${"\u2500".repeat(51)}

On boot the server prints a pairing code to stderr (also visible via the aqa_setup_bridge tool). Paste it into the AQA extension \u2192 Settings \u2192 Connection to authorize the bridge${bridgePort === void 0 ? "" : `, and set the extension's bridge port to ${bridgePort}`}.`
);
//# sourceMappingURL=print-config.js.map
