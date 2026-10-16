Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "."

function New-Bmp([int]$w, [int]$h) {
  return New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
}

function Fill-Grad($g, [System.Drawing.Rectangle]$r, $c1, $c2, [double]$angle) {
  $b = New-Object System.Drawing.Drawing2D.LinearGradientBrush($r, $c1, $c2, $angle)
  $g.FillRectangle($b, $r)
  $b.Dispose()
}

function Draw-Grid($g, [int]$w, [int]$h, [int]$step, [int]$alpha) {
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255), 1)
  for ($x = 0; $x -lt $w; $x += $step) { $g.DrawLine($pen, $x, 0, $x, $h) }
  for ($y = 0; $y -lt $h; $y += $step) { $g.DrawLine($pen, 0, $y, $w, $y) }
  $pen.Dispose()
}

# ------------------------------- Header (150 x 57) -------------------------------
function Make-Header([string]$path) {
  $w = 150; $h = 57
  $bmp = New-Bmp $w $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  Fill-Grad $g $rect ([System.Drawing.Color]::FromArgb(255, 15, 18, 25)) ([System.Drawing.Color]::FromArgb(255, 22, 27, 38)) 90
  Draw-Grid $g $w $h 12 8
  # accent strip at bottom
  $acc = [System.Drawing.Rectangle]::new(0, $h - 4, $w, 4)
  Fill-Grad $g $acc ([System.Drawing.Color]::FromArgb(255, 255, 77, 46)) ([System.Drawing.Color]::FromArgb(255, 255, 138, 61)) 0
  # wordmark
  $f1 = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
  $f2 = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 238, 241, 247))
  $orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 122, 47))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Near
  $g.DrawString("AS", $f1, $white, 10, 10, $sf) | Out-Null
  $wAS = $g.MeasureString("AS", $f1).Width
  $g.DrawString(" x11", $f2, $orange, 10 + $wAS - 4, 10, $sf) | Out-Null
  # cyan dot
  $cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 53, 208, 255))
  $g.FillEllipse($cyan, 12, 38, 5, 5)
  $f3 = New-Object System.Drawing.Font("Segoe UI", 6.5, [System.Drawing.FontStyle]::Regular)
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 139, 147, 167))
  $g.DrawString("CONFIGURADOR", $f3, $muted, 21, 36) | Out-Null
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $bmp.Dispose()
  $f1.Dispose(); $f2.Dispose(); $f3.Dispose(); $white.Dispose(); $orange.Dispose(); $cyan.Dispose(); $muted.Dispose()
}

# ------------------------------- Sidebar (164 x 314) -------------------------------
function Make-Sidebar([string]$path) {
  $w = 164; $h = 314
  $bmp = New-Bmp $w $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  Fill-Grad $g $rect ([System.Drawing.Color]::FromArgb(255, 9, 11, 16)) ([System.Drawing.Color]::FromArgb(255, 20, 25, 35)) 90
  Draw-Grid $g $w $h 16 10
  # glow circle top
  $glow = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glow.AddEllipse(-60, -120, 220, 220)
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
  $pgb.CenterColor = [System.Drawing.Color]::FromArgb(70, 255, 77, 46)
  $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 77, 46))
  $g.FillPath($pgb, $glow)
  $pgb.Dispose(); $glow.Dispose()

  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 238, 241, 247))
  $orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 122, 47))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 139, 147, 167))
  $fBig = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
  $fSmall = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)
  $fTag = New-Object System.Drawing.Font("Segoe UI", 7.5, [System.Drawing.FontStyle]::Bold)

  $g.DrawString("AS", $fBig, $white, 14, 116) | Out-Null
  $wAS = $g.MeasureString("AS", $fBig).Width
  $g.DrawString("x11", $fBig, $orange, 14 + $wAS - 2, 116) | Out-Null
  # accent underline
  $acc = New-Object System.Drawing.Rectangle(16, 158, 70, 4)
  Fill-Grad $g $acc ([System.Drawing.Color]::FromArgb(255, 255, 77, 46)) ([System.Drawing.Color]::FromArgb(255, 255, 138, 61)) 0

  $cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 53, 208, 255))
  $g.FillEllipse($cyan, 16, 176, 6, 6) | Out-Null
  $g.DrawString("CONFIGURADOR", $fTag, $white, 27, 173) | Out-Null

  $wrap = New-Object System.Drawing.RectangleF(16, 200, 132, 100)
  $g.DrawString("Attack Shark X11`r`nDPI - Iluminacion - Botones`r`nPerfiles - Bateria - Macros`r`nSincronizacion en la nube", $fSmall, $muted, $wrap) | Out-Null

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $bmp.Dispose()
  $white.Dispose(); $orange.Dispose(); $muted.Dispose(); $cyan.Dispose()
  $fBig.Dispose(); $fSmall.Dispose(); $fTag.Dispose()
}

Make-Header  (Join-Path $outDir "header.bmp")
Make-Header  (Join-Path $outDir "unheader.bmp")
Make-Sidebar (Join-Path $outDir "sidebar.bmp")
Write-Output "Imagenes generadas."
