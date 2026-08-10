Write-Host "Starting Node.js backend..."
$backendPath = "o:\tout\ammarli_prototype\hay\ammerli\apps\backend"
# Kill any existing node running on port 3000 to avoid conflicts
$pids = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($pids) { Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue }

$backend = Start-Process -FilePath "node" -ArgumentList "dist/main.js" -WorkingDirectory $backendPath -PassThru -NoNewWindow
Start-Sleep -Seconds 10
Write-Host "Backend started with PID: $($backend.Id)"

$monitorJob = Start-Job -ScriptBlock {
    param($pidToWatch)
    $maxMem = 0
    $maxCpu = 0
    while (Get-Process -Id $pidToWatch -ErrorAction SilentlyContinue) {
        $proc = Get-Process -Id $pidToWatch
        if ($proc.WorkingSet -gt $maxMem) { $maxMem = $proc.WorkingSet }
        
        $perf = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfProc_Process -Filter "IDProcess = $pidToWatch" -ErrorAction SilentlyContinue
        if ($perf -and $perf.PercentProcessorTime -gt $maxCpu) {
            $maxCpu = $perf.PercentProcessorTime
        }
        
        Start-Sleep -Seconds 2
    }
    return @{ MaxMem = $maxMem; MaxCpu = $maxCpu }
} -ArgumentList $backend.Id

Write-Host "Running Artillery load test..."
$artilleryLog = "artillery-output.txt"
# Use cmd /c to run npx to avoid powershell interpreting stderr as errors
cmd /c "npx --yes artillery run load-test.yml > $artilleryLog 2>&1"

Write-Host "Load test finished. Stopping backend..."
Stop-Process -Id $backend.Id -Force

$stats = Receive-Job -Job $monitorJob -Wait -AutoRemoveJob
$maxMemMB = [math]::Round($stats.MaxMem / 1MB, 2)
$maxCpuPct = $stats.MaxCpu

Write-Host "--- PERFORMANCE METRICS ---"
Write-Host "Peak Memory Usage: $maxMemMB MB"
Write-Host "Peak CPU Usage: $maxCpuPct %"
Write-Host "--- ARTILLERY SUMMARY ---"
Get-Content $artilleryLog -Tail 30
