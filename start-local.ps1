$root = (Get-Location).Path
$prefix = 'http://127.0.0.1:8765/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try { $listener.Start() } catch { Write-Host 'Could not start local server. Port 8765 may already be in use.'; Read-Host 'Press Enter to exit'; exit 1 }
Start-Process ($prefix + 'index.html')
Write-Host "My Budget local server: $prefix"
Write-Host 'Keep this window open while testing. Press Ctrl+C to stop.'
$mime = @{'html'='text/html';'js'='application/javascript';'css'='text/css';'json'='application/json';'png'='image/png';'jpg'='image/jpeg';'svg'='image/svg+xml';'ico'='image/x-icon';'webmanifest'='application/manifest+json'}
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $path))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404; $ctx.Response.Close(); continue
    }
    $bytes = [IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full).TrimStart('.').ToLower()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
    $ctx.Response.OutputStream.Close()
  } catch { }
}
