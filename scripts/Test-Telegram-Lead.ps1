param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$oldToken=$env:TELEGRAM_BOT_TOKEN
$oldChat=$env:TELEGRAM_CHAT_ID
$oldPhp=$env:PHP_BIN
$oldPhpArgs=$env:PHP_TEST_ARGS
$oldNode=$env:NODE_BIN
$secret=$null
$pointer=[IntPtr]::Zero
try {
    # Resolve and verify the runtime before asking for credentials.
    if([string]::IsNullOrWhiteSpace($env:PHP_BIN)) {
        $installed=Get-Command php -ErrorAction SilentlyContinue
        $portable=Join-Path (Split-Path -Parent $taskRoot) 'php-test-runtime/php.exe'
        if($installed) { $env:PHP_BIN=$installed.Source }
        elseif(Test-Path -LiteralPath $portable) { $env:PHP_BIN=$portable }
        else { throw 'PHP was not found. Set PHP_BIN to php.exe. No credentials requested or message sent.' }
    }
    if([string]::IsNullOrWhiteSpace($env:NODE_BIN)) {
        $installedNode=Get-Command node -ErrorAction SilentlyContinue
        $cachedNode=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
        $standardNode=Join-Path $env:ProgramFiles 'nodejs/node.exe'
        if($installedNode) { $env:NODE_BIN=$installedNode.Source }
        elseif(Test-Path -LiteralPath $cachedNode) { $env:NODE_BIN=$cachedNode }
        elseif(Test-Path -LiteralPath $standardNode) { $env:NODE_BIN=$standardNode }
        else { throw 'Node.js was not found. Set NODE_BIN to node.exe. No credentials requested or message sent.' }
    }
    & $env:NODE_BIN --version
    if($LASTEXITCODE -ne 0) { throw 'Node.js could not start. No message sent.' }
    $phpArgs=@()
    if($env:PHP_TEST_ARGS) { $phpArgs=@(ConvertFrom-Json $env:PHP_TEST_ARGS) }
    else {
        $phpDir=Split-Path -Parent $env:PHP_BIN
        $curlDll=Join-Path $phpDir 'ext/php_curl.dll'
        $runtime=(& $env:PHP_BIN (Join-Path $PSScriptRoot 'telegram-runtime-check.php') -Inspect | ConvertFrom-Json)
        if($LASTEXITCODE -ne 0) { throw 'PHP could not start. No message sent.' }
        if(-not $runtime.curl -and (Test-Path -LiteralPath $curlDll)) {
            $phpArgs+=@('-d',('extension_dir='+(Join-Path $phpDir 'ext').Replace('\','/')),'-d','extension=php_curl.dll')
        }
        # Portable OpenSSL builds need a CA bundle. Use public Windows trust roots;
        # never disable TLS verification or copy any private certificate keys.
        $runtime=(& $env:PHP_BIN @phpArgs (Join-Path $PSScriptRoot 'telegram-runtime-check.php') -Inspect | ConvertFrom-Json)
        $ca=$runtime.ca
        if([string]::IsNullOrWhiteSpace($ca) -and $env:OS -eq 'Windows_NT') {
            $scratch=Join-Path $taskRoot 'work'
            New-Item -ItemType Directory -Force -Path $scratch > $null
            $ca=Join-Path $scratch 'telegram-windows-trust.pem'
            $pem=New-Object System.Text.StringBuilder
            foreach($cert in (Get-ChildItem Cert:\CurrentUser\Root,Cert:\LocalMachine\Root)) {
                [void]$pem.AppendLine('-----BEGIN CERTIFICATE-----')
                [void]$pem.AppendLine([Convert]::ToBase64String($cert.RawData,[Base64FormattingOptions]::InsertLineBreaks))
                [void]$pem.AppendLine('-----END CERTIFICATE-----')
            }
            [IO.File]::WriteAllText($ca,$pem.ToString(),[Text.Encoding]::ASCII)
            $phpArgs+=@('-d',('curl.cainfo='+$ca.Replace('\','/')))
        }
        $env:PHP_TEST_ARGS=ConvertTo-Json -Compress -InputObject @($phpArgs)
    }
    & $env:PHP_BIN @phpArgs (Join-Path $PSScriptRoot 'telegram-runtime-check.php')
    if($LASTEXITCODE -ne 0) { throw 'PHP/cURL preflight failed. No message sent.' }
    if($CheckOnly) { Write-Output 'Preflight passed. No token requested; no Telegram request sent.'; return }
    if([string]::IsNullOrWhiteSpace($env:TELEGRAM_BOT_TOKEN)) {
        $secret=Read-Host 'TELEGRAM_BOT_TOKEN (hidden, not saved)' -AsSecureString
        $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
        $env:TELEGRAM_BOT_TOKEN=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    if([string]::IsNullOrWhiteSpace($env:TELEGRAM_CHAT_ID)) {
        & $env:PHP_BIN @phpArgs (Join-Path $PSScriptRoot 'telegram-chat-id.php')
        if($LASTEXITCODE -ne 0) { throw 'Start the bot in Telegram and obtain chat_id first. No test sent.' }
        $env:TELEGRAM_CHAT_ID=Read-Host 'TELEGRAM_CHAT_ID (copy the numeric ID above)'
    }
    Push-Location $taskRoot
    try {
        & $env:NODE_BIN (Join-Path $PSScriptRoot 'live-lead-test.mjs')
        if($LASTEXITCODE -ne 0) { throw 'The test did not confirm delivery. See the message above. No automatic retry.' }
    } finally { Pop-Location }
} finally {
    $env:TELEGRAM_BOT_TOKEN=$oldToken
    $env:TELEGRAM_CHAT_ID=$oldChat
    $env:PHP_BIN=$oldPhp
    $env:PHP_TEST_ARGS=$oldPhpArgs
    $env:NODE_BIN=$oldNode
    if($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if($null -ne $secret) { $secret.Dispose() }
}
