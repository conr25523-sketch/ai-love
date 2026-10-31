$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$moonmindNode = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (!$moonmindNode) {
    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'OpenAI/Codex/runtimes/cua_node'
    if (Test-Path -LiteralPath $runtimeRoot) {
        $moonmindNode = Get-ChildItem -LiteralPath $runtimeRoot -Directory |
            Sort-Object LastWriteTime -Descending |
            ForEach-Object { Join-Path $_.FullName 'bin/node.exe' } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
    }
}
if (!$moonmindNode) { throw 'Install Node.js >=24 to run this project.' }
if (!(Test-Path -LiteralPath './node_modules/vite/bin/vite.js')) { throw 'Dependencies are missing. Run npm ci before starting.' }
Write-Host 'Starting MOONMIND on loopback. Use the Local URL printed below. Ctrl+C stops the server.'
& $moonmindNode './scripts/local.mjs'
exit $LASTEXITCODE
