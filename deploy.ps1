# KAIRU Pages — one-command redeploy.
# Copies the latest live build from the main project into this public folder,
# then commits + pushes so GitHub Pages updates. Run this whenever you change
# KAIRU v2.5.html / assets and want the phone version refreshed.
#
#   Right-click > Run with PowerShell   (or:  powershell -File deploy.ps1)

$ErrorActionPreference = "Stop"
$src = "C:\Users\Mark\OneDrive\Desktop\KAIRU"
$dst = $PSScriptRoot

Copy-Item "$src\KAIRU v2.5.html"     "$dst\index.html"          -Force
Copy-Item "$src\kairu-logo.png"      "$dst\kairu-logo.png"      -Force
Copy-Item "$src\assets\kairu-app.js" "$dst\assets\kairu-app.js" -Force
Copy-Item "$src\assets\kairu.css"    "$dst\assets\kairu.css"    -Force

git -C $dst add -A
# Only commit if something actually changed
if (git -C $dst status --porcelain) {
  git -C $dst commit -m "Deploy: sync live KAIRU v2.5 build"
  git -C $dst push
  Write-Host "`nDeployed. Give GitHub Pages ~1 minute, then refresh on your phone." -ForegroundColor Green
} else {
  Write-Host "`nNothing changed since last deploy." -ForegroundColor Yellow
}
