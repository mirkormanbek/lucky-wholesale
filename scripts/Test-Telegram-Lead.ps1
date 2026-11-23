$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$oldToken=$env:TELEGRAM_BOT_TOKEN
$oldChat=$env:TELEGRAM_CHAT_ID
$secret=$null
$pointer=[IntPtr]::Zero
try {
    if([string]::IsNullOrWhiteSpace($env:TELEGRAM_BOT_TOKEN)) {
        $secret=Read-Host 'TELEGRAM_BOT_TOKEN (hidden, not saved)' -AsSecureString
        $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
        $env:TELEGRAM_BOT_TOKEN=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    if([string]::IsNullOrWhiteSpace($env:PHP_BIN)) { $env:PHP_BIN='php' }
    $phpArgs=@()
    if($env:PHP_TEST_ARGS) { $phpArgs=@(ConvertFrom-Json $env:PHP_TEST_ARGS) }
    if([string]::IsNullOrWhiteSpace($env:TELEGRAM_CHAT_ID)) {
        & $env:PHP_BIN @phpArgs (Join-Path $PSScriptRoot 'telegram-chat-id.php')
        if($LASTEXITCODE -ne 0) { throw 'Start the bot in Telegram and obtain chat_id first. No test sent.' }
        $env:TELEGRAM_CHAT_ID=Read-Host 'TELEGRAM_CHAT_ID (copy the numeric ID above)'
    }
    Push-Location $taskRoot
    try { & node (Join-Path $PSScriptRoot 'live-lead-test.mjs') } finally { Pop-Location }
} finally {
    $env:TELEGRAM_BOT_TOKEN=$oldToken
    $env:TELEGRAM_CHAT_ID=$oldChat
    if($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if($null -ne $secret) { $secret.Dispose() }
}
