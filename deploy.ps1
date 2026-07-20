# KAIRU Pages — one-command redeploy.
# Copies the latest live build from the main project into this public folder,
# then commits + pushes so Vercel redeploys. Run this whenever you change
# KAIRU v2.5.html / assets and want the phone version refreshed.
#
#   Right-click > Run with PowerShell   (or:  powershell -File deploy.ps1)

$ErrorActionPreference = "Stop"
# Source moved out of OneDrive (2026-06-23) to stop OneDrive dehydrating .git.
$src = "C:\dev\KAIRU"
$dst = $PSScriptRoot

# Pre-deploy gate: refuse to ship code that hasn't been pushed to
# Kairu-source yet. Closes the gap where a phone build could go live
# with no corresponding commit on origin/main to review.
git -C $src fetch origin
$localHead = (git -C $src rev-parse HEAD).Trim()
$remoteHead = (git -C $src rev-parse origin/main).Trim()
if ($localHead -ne $remoteHead) {
  Write-Host "BLOCKED: Not pushed to Kairu-source yet. Push first, then deploy." -ForegroundColor Red
  exit 1
}

Copy-Item "$src\KAIRU v2.5.html"     "$dst\index.html"          -Force
Copy-Item "$src\kairu-logo.png"      "$dst\kairu-logo.png"      -Force
Copy-Item "$src\assets\kairu-app.js" "$dst\assets\kairu-app.js" -Force
Copy-Item "$src\assets\kairu.css"    "$dst\assets\kairu.css"    -Force
New-Item -ItemType Directory -Force -Path "$dst\data\skill-graph" | Out-Null
Copy-Item "$src\data\skill-graph\skill_render_manifest.json" "$dst\data\skill-graph\skill_render_manifest.json" -Force
Copy-Item "$src\data\skill-graph\skill_nodes.json" "$dst\data\skill-graph\skill_nodes.json" -Force
Copy-Item "$src\data\skill-graph\skill_edges.json" "$dst\data\skill-graph\skill_edges.json" -Force

# Stamp which Kairu-source commit this build came from, so a weird phone
# bug can be traced back to an exact commit instead of guessing.
$srcSha = (git -C $src rev-parse --short HEAD).Trim()
$srcDirty = git -C $src status --porcelain
if ($srcDirty) {
  Write-Host "WARNING: C:\dev\KAIRU has uncommitted changes -- deploying a build that isn't fully committed to Kairu-source." -ForegroundColor Yellow
  $srcSha = "$srcSha-dirty"
}
$stamp = "<!-- source: $srcSha @ $(Get-Date -Format 'yyyy-MM-dd HH:mm') -->"
$indexContent = Get-Content "$dst\index.html" -Raw
$indexContent = $indexContent -replace '(?m)^<!DOCTYPE html>', "<!DOCTYPE html>`n$stamp"
Set-Content "$dst\index.html" $indexContent -NoNewline

git -C $dst add -A
# Only commit if something actually changed
if (git -C $dst status --porcelain) {
  git -C $dst commit -m "Deploy: sync live KAIRU v2.5 build (source: $srcSha)"
  git -C $dst push
  Write-Host "`nDeployed. Give Vercel ~1 minute to rebuild, then refresh on your phone." -ForegroundColor Green
} else {
  Write-Host "`nNothing changed since last deploy." -ForegroundColor Yellow
}
